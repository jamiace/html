/**
 * @OnlyCurrentDoc
 *
 * Crimson Survivor 線上成績＋Top 50 排行榜
 *
 * 排行規則：
 * 1. 總分較高
 * 2. 同分時，通關時間較短
 * 3. 再同分時，擊殺數較多
 * 4. 再同分時，等級較低
 * 5. 最後以較早送達伺服器者優先
 *
 * 分數公式：
 * 結算等級 × 100
 * - 100（讓 Lv.1 的等級分數為 0）
 * + 擊敗 Boss 時剩餘完整秒數 × 30
 * + 本局分數調整（目前只接受 0 或負數，例如購買復活 -1000）
 *
 * Google Sheets 只保留排名最高的 10000 筆成績。
 *
 * 安裝：
 * 1. 從目標 Google 試算表的「擴充功能 → Apps Script」建立專案。
 * 2. 將本檔完整貼入 Code.gs。
 * 3. 儲存，手動執行 setupScoreSheet() 一次並授權。
 * 4. 部署為「網頁應用程式」：
 *    - 執行身分：我
 *    - 誰可以存取：任何人
 * 5. 更新本程式後：
 *    「部署 → 管理部署作業 → 編輯 → 建立新版本 → 部署」
 */

const SHEET_NAME = 'Scores';
const MAX_NAME_LENGTH = 20;
const MAX_WEAPONS_LENGTH = 1000;
const MAX_WEAPON_LEVELS_JSON_LENGTH = 4000;
const DUPLICATE_CACHE_SECONDS = 21600;
const MAX_STORED_SCORES = 10000;
const DEFAULT_LEADERBOARD_LIMIT = 50;
const MAX_LEADERBOARD_LIMIT = 50;

const SCORE_BOSS_START_SECONDS = 900;
const SCORE_BOSS_FIGHT_LIMIT_SECONDS = 180;
const SCORE_LEVEL_POINTS_PER_LEVEL = 100;
const SCORE_BASE_ADJUSTMENT = -100;
const SCORE_BOSS_REMAINING_POINTS_PER_SECOND = 30;
const SCORE_MIN_RUN_ADJUSTMENT = -100000;
const SCORE_MAX_RUN_ADJUSTMENT = 0;
const SCORE_SCHEMA_VERSION = 'R26_SCORE_V3_EXP';
const SCORE_SCHEMA_PROPERTY = 'CRIMSON_SURVIVOR_SCORE_SCHEMA';

const COL = Object.freeze({
  SERVER_TIME: 1,
  PLAYER_NAME: 2,
  RESULT: 3,
  ELAPSED_SECONDS: 4,
  ELAPSED_TEXT: 5,
  LEVEL: 6,
  KILLS: 7,
  HP: 8,
  MAX_HP: 9,
  WEAPON_COUNT: 10,
  WEAPONS: 11,
  BUILD: 12,
  CONFIG_VERSION: 13,
  GAME_ID: 14,
  RUN_ID: 15,
  CLIENT_TIME: 16,
  USER_AGENT: 17,
  TOTAL_EXP: 18,
  BOSS_REMAINING_SECONDS: 19,
  BOSS_TIME_BONUS: 20,
  LEVEL_POINTS: 21,
  SCORE_ADJUSTMENT: 22,
  SCORE: 23
});

const HEADERS = [
  '伺服器時間',
  '玩家名稱',
  '結果',
  '通關時間（秒）',
  '通關時間',
  '等級',
  '擊殺數',
  '剩餘 HP',
  '最大 HP',
  '武器數',
  '武器與等級',
  '遊戲版本',
  '設定版本',
  'Game ID',
  'Run ID',
  '客戶端時間',
  'User Agent',
  '總 EXP',
  'Boss 剩餘（秒）',
  'Boss 時間獎勵',
  '等級分數',
  '本局分數調整',
  '總分'
];

function setupScoreSheet() {
  const sheet = getOrCreateScoreSheet_();

  styleHeader_(sheet);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);

  sheet.getRange('A:A').setNumberFormat('yyyy/MM/dd HH:mm');
  sheet.getRange('D:D').setNumberFormat('0.000');
  sheet.getRange('E:E').setNumberFormat('@');
  sheet.getRange('R:W').setNumberFormat('0');

  recalculateStoredScores_(sheet, true);
  sortAndPruneTopScores_(sheet);

  getBoundSpreadsheet_().toast(
    'Top 50 排行榜與 Top 10000 成績表設定完成',
    'Crimson Survivor',
    5
  );
}

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = cleanText_(params.action, 30) || 'status';
    let payload;

    if (action === 'leaderboard') {
      const gameId =
        cleanText_(params.gameId, 80) ||
        'crimson-survivor';

      const runId = cleanText_(params.runId, 100);

      const limit = boundedInteger_(
        params.limit,
        1,
        MAX_LEADERBOARD_LIMIT,
        DEFAULT_LEADERBOARD_LIMIT
      );

      payload = buildLeaderboard_(gameId, limit, runId);
    } else {
      const spreadsheet = getBoundSpreadsheet_();

      payload = {
        ok: true,
        service: 'Crimson Survivor Score Receiver',
        spreadsheet: spreadsheet.getName(),
        sheet: SHEET_NAME,
        leaderboardLimit: DEFAULT_LEADERBOARD_LIMIT,
        storedScoreLimit: MAX_STORED_SCORES,
        rankingRule: rankingRuleText_(),
        now: new Date().toISOString()
      };
    }

    return webOutput_(payload, params.callback);
  } catch (error) {
    return webOutput_(
      {
        ok: false,
        error: errorMessage_(error)
      },
      e && e.parameter
        ? e.parameter.callback
        : ''
    );
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let hasLock = false;

  try {
    lock.waitLock(10000);
    hasLock = true;

    const data =
      e && e.parameter
        ? e.parameter
        : {};

    const score = validateScore_(data);
    const cache = CacheService.getScriptCache();
    const runCacheKey = `run:${score.runId}`;

    if (cache.get(runCacheKey)) {
      return jsonOutput_({
        ok: true,
        duplicate: true,
        runId: score.runId
      });
    }

    const sheet = getOrCreateScoreSheet_();

    if (isDuplicateRunId_(sheet, score.runId)) {
      cache.put(
        runCacheKey,
        '1',
        DUPLICATE_CACHE_SECONDS
      );

      return jsonOutput_({
        ok: true,
        duplicate: true,
        runId: score.runId
      });
    }

    sheet.appendRow([
      new Date(),
      safeCell_(score.playerName),
      score.result,
      score.elapsedSeconds,
      safeCell_(score.elapsedText),
      score.level,
      score.kills,
      score.hp,
      score.maxHp,
      score.weaponCount,
      safeCell_(score.weapons),
      safeCell_(score.build),
      safeCell_(score.configVersion),
      safeCell_(score.gameId),
      safeCell_(score.runId),
      safeCell_(score.clientTimestamp),
      safeCell_(score.userAgent),
      score.totalExp,
      score.bossRemainingSeconds,
      score.bossTimeBonus,
      score.levelPoints,
      score.scoreAdjustment,
      score.score
    ]);

    const appendedRow = sheet.getLastRow();

    sheet
      .getRange(appendedRow, COL.SERVER_TIME)
      .setNumberFormat('yyyy/MM/dd HH:mm');

    sheet
      .getRange(appendedRow, COL.ELAPSED_SECONDS)
      .setNumberFormat('0.000');

    sheet
      .getRange(appendedRow, COL.ELAPSED_TEXT)
      .setNumberFormat('@')
      .setValue(score.elapsedText);

    sheet
      .getRange(appendedRow, COL.TOTAL_EXP, 1, 6)
      .setNumberFormat('0');

    sortAndPruneTopScores_(sheet);

    cache.put(
      runCacheKey,
      '1',
      DUPLICATE_CACHE_SECONDS
    );

    const storedRow = findRunRow_(sheet, score.runId);

    return jsonOutput_({
      ok: true,
      duplicate: false,
      stored: storedRow > 0,
      row: storedRow,
      runId: score.runId,
      score: score.score
    });
  } catch (error) {
    console.error(error);

    return jsonOutput_({
      ok: false,
      error: errorMessage_(error)
    });
  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (_) {}
    }
  }
}

function buildLeaderboard_(gameId, limit, runId) {
  const sheet = getOrCreateScoreSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return emptyLeaderboard_(gameId, limit);
  }

  const values = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      HEADERS.length
    )
    .getValues();

  const scores = [];

  values.forEach((row, index) => {
    const result = String(row[COL.RESULT - 1] || '');
    const rowGameId = String(row[COL.GAME_ID - 1] || '');
    const elapsedSeconds = Number(row[COL.ELAPSED_SECONDS - 1]);
    const rawTotalExp = row[COL.TOTAL_EXP - 1];
    const totalExp = Number(rawTotalExp);
    const level = Number(row[COL.LEVEL - 1]);
    const kills = Number(row[COL.KILLS - 1]);
    const scoreAdjustment = normalizeStoredScoreAdjustment_(
      row[COL.SCORE_ADJUSTMENT - 1]
    );

    if (
      result !== 'victory' ||
      rowGameId !== gameId ||
      rawTotalExp === '' ||
      rawTotalExp == null ||
      !Number.isFinite(elapsedSeconds) ||
      !Number.isFinite(totalExp) ||
      !Number.isFinite(level) ||
      !Number.isFinite(kills)
    ) {
      return;
    }

    const computed = calculateScore_(
      totalExp,
      elapsedSeconds,
      level,
      scoreAdjustment
    );

    const serverDate =
      row[COL.SERVER_TIME - 1] instanceof Date
        ? row[COL.SERVER_TIME - 1]
        : new Date(row[COL.SERVER_TIME - 1]);

    const hasServerDate =
      Number.isFinite(serverDate.getTime());

    scores.push({
      sheetRow: index + 2,
      serverTime:
        hasServerDate
          ? serverDate.getTime()
          : 0,
      playerName:
        String(row[COL.PLAYER_NAME - 1] || '匿名'),
      elapsedSeconds,
      elapsedText:
        formatDuration_(elapsedSeconds),
      totalExp: computed.totalExp,
      bossElapsedSeconds: computed.bossElapsedSeconds,
      bossRemainingSeconds: computed.bossRemainingSeconds,
      bossRemainingText:
        formatDuration_(computed.bossRemainingSeconds),
      bossTimeBonus: computed.bossTimeBonus,
      levelPoints: computed.levelPoints,
      baseScoreAdjustment: computed.baseScoreAdjustment,
      scoreAdjustment: computed.scoreAdjustment,
      score: computed.score,
      level: Math.floor(level),
      kills: Math.floor(kills),
      weapons:
        String(row[COL.WEAPONS - 1] || ''),
      build:
        String(row[COL.BUILD - 1] || ''),
      runId:
        String(row[COL.RUN_ID - 1] || '')
    });
  });

  scores.sort(compareScores_);

  scores.forEach((score, index) => {
    score.rank = index + 1;
  });

  const entries = scores
    .slice(0, limit)
    .map(publicScore_);

  const ownScore = runId
    ? scores.find(score => score.runId === runId)
    : null;

  const own = ownScore
    ? Object.assign(
        publicScore_(ownScore),
        {
          inTop: ownScore.rank <= limit
        }
      )
    : null;

  return {
    ok: true,
    gameId,
    limit,
    total: scores.length,
    storedLimit: MAX_STORED_SCORES,
    entries,
    own,
    rankingRule: rankingRuleText_()
  };
}

function compareScores_(a, b) {
  return (
    b.score - a.score ||
    a.elapsedSeconds - b.elapsedSeconds ||
    b.kills - a.kills ||
    a.level - b.level ||
    a.serverTime - b.serverTime ||
    a.sheetRow - b.sheetRow
  );
}

function publicScore_(score) {
  return {
    rank: score.rank,
    score: score.score,
    playerName: score.playerName,
    kills: score.kills,
    bossElapsedSeconds: score.bossElapsedSeconds,
    bossRemainingSeconds: score.bossRemainingSeconds,
    bossRemainingText: score.bossRemainingText,
    bossTimeBonus: score.bossTimeBonus,
    levelPoints: score.levelPoints,
    baseScoreAdjustment: score.baseScoreAdjustment,
    scoreAdjustment: score.scoreAdjustment,
    // 保留舊欄位，讓尚未更新的前端仍能正確顯示「Boss 剩餘」。
    overtimeSeconds: score.bossRemainingSeconds,
    overtimeText: score.bossRemainingText,
    level: score.level,
    elapsedSeconds: score.elapsedSeconds,
    elapsedText: score.elapsedText,
    totalExp: score.totalExp,
    weapons: score.weapons,
    build: score.build,
    runId: score.runId
  };
}

function emptyLeaderboard_(gameId, limit) {
  return {
    ok: true,
    gameId,
    limit,
    total: 0,
    storedLimit: MAX_STORED_SCORES,
    entries: [],
    own: null,
    rankingRule: rankingRuleText_()
  };
}

function rankingRuleText_() {
  return '分數較高者優先；同分依最短時間、最多擊殺數、最低等級排序。';
}

function validateScore_(data) {
  const playerName =
    cleanText_(data.playerName, MAX_NAME_LENGTH);

  const result =
    cleanText_(data.result, 20);

  const gameId =
    cleanText_(data.gameId, 80);

  const runId =
    cleanText_(data.runId, 100);

  if (!playerName) {
    throw new Error('缺少玩家名稱');
  }

  if (result !== 'victory') {
    throw new Error('只接受 victory 紀錄');
  }

  if (!gameId) {
    throw new Error('缺少 gameId');
  }

  if (!runId) {
    throw new Error('缺少 runId');
  }

  const elapsedSeconds = finiteNumber_(
    data.elapsedSeconds,
    SCORE_BOSS_START_SECONDS,
    SCORE_BOSS_START_SECONDS +
      SCORE_BOSS_FIGHT_LIMIT_SECONDS + 10,
    '通關時間'
  );

  const level = finiteInteger_(
    data.level,
    1,
    9999,
    '等級'
  );

  const kills = finiteInteger_(
    data.kills,
    0,
    10000000,
    '擊殺數'
  );

  const totalExp = finiteNumber_(
    data.totalExp,
    0,
    1000000000,
    '總 EXP'
  );

  const scoreAdjustment =
    data.scoreAdjustment == null ||
    data.scoreAdjustment === ''
      ? 0
      : finiteInteger_(
          data.scoreAdjustment,
          SCORE_MIN_RUN_ADJUSTMENT,
          SCORE_MAX_RUN_ADJUSTMENT,
          '本局分數調整'
        );

  const computed = calculateScore_(
    totalExp,
    elapsedSeconds,
    level,
    scoreAdjustment
  );

  return {
    playerName,
    result,
    elapsedSeconds,
    elapsedText:
      formatDuration_(elapsedSeconds),
    level,
    kills,
    totalExp: computed.totalExp,
    bossElapsedSeconds: computed.bossElapsedSeconds,
    bossRemainingSeconds: computed.bossRemainingSeconds,
    bossTimeBonus: computed.bossTimeBonus,
    levelPoints: computed.levelPoints,
    baseScoreAdjustment: computed.baseScoreAdjustment,
    scoreAdjustment: computed.scoreAdjustment,
    score: computed.score,
    hp: finiteNumber_(
      data.hp,
      0,
      10000000,
      'HP'
    ),
    maxHp: finiteNumber_(
      data.maxHp,
      1,
      10000000,
      '最大 HP'
    ),
    weaponCount: finiteInteger_(
      data.weaponCount,
      0,
      100,
      '武器數'
    ),
    weapons:
      canonicalWeapons_(
        data.weaponLevels,
        data.weapons
      ),
    build:
      cleanText_(data.build, 100),
    configVersion:
      cleanText_(data.configVersion, 30),
    gameId,
    runId,
    clientTimestamp:
      cleanText_(data.clientTimestamp, 80),
    userAgent:
      cleanText_(data.userAgent, 300)
  };
}

function calculateScore_(
  totalExp,
  elapsedSeconds,
  level,
  scoreAdjustment
) {
  const normalizedExp =
    Math.max(0, Math.round(Number(totalExp) || 0));

  const normalizedElapsed =
    Math.max(0, Number(elapsedSeconds) || 0);

  const normalizedLevel =
    Math.max(1, Math.floor(Number(level) || 1));

  const normalizedScoreAdjustment =
    normalizeStoredScoreAdjustment_(scoreAdjustment);

  const bossElapsedExact =
    Math.max(
      0,
      normalizedElapsed - SCORE_BOSS_START_SECONDS
    );

  const bossElapsedSeconds =
    Math.floor(bossElapsedExact + 1e-9);

  // 直接對「剩餘時間」取 floor，與 game.js 完全一致。
  // 不能先 floor 已經過時間再相減，否則部分小數秒會多算 1 秒。
  const bossRemainingSeconds =
    Math.max(
      0,
      Math.floor(
        SCORE_BOSS_FIGHT_LIMIT_SECONDS -
        bossElapsedExact +
        1e-9
      )
    );

  const levelPoints =
    normalizedLevel *
      SCORE_LEVEL_POINTS_PER_LEVEL +
    SCORE_BASE_ADJUSTMENT;

  const bossTimeBonus =
    bossRemainingSeconds *
    SCORE_BOSS_REMAINING_POINTS_PER_SECOND;

  return {
    totalExp: normalizedExp,
    bossElapsedSeconds,
    bossRemainingSeconds,
    bossTimeBonus,
    levelPoints,
    baseScoreAdjustment: SCORE_BASE_ADJUSTMENT,
    scoreAdjustment: normalizedScoreAdjustment,
  score:
    normalizedExp +
    levelPoints +
    bossTimeBonus +
    normalizedScoreAdjustment
  };
}

function sortAndPruneTopScores_(sheet) {
  const lastRow = sheet.getLastRow();
  const dataRows = Math.max(0, lastRow - 1);

  if (dataRows <= 0) {
    return;
  }

  sheet
    .getRange(2, 1, dataRows, HEADERS.length)
    .sort([
      {
        column: COL.SCORE,
        ascending: false
      },
      {
        column: COL.ELAPSED_SECONDS,
        ascending: true
      },
      {
        column: COL.KILLS,
        ascending: false
      },
      {
        column: COL.LEVEL,
        ascending: true
      },
      {
        column: COL.SERVER_TIME,
        ascending: true
      }
    ]);

  if (dataRows > MAX_STORED_SCORES) {
    sheet.deleteRows(
      MAX_STORED_SCORES + 2,
      dataRows - MAX_STORED_SCORES
    );
  }
}

function isDuplicateRunId_(sheet, runId) {
  return findRunRow_(sheet, runId) > 0;
}

function findRunRow_(sheet, runId) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2 || !runId) {
    return 0;
  }

  const values = sheet
    .getRange(
      2,
      COL.RUN_ID,
      lastRow - 1,
      1
    )
    .getDisplayValues()
    .flat();

  const index = values.indexOf(runId);

  return index >= 0
    ? index + 2
    : 0;
}

function getBoundSpreadsheet_() {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      '找不到綁定的 Google 試算表。請從試算表的「擴充功能 → Apps Script」建立此專案。'
    );
  }

  return spreadsheet;
}

function getOrCreateScoreSheet_() {
  const spreadsheet =
    getBoundSpreadsheet_();

  let sheet =
    spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  ensureScoreSchema_(sheet);
  return sheet;
}

function ensureScoreSchema_(sheet) {
  const properties =
    PropertiesService.getDocumentProperties();

  if (
    properties.getProperty(SCORE_SCHEMA_PROPERTY) ===
    SCORE_SCHEMA_VERSION
  ) {
    return;
  }

  // 舊版第 22 欄是舊公式總分，不是本局分數調整；
  // 第一次升級時必須把既有紀錄的調整值視為 0。
  recalculateStoredScores_(sheet, false);

  properties.setProperty(
    SCORE_SCHEMA_PROPERTY,
    SCORE_SCHEMA_VERSION
  );
}

function recalculateStoredScores_(
  sheet,
  preserveAdjustments
) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const rowCount = lastRow - 1;
  const values = sheet
    .getRange(2, 1, rowCount, HEADERS.length)
    .getValues();

  const recalculated = values.map(row => {
    const result = String(row[COL.RESULT - 1] || '');
    const elapsedSeconds = Number(
      row[COL.ELAPSED_SECONDS - 1]
    );
    const totalExp = Number(row[COL.TOTAL_EXP - 1]);
    const level = Number(row[COL.LEVEL - 1]);

    if (
      result !== 'victory' ||
      !Number.isFinite(elapsedSeconds) ||
      !Number.isFinite(totalExp) ||
      !Number.isFinite(level)
    ) {
      return [
        row[COL.BOSS_REMAINING_SECONDS - 1] || '',
        row[COL.BOSS_TIME_BONUS - 1] || '',
        row[COL.LEVEL_POINTS - 1] || '',
        preserveAdjustments
          ? row[COL.SCORE_ADJUSTMENT - 1] || 0
          : 0,
        row[COL.SCORE - 1] || ''
      ];
    }

    const scoreAdjustment = preserveAdjustments
      ? normalizeStoredScoreAdjustment_(
          row[COL.SCORE_ADJUSTMENT - 1]
        )
      : 0;

    const computed = calculateScore_(
      totalExp,
      elapsedSeconds,
      level,
      scoreAdjustment
    );

    return [
      computed.bossRemainingSeconds,
      computed.bossTimeBonus,
      computed.levelPoints,
      computed.scoreAdjustment,
      computed.score
    ];
  });

  sheet
    .getRange(
      2,
      COL.BOSS_REMAINING_SECONDS,
      rowCount,
      5
    )
    .setValues(recalculated)
    .setNumberFormat('0');
}

function normalizeStoredScoreAdjustment_(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    SCORE_MIN_RUN_ADJUSTMENT,
    Math.min(
      SCORE_MAX_RUN_ADJUSTMENT,
      Math.round(number)
    )
  );
}

function ensureHeaders_(sheet) {
  const currentHeaders = sheet
    .getRange(1, 1, 1, HEADERS.length)
    .getDisplayValues()[0];

  const headerMissing = HEADERS.some(
    (header, index) =>
      currentHeaders[index] !== header
  );

  if (headerMissing) {
    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS]);

    styleHeader_(sheet);
    sheet.setFrozenRows(1);
  }
}

function styleHeader_(sheet) {
  sheet
    .getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#6d183e')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
}

function canonicalWeapons_(weaponLevelsJson, legacyWeapons) {
  const jsonText = cleanText_(
    weaponLevelsJson,
    MAX_WEAPON_LEVELS_JSON_LENGTH
  );

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);

      if (Array.isArray(parsed)) {
        const entries = parsed
          .map(item => {
            if (!item || typeof item !== 'object') {
              return null;
            }

            const name =
              cleanText_(item.name || item.key, 80);

            const level = Number(item.level);

            if (
              !name ||
              !Number.isFinite(level) ||
              level < 0 ||
              level > 99
            ) {
              return null;
            }

            return `${name} Lv.${Math.round(level)}`;
          })
          .filter(Boolean);

        if (entries.length) {
          return entries
            .join('｜')
            .slice(0, MAX_WEAPONS_LENGTH);
        }
      }
    } catch (error) {
      console.warn(
        'weaponLevels JSON 解析失敗，改用舊 weapons 欄位',
        error
      );
    }
  }

  return cleanWeapons_(
    legacyWeapons,
    MAX_WEAPONS_LENGTH
  );
}

function cleanWeapons_(value, maxLength) {
  return cleanText_(value, maxLength)
    .replace(
      /Lv\.\[object Object\]/g,
      'Lv.?'
    );
}

function cleanText_(value, maxLength) {
  return String(
    value == null
      ? ''
      : value
  )
    .replace(
      /[\u0000-\u001F\u007F]/g,
      ' '
    )
    .trim()
    .slice(0, maxLength);
}

function safeCell_(value) {
  const text = String(
    value == null
      ? ''
      : value
  );

  return /^[=+\-@]/.test(text)
    ? `'${text}`
    : text;
}

function finiteNumber_(
  value,
  min,
  max,
  label
) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max
  ) {
    throw new Error(
      `${label}格式不正確`
    );
  }

  return number;
}

function finiteInteger_(
  value,
  min,
  max,
  label
) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < min ||
    number > max
  ) {
    throw new Error(
      `${label}格式不正確`
    );
  }

  return number;
}

function boundedInteger_(
  value,
  min,
  max,
  fallback
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    min,
    Math.min(
      max,
      Math.floor(number)
    )
  );
}

function formatDuration_(seconds) {
  const safeSeconds =
    Math.max(0, Number(seconds) || 0);

  const minutes =
    Math.floor(safeSeconds / 60);

  const remaining =
    Math.floor(safeSeconds % 60);

  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(remaining).padStart(2, '0')
  );
}

function errorMessage_(error) {
  return String(
    error && error.message
      ? error.message
      : error
  );
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(
      JSON.stringify(payload)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

function webOutput_(payload, callback) {
  const callbackName =
    cleanCallback_(callback);

  if (!callbackName) {
    return jsonOutput_(payload);
  }

  return ContentService
    .createTextOutput(
      `${callbackName}(${JSON.stringify(payload)});`
    )
    .setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
}

function cleanCallback_(value) {
  const callback =
    String(value == null ? '' : value).trim();

  return /^[A-Za-z_$][0-9A-Za-z_$]*(?:\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)
    ? callback
    : '';
}
