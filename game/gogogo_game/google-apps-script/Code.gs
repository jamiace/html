// 模擬AI對戰：Google Sheets 雲端排行榜 API v5
// 重點：
// 1) 排行榜只以 Google Sheets 為準，不提供本機排行榜資料。
// 2) top100 會回傳雲端 Top 100；若帶 entryId，會額外回傳該玩家的雲端名次與資料。
// 3) 若玩家未進 Top 100，前端可顯示 Top 100 最後幾名 + 玩家自己。
// 4) 使用 getActiveSpreadsheet()，適合從目標 Google Sheet 的「擴充功能 → Apps Script」開啟並部署。

const SPREADSHEET_ID = "1Jj4Ioupva5HUAvbogn8dxeGY9eBOf7bsMKhz3YBVfOQ";
const SHEET_NAME = "排行榜";
const API_KEY = "jami-score-v1";

const HEADERS = [
  "timestamp",
  "entryId",
  "playerName",
  "score",
  "correctCount",
  "totalQuestions",
  "accuracy",
  "totalTime",
  "aiName",
  "aiScore",
  "stage",
  "result",
  "comboMax",
  "playerProfile",
  "userAgent",
  "scoreBeforeWinBonus",
  "winBonus"
];

const BASE_AI_TITLES = [
  "山道猴子",
  "已知用火",
  "社會底層",
  "黑色豪門企業",
  "路人超能0%",
  "自稱是掃地僧",
  "不好相處的學霸",
  "那些說他都沒在念書的同學",
  "世紀天才",
  "智慧之神"
];

function cleanDisplayTitle_(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  for (let i = 0; i < BASE_AI_TITLES.length; i++) {
    const base = BASE_AI_TITLES[i];
    if (s === base || s === base + "2" || s === base + "3") return base;
  }
  return s;
}

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};

  try {
    const action = p.action || "ping";

    if (action === "ping") {
      return output_({
        ok: true,
        message: "Score API is running.",
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        time: new Date().toISOString()
      }, p.callback);
    }

    if (action === "top100") {
      if (p.apiKey !== API_KEY) {
        return output_({ ok: false, error: "Invalid API key" }, p.callback);
      }
      const limit = Math.min(Math.max(Number(p.limit || 100), 1), 100);
      const result = getTopScoresWithMeta_(limit, String(p.entryId || ""));
      return output_({
        ok: true,
        data: result.topRows,
        meRank: result.meRank,
        meRow: result.meRow,
        total: result.total
      }, p.callback);
    }

    return output_({
      ok: false,
      error: "Unknown action: " + action,
      actions: ["ping", "top100", "submit"]
    }, p.callback);

  } catch (err) {
    return output_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : "")
    }, p.callback);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);

    if (body.apiKey !== API_KEY) {
      return output_({ ok: false, error: "Invalid API key" });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getOrCreateSheet_();
      sheet.appendRow([
        new Date(),
        body.entryId || Utilities.getUuid(),
        cleanDisplayTitle_(body.playerName) || "匿名玩家",
        Number(body.score || 0),
        Number(body.correctCount || 0),
        Number(body.totalQuestions || 10),
        Number(body.accuracy || 0),
        Number(body.totalTime || 0),
        cleanDisplayTitle_(body.aiName) || "",
        Number(body.aiScore || 0),
        Number(body.stage || 1),
        body.result || "",
        Number(body.comboMax || 0),
        body.playerProfile || "",
        body.userAgent || "",
        Number(body.scoreBeforeWinBonus || body.score || 0),
        Number(body.winBonus || 0)
      ]);
    } finally {
      lock.releaseLock();
    }

    return output_({ ok: true });

  } catch (err) {
    return output_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : "")
    });
  }
}

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    const raw = e.postData.contents;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return e.parameter || {};
    }
  }
  return (e && e.parameter) ? e.parameter : {};
}

function getTopScoresWithMeta_(limit, entryId) {
  const rows = getAllScoreRows_();
  const rankedRows = rows.map(function(row, idx) {
    const copy = Object.assign({}, row);
    copy.rank = idx + 1;
    return copy;
  });

  const topRows = rankedRows.slice(0, limit);
  let meRank = 0;
  let meRow = null;

  if (entryId) {
    const found = rankedRows.find(function(row) {
      return row.entryId === entryId;
    });
    if (found) {
      meRank = found.rank;
      meRow = found;
    }
  }

  return {
    topRows: topRows,
    meRank: meRank,
    meRow: meRow,
    total: rankedRows.length
  };
}

function getAllScoreRows_() {
  const sheet = getOrCreateSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const rows = values.slice(1)
    .filter(function(row) { return row[1] || row[3]; })
    .map(function(row) {
      return {
        timestamp: normalizeDate_(row[0]),
        entryId: String(row[1] || ""),
        playerName: cleanDisplayTitle_(row[2]) || "匿名玩家",
        score: Number(row[3] || 0),
        correctCount: Number(row[4] || 0),
        totalQuestions: Number(row[5] || 10),
        accuracy: Number(row[6] || 0),
        totalTime: Number(row[7] || 0),
        aiName: cleanDisplayTitle_(row[8]),
        aiScore: Number(row[9] || 0),
        stage: Number(row[10] || 1),
        result: String(row[11] || ""),
        comboMax: Number(row[12] || 0),
        playerProfile: String(row[13] || ""),
        scoreBeforeWinBonus: Number(row[15] || row[3] || 0),
        winBonus: Number(row[16] || 0)
      };
    });

  rows.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return a.totalTime - b.totalTime;
  });

  return rows;
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("此 Apps Script 必須從目標 Google Sheet 的『擴充功能 → Apps Script』開啟並部署。");
  }

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const current = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length))
    .getValues()[0];

  let needsUpdate = false;
  for (let i = 0; i < HEADERS.length; i++) {
    if (current[i] !== HEADERS[i]) {
      needsUpdate = true;
      break;
    }
  }

  if (needsUpdate) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function normalizeDate_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return value.toISOString();
  }
  return String(value || "");
}

function output_(obj, callback) {
  const json = JSON.stringify(obj);

  if (callback) {
    const safeCallback = String(callback).replace(/[^a-zA-Z0-9_$\.]/g, "");
    return ContentService
      .createTextOutput(safeCallback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
