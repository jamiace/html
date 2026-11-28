# Azure Requiem — 工程交接文件（44.56 版）

> 給接手開發的工程師或 AI coding agent。內容是「目前程式長什麼樣、怎麼跑、改東西時一定要守的規則」。
> 遊戲功能的玩家視角說明見另一份《遊戲細節總覽》。設計規格以 claude.ai 專案文件與使用者（導演）的指示為準。

---

## 0. 先讀這一節：協作規則（違反會被退件）

1. **決策權屬於使用者（導演）**。AI／工程師有實作權與提案權，沒有決策權。不得自行加入任何會改變遊戲節奏、劇情順序或戰場狀態的規則（「時間到就跳過」「等不到就強制觸發」「超過幾秒就放棄」都不行，理由再合理也一樣）。擔心某個條件永遠等不到時，先提出來讓使用者決定。
2. **需求有兩種讀法、或和現有規則衝突時，先問**，說明撞到哪一條、各自的結果，列出選項。不要自己補解釋。
3. **自己決定的地方標【提案】**，並在回報裡明說；只寫在程式註解裡不算告知。
4. **回報只說實際測過的項目**，寫出具體測了什麼；沒測到的明講。
5. **每次交付都要把 `src/version.ts` 的 `VERSION` 加 0.01**（例如 44.56 → 44.57），不管改多小。
6. **對使用者一律用繁體中文**。遊戲內文字、程式註解也是繁體中文。距離單位對使用者用 ft。
7. **不要亂改飛行速度、不要加使用者沒說的節奏規則**。數值照使用者給的。
8. **改過文字的台詞一定換新編號**（語音工作室用檔名判斷「已是最新」）；但使用者指定沿用時照使用者的（例：10108 用 `#a-b` 分段播，不拆新編號）。
9. 畫面相關的改動（雲、著色器、運鏡、HUD 版面、特效、預熱）交付前要在使用者電腦上實際跑過、看過（見第 13 章）；無頭瀏覽器沒有真正的顯示卡、跑不了體積雲，不能當作驗證。
10. 文件：專案相關的 md 放進 claude.ai 專案，也放一份到部署資料夾的 `docs\`（公開，只寫遊戲設定類內容）。

---

## 1. 技術組成

| 項目 | 內容 |
|---|---|
| 語言 | TypeScript 5.4（strict），ES modules |
| 繪圖 | three.js 0.170（r170），WebGL2 |
| 體積雲 | `@takram/three-clouds` 0.7.6（大量改寫過步進迴圈與光線，見 `render/VolumetricSky.ts`、`render/cloudMarch.ts`） |
| 後製 | `postprocessing` 6.36 |
| 打包 | esbuild 0.21.5（`build.mjs`） |
| 輸入 | Gamepad API、WebHID（DualSense 直連）、鍵盤、滑鼠、觸控 |
| 音訊 | Web Audio API |
| 執行環境 | 桌面 Chrome／Edge 為主；手機有簡化觸控 |
| 模擬 | `src/game/*` 是純邏輯，可在 Node 執行（測試用） |

---

## 2. 目錄結構

```
ace-dogfight/
  build.mjs                 打包腳本（--split / --single-file / --serve / --test）
  package.json              npm 指令
  data/
    default-roster.json     預設編成
    default-tuning.json     所有可調參數的專案預設值（啟動時套用；見第 9 章）
    mission-script.json     第一關的完整腳本（台詞、波次、Tyrant 行為、chatter）
    radio-lines.json        全部台詞（id → {w, en, zh}）
    special-weapons.json    26 款特殊兵裝的規格
  assets/                   模型 glb、音效、頭像縮圖、地形高度圖、雲／海／天空貼圖、徽章、UI 圖
  src/
    main.ts                 Game 類別：啟動、主迴圈、出擊／預熱、事件分派、演出鏡頭、HUD 與音訊驅動
    version.ts              VERSION（每次交付 +0.01）
    core/   設定、參數系統、資源快取、效能錄製、卡頓偵測、記憶體統計、three 初始化
    data/   機體、武器、AI 檔案、地面、ANZU、共通參數、編成
    flight/ FlightPhysics（玩家與 AI 共用的飛行模型）
    combat/ WeaponSystem（鎖定、機砲、飛彈導引、TLS、EML、熱焰彈）
    ai/     AIController（敵機、僚機、自動飛行、ANZU 戰的專門邏輯）
    game/   Sim、Aircraft、Director（D01）、Stingray（D02／ANZU）、Radio、Recorder、Ground、SpecialWeapons…
    render/ 場景、天空、雲、海、特效、核爆、後製、ANZU 畫面、鏡頭、模型、預熱
    ui/     CombatHUD、Screens（全部選單）、Debrief（結算與重播）、DebugPanel、觸控、各種面板
    input/  Input（綁定、組合鍵）、Haptics（震動、自適應扳機）
    audio/  Audio（音效引擎）、Music（配樂與換曲）
    world/  terrain（地形高度函式，模擬與繪圖共用）、島嶼資料
  test/                     Node 無畫面測試（esbuild 打包後執行）
  tools/                    島嶼產生、音效打包、語音清單匯出等
  dist/                     建置輸出（index.html + assets/）
```

### 2-1 主要檔案一覽

| 檔案 | 責任 |
|---|---|
| `main.ts` | `Game`：boot、`launch/launchNow`（出擊與預熱）、`loop`（每幀）、`control`（玩家輸入→操縱）、`dispatch`（模擬事件→畫面／無線電／音效）、`cineCamera`／`glideCam`／墜機鏡頭、暫停、補給、空拍機、打靶場、核爆測試、效能匯出 |
| `game/Sim.ts` | 世界狀態：aircraft、missiles、bullets、slugs、flares、ground、hitProxies、events；`step(dt)`、`damage`、`destroy`、`emit`；作弊、凍結、`cine`（演出）與 `clearForCine` |
| `game/Aircraft.ts` | 飛機實體（state、weapons、ai、hp、faction、slot…） |
| `game/Director.ts` | 第一關的劇情導演：讀 mission-script，生成波次、戰術分工、台詞、配樂、Tyrant 階段 |
| `game/Stingray.ts` | 第二關的導演＋ANZU 本體（StingrayDirector，`sim.s2`）：流程、部件、迷彩、震盪束、CIWS、AAM、AA GUN、UAV、干擾、修復、墜機 |
| `data/stingray.ts` | ANZU 的數值表 `STINGRAY`（tuning 會覆寫）、部件表、命中判定球、UAV／RAVEN 機體定義 |
| `game/Radio.ts` | 無線電：佇列、優先度、字幕分段、頭像、語音包解碼與播放、chatter 觸發 |
| `game/Recorder.ts` | 戰鬥記錄（航跡、飛彈、擊墜、核爆、震盪束）給重播 |
| `game/SpecialWeapons.ts` | 26 款特殊兵裝的效果 |
| `game/Ground.ts` | AA GUN、SAM、我方艦艇（巡航、防空、ECM） |
| `flight/FlightPhysics.ts` | 飛行模型（第 3 章） |
| `combat/WeaponSystem.ts` | 每架飛機一份：鎖定、機砲（追瞄）、飛彈（Missile 類別與導引）、TLS、EML、熱焰彈 |
| `ai/AIController.ts` | AI 核心；只輸出 ControlInput |
| `render/GameView.ts` | 模擬→場景：飛機模型、飛彈、殘骸、音速錐、電漿殼、UAV 模型池、子系統（StingrayView、GroundView、Effects） |
| `render/WorldView.ts` | 天空、海（Water＋鏡像倒影）、島嶼與樹、光照、天氣套用、環境貼圖、日夜 |
| `render/VolumetricSky.ts` | 體積雲模式的整套繪製順序、特效圖層收編（adopt）、雲遮擋、天氣預設（VOL_WEATHER） |
| `render/Clouds.ts` | 一般立體雲（看板雲、雲海、卷雲、densityAt） |
| `render/StingrayView.ts` | ANZU 的模型、戰損著色、尾焰、震盪束、迷彩遮罩、前景遮罩、碎片、修復光、墜機替身 |
| `render/PostFX.ts` | 後製：震波折射、光學迷彩、速度線、熱擾動 |
| `render/Effects.ts` | 粒子池（煙、火、爆炸 flipbook、火星）、翼尖尾跡、曳光、光束、衝擊波環 |
| `render/NukeFX.ts` | 核爆所有元件 |
| `render/models.ts`／`GltfModels.ts` | 機體模型（glb 原型→實例）、尾焰、舵面動畫、命中用的粗略外形（proxy） |
| `render/linear.ts` | 線性色彩輸出、FX_CLOUD、CRISP 等共用 uniform 與材質修補 |
| `ui/CombatHUD.ts` | 全部 HUD（canvas 2D） |
| `ui/Screens.ts` | 全部選單（DOM） |
| `ui/Debrief.ts` | 結算與 3D 重播 |
| `core/Tuning.ts` | 參數系統（第 9 章） |
| `core/settings.ts` | 使用者設定與升級遷移 |

---

## 3. 建置、執行、部署

### 3-1 指令

```bash
npm install
npm run build          # dist/index.html + dist/assets/（拆檔版，預設）
npm run build:single   # dist/index.single.html（單檔，可雙擊開啟，但讀不到 voice/ 等外部檔）
npm run dev            # http://localhost:8000，重新整理就重新建置
npm run typecheck      # tsc --noEmit
npm test               # 無畫面模擬測試（飛行物理＋AI 對 AI）
npm run test:story     # 劇情導演測試
npm run voice-lines    # 匯出語音工作室用的台詞清單
```

### 3-2 部署資料夾結構（使用者電腦 `D:\Dropbox\Github\html\game\Azure_Requiem\`）

```
index.html             建置輸出
assets/                建置輸出的圖片與資料（檔名帶雜湊；新增圖片素材時要一起放）
models/*.glb           機體與單位模型（執行時下載）
music/                 配樂 mp3（原檔名，不進 git）
voice/voice_pack.bin   語音包
sound/sound_pack.bin   音效包（含 manifest.json）
head/*.png             無線電頭像 500×500
docs/                  公開文件
local_server.bat       本機伺服器 http://localhost:8000
_dev/                  開發用版本
```

- 交付 index.html 時：`device_commit_files` 寫到部署資料夾，並用 `SendUserFile` 給使用者一份。
- 推 GitHub：使用者電腦的 GitHub Desktop（repo `jamiace/html`，分支 main）。只勾要交付的檔案。

### 3-3 資源下載與快取

- `core/assetCache.ts` 的 `cachedBuffer()`：存在 Cache Storage，以「開頭 64 KB＋結尾 64 KB＋長度」比對，同一版不重新下載。
- 語音包格式（`Radio.loadVoicePack`）：`'ARVOICE1'`（8 位元組）＋索引長度 N（uint32 LE）＋N 位元組 UTF-8 JSON `{files:[[檔名, 起點, 長度], …]}`＋資料區（所有 mp3 依序接起來）。由語音工作室的 `pack_voice.py` 產生，只收 lines.json 用得到的檔名。
- 音效包：`python tools/make-pack.py sound sound/sound_pack.bin`。
- 頭像兩份：外部 `head/*.png`（`Radio.PORTRAIT_FILE`）＋內嵌縮圖 `assets/portraits/*.jpg`（`PORTRAIT_SRC`）。新增角色時兩份都要加。

---

## 4. 執行期架構

### 4-1 主迴圈（`Game.loop`，每個 requestAnimationFrame）

依序（括號是 `PERF` 的段名）：

1. `input`：讀手把／鍵盤／觸控，產生 `InputFrame`（死區、組合鍵、時間窗、回彈過濾）。
2. `control`：`InputFrame` → 玩家的 ControlInput（觸控時走 `touchAssist`；自動飛行時玩家輸入優先蓋過 AI）。
3. `radio`：`radio.update(dt, sim)`（字幕與語音推進、chatter 判斷）。
4. `sim`：`dt = min(real, 0.05) × debug.timeScale`；預熱或編譯中 `dt = 0`；`dt > 1/45` 時拆成 2 步。每步 `sim.step(dt)`。
5. `dispatch()`：處理 `sim.events`（→ `view.handleEvent`、`radio.onEvent`、音效、震動、記錄），處理完清空。
6. `camera`：遊玩鏡頭／演出鏡頭（`cineCamera`）／墜機鏡頭／空拍機。
7. `view`：`view.update(sim, dt, …)`（模型位置、特效、ANZU）。
8. `world`：天空、海、天氣、日夜、陰影。
9. `cloakMask`：ANZU 迷彩遮罩與前景遮罩（`StingrayView.renderMask`／`renderFront`）。
10. `render`：體積雲模式走 `VolumetricSky.render`（第 6 章）；否則一般繪製＋PostFX。
11. `hud`：`CombatHUD` 畫 2D 畫布。
12. `audio`：引擎、氣流、警報等循環音依狀態更新；震動。

### 4-2 `Sim.step(dt)` 的順序

1. 劇情導演：`story.update(dt)`（D01 是 `Director`，D02 是 `StingrayDirector`；「停止所有物件」時跳過）。非劇情模式由 MissionDirector 規則補波次。
2. AI：每架 active、沒被凍結的 AI 飛機 `ai.update(dt)`；自動飛行時 `playerManual`。
3. 地面單位 `updateGround`（演出中暫停）。
4. 玩家目標自動補選。
5. 飛行、武器、反制：每架飛機 FlightPhysics、WeaponSystem、作弊處理。
6. `stepProjectiles`：飛彈、機砲彈、電磁砲彈、熱焰彈的移動與命中（演出中、「停止所有物件」時暫停）；死掉的飛彈發 `missileEnd`。
7. 碰撞、邊界、勝敗、記錄（`rec.update`）。

- **凍結**：`sim.frozen(ac)`：演出中除了 `cine.target` 之外全部暫停；作弊「停止敵機／停止所有物件」。
- **演出**：`sim.cine = { name, target, logo, title, t0, hold?, sub? }`。`cine` 是 setter：換成一個新的演出時自動呼叫 `clearForCine()`（拿掉所有飛彈、砲彈、熱焰彈、TLS 照射、特殊兵裝效果，發 `cineClear` 事件；main 收到時 `audio.cutSfx()`，Radio 收到時丟掉非劇情的排隊台詞並重設飛彈計數）。墜機動畫開始時 Stingray 也呼叫一次。

### 4-3 事件匯流排

- 模擬用 `sim.emit({ type, … })`，主程式每幀 `dispatch()` 一次分派給 GameView、StingrayView、Radio、音效。模擬本身不碰畫面與音訊。
- 常見事件：`spawn`、`launch`、`missileEnd`、`gun`、`gunHit`、`hit`、`damage`、`destroyed`、`explosion`、`rail`、`railHit`、`laserStart`／`laserEnd`、`sonicBoom`、`splash`、`objective`、`music`、`scene`（劇情台詞）、`order`（僚機指令）、`cloak`、`s2beam`（charge／fire／end）、`s2beamHit`、`s2push`（現身）、`s2revive`、`s2crash`、`s2ripple`、`s2cdAbort`、`s2lockTone`、`swSound`、`cineClear`。
- 新增會畫在畫面上的事件時，記得在讀取時預熱它的模型與著色器（第 8 章）。

### 4-4 劇情台詞的發送（`scene` 事件）

Radio 的 `scene` 事件欄位：

| 欄位 | 意思 |
|---|---|
| `ids` | 台詞 id 陣列（連續講成一串對話）；`'M2-10108#3-3'` = 只講這句錄音的第 3 段（從 1 算，檔名維持原本的分段編號） |
| `pr` | 優先度（越小越優先；0 最高） |
| `force` | 說話者不在也照講（遺言等），勝負確定時也保留延遲中的 |
| `cut` | 打斷正在說的話；被警告系統打斷的劇情台詞放回佇列、之後從頭說；keep 的也放回去 |
| `clear` | 清掉排隊中的台詞（keep 的保留） |
| `purge` | 場面整個換掉：佇列、串著的整串、延遲中的全部作廢 |
| `delay` | 延遲幾秒才排入 |
| `names` | 指定顯示名稱（例：`LUGAL ・公開頻道`） |
| `ok` | 輪到時再確認一次的條件；不成立就略過 |
| `done` | 整組講完（或被略過）後呼叫 |
| `start` | 第一句真的開口時呼叫 |
| `lineDone` | 某一句「真的講完」時呼叫（略過、過期不算） |
| `keep` | 絕對不略過：不會過期、被打斷會重講 |
| `jump` | 插隊：不等整段對話講完，正在進行的對話講完這一句就先講它，再接回原本的對話 |
| `glitch` | 訊號不良效果 |
| `mute` | 45 秒內不再播同一組 |

- **警告系統（WN，震盪束倒數）**：帶 `cut` 的 WN 台詞不排隊，當下立刻 `speak`；佇列裡還沒講出來的 WN 全部作廢；還沒解碼完就先只出字幕。倒數期間（`s2.countdown !== null && !s2.cdDone`）其他角色被 `held()` 擋住。
- 佇列排序：WN 第一 → `jump` → 劇情（story）→ 優先度 → 先後。戰鬥反應過期就丟（劇情 pr≤1 等 45 秒，其他 8～14 秒）。
- 停頓：同一句下一段 0.3 秒、對話換人 0.8 秒（同一人 0.45 秒）、不相干 1 秒。

### 4-5 第二關的 `say()` 播放器（`Stingray.ts`）

```ts
this.say(['10135', '10136', 3, () => cond(), 'groupKey', '10108#1-2'], { lane, pr, force, keep, ok, onStart, onEnd, cut, clear })
```

- 步驟：字串 = 台詞（4～5 位數字自動加 `M2-` 前綴，或 `V` 表裡的群組名）；數字 = 停頓秒數；函式 = 等到它回傳 true 才繼續（可以拿來在某句講完後做事，回傳 true）。連續的字串一句接一句。
- `lane`：同一條 lane 的劇情對話一段接一段（預設 `story`）；`c` 是戰鬥中的反應、各自播；`beam` 是震盪束分析對話。
- 流程與台詞順序寫在 `Stingray.ts` 的 `V` 表。

### 4-6 第二關的狀態機（`StingrayDirector`）

- `stage`：`intro` → `wave1` → `gap` → `wave2` → `raven` → `search`（`sub`：`travel` → `search` → `trails` → `approach` → `analyze` → `ident` → `probe`）→ `reveal` → `boss` → `end`。
- `phase` 1～4（`C.phaseHp` = 0.8／0.4／0.2）；`enterP2/enterP3/enterP4`。
- 迷彩：`cloaked`、`cloakK`（0～1，跟 CIWS 冷卻座數連動）、`seq`（`hid`／`vis`／`charge`／`fire`／`post`）。
- 震盪束：`beam`（`aimPoint`、`origin`、`dir`、`charge`、`firing`、`dirLocked`…）；`beamStart` → `updateCharge`（`aimBeam` 掃描 → `trackBeam` 轉向 → 鎖定時 `aimPoint = 目標當下位置`）→ `updateFire`。畫面與雷達都用 `beamLineTo(aimPoint, origin, dir)`（起點跟著 ANZU，終點固定）。
- 修復（40%）：`enterP3` 開 cine `'repair'`、`repairing`、`p3RestoreAt`、`p3UavAt`、`p3NoBox`。
- 墜機：`onBossDown` 設 `crashStartT = now + 50`；`crashElapsed`；`crashRunIn`（-10～0 秒，替身 `crashCopy` 沿 `crashLeadAt` 下滑、主機隱藏）；`crashCameraActive`（-10 秒起，`main.glideCam` 固定鏡頭，0 秒起跟拍並 3 秒混合）；`seaT`（觸海）、`crashT`（爆炸）。艦長的話沒講完時時間軸停在 -10.5 秒等。
- 部件：`parts: BossPart[]`（hull、core＝震盪束產生器、ciws、sam(AAM)、aagun、engine、mainEngine），`hitProxies`（本體命中判定球）。
- 減傷：`hullResist`（GUN 0.98、EML 0.8、TLS 0.9）套用在本體與 core（`Sim.damage`）；部件受傷時本體受同額（`part: 'share'`，不再減第二次）。

### 4-7 第一關（`Director.ts` ＋ `mission-script.json`）

- 腳本在 `data/mission-script.json`（瀏覽器可匯入覆蓋，存在 `azr.mission.v1`；「還原預設腳本」回到檔案版本）。
- 內容：開場台詞時間、各波進場位置／高度／航向、觸發條件與台詞群組、Tyrant 分工、求救、解放後參數、chatter（戰鬥中通用台詞：每組可改台詞、優先度、冷卻、機率、`enabled: false`）。`_流程總覽`、`_說明` 欄是給人看的。

---

## 5. 飛行、武器、AI 的實作重點

### 5-1 FlightPhysics

- 狀態：位置、速度向量、機體四元數、角速度、攻角、側滑、G、High-G 狀態機、PSM 狀態機、失速層級、後掠角等。
- 機鼻與速度向量分離；攻角限制器；側滑限制；角速度三種反應（建立／放桿消退／反向修正）。
- High-G：進入延遲（hgLag）→ 全力 → 持續效果降低（hgFullTime、hgSustain）→ 放開退回（hgRelease）；轉向上限 × highGMultiplier。
- 高度：高原 24,000 ft 起推力衰減與爬升代價（altPlateauFt、altClimbCost、altBand*）；失速帶；強制失速；絕對天花板 33,500 ft。
- 俯衝加速（diveRamp、diveMax）、阻力分項（turnDrag、aoaDrag、hgDrag、stallLoss）。
- 失速三層與機鼻下墜（stallBehavior.noseDropRate／intensity／controlRetention）。
- 參數都在 tuning「共通 → 飛行」與「機體」。

### 5-2 WeaponSystem

- 每架飛機一份，玩家與 AI 共用：`slots`（機砲、STD、SP1、SP2）、鎖定（多目標逐一鎖定）、`fire()`。
- `Missile`：推進、轉向率、尋標視角、失鎖後直線飛、熱焰誘騙、近炸引信對途中任何敵對單位；鎖定 ANZU 部件時只對那個部件引爆；`feint`（打王牌的擦身而過）；`sure`（必中）；PARADOX 暫停。
- 機砲：玩家瞄準輔助與追瞄；命中部位倍率（ZONES）。
- TLS：`laser` 物件（on、t、power、start、end、hit、surf、dmg）；傷害每 0.1 秒結算。
- EML：`Slug`，約 2° 微量自動瞄準。
- CountermeasureSystem：熱焰彈逐枚判定。

### 5-3 AIController

- 只輸出 ControlInput；技術等級 `skill:1～4`、`skill:tyrant`；群組 `group:*`（wingman、enemy、ace、cerbEscort、tyrantHeld、tyrantFree、uav、wingVsStingray、wingVsTyrant）；難度 `diff:*`。
- 僚機：編隊（finger-four）、指令（attack／cover／free／特殊兵裝）、`wingOrderAuto`（開場自動 free、不出聲）。
- 劇情位置 `scriptPos`（試射位置，以主角＋0.5 馬赫趕到）、UAV 護衛點、UAV 自毀衝撞。
- 自動飛行（demo）：王牌技術、玩家輸入優先、ANZU 戰的目標優先序與閃避預測、`hullResisted()` 不用被減傷的武器打本體與產生器。

---

## 6. 繪製管線

### 6-1 圖層

| 圖層 | 用途 |
|---|---|
| 0 | 一般場景 |
| 2 | 會出現在海面倒影裡的物件（飛機、飛彈） |
| 3 | 體積雲模式下「最後才單獨畫上去」的近處飛機（overlays） |
| 4 | `FX_LAYER`：半透明特效（雲之後才畫） |
| 6 | `DEPTH_OWN_LAYER` |
| 7 | `WAKE_DEPTH_LAYER`（ANZU 雲頂尾流的深度） |
| 29 | `FRONT_LAYER`：迷彩用的「前景不透明度」繪製 |
| 30 | `CRISP_LAYER`：ANZU 的清晰繪製（不被雲的半解析度合成弄糊） |
| 31 | 命中判定用的粗略外形（proxy，不畫） |

### 6-2 體積雲模式的一幀（`VolumetricSky.render`）

1. 後製管線（EffectComposer）：不透明場景 → 體積雲 → 大氣合成。雲依「場景深度」決定蓋在哪裡：沒寫深度的像素，雲當作背景很遠、整片蓋上去。ANZU 的材質在這一段 `colorWrite`／`depthWrite` 關掉（陰影圖照樣有它）。
2. ANZU 清晰繪製（緊接在後製管線之後）：先把畫面複製成 `tCrispBg`，在 `CRISP_LAYER` 依前方的雲量混合背景（`patchCrispMaterial`），所以雲在 ANZU 前面時照樣遮住它，邊緣不馬賽克。
3. 只寫深度的補畫（`scene.overrideMaterial`，統一替代材質，不做透明裁切）；任何留在圖層 0 的物件都會把整個外形（看板就是整個方形）寫進深度。
4. 近處飛機（圖層 3、各槽位圖層）。
5. 半透明特效（`FX_LAYER`）：用 `FX_CLOUD`（`tCloudOv` 雲量、`tCloudDV` 雲的距離）自己算被雲遮多少、遠處霧化。
6. PostFX（震波折射、迷彩、速度線）。

**規則（新增任何會畫在畫面上的東西都要檢查）**
- 半透明或加色混合、不寫深度的東西（Mesh、Points、Line、Sprite）一律要進 FX_LAYER，並經過 `patchFxMaterial`。由 `VolumetricSky.adopt()` 自動處理（每 2 幀掃一次場景）；新增物件型別時確認 adopt 的判斷條件有涵蓋它。
- 不要在建立時手動把物件移到 FX_LAYER（一般立體雲模式的鏡頭只看圖層 0，adopt 只在體積雲模式執行）。
- 自訂 ShaderMaterial：直接輸出顯示色彩的，要嘛自己處理 `uLinOut`，要嘛交給 adopt 補線性轉換；已宣告 `uLinOut` 的不要再補（重複宣告會編譯失敗）。
- 會出現在海面倒影的物件開圖層 2；不該出現的加進 `scene.userData.mirrorHide`。
- 自訂著色器的海面、地形不會自動吃到場景點光源；需要時用 `SeaLights.registerSeaLight`。
- 光源數量固定（開機時就加好，強度 0 時不移除），否則所有材質重新編譯。
- 遠處的細節要依 `dFdx/dFdy` 做頻寬限制，避免閃爍與摩爾紋。
- 改完：體積雲與一般立體雲兩種模式各看一次；看物件在雲前、背景是遠處雲層與海面交界的畫面有沒有方形、被切、被吃掉；主控台不能有 Shader Error。

### 6-3 光學迷彩（ANZU）

- `StingrayView.renderMask`：把 ANZU 畫進 `maskRT`（MSAA 4 倍），rg = 螢幕空間法線、b = 輪廓、a = 覆蓋率（MSAA 預乘，PostFX 再除回來）。**不要開 scissor**：MSAA 解析時被 scissor 限制會留下上一幀的殘影（曾造成「一塊透明的 ANZU」）。
- `renderFront`：在 `FRONT_LAYER` 畫「ANZU 前面的東西有多不透明」（`frontRT`）。每個材質有一份 op 版本（`opOf()`：著色器尾端加 `azrOp`；加色混合用亮度 `smoothstep(0.8,2.5)`、一般與預乘用 alpha `smoothstep(0.25,0.85)`；內建材質用通用著色器並以 `opSync` 同步參數；Points／Sprite 不算）。排除 CloudWake 與 `frontExclude`（ANZU 自己的噴霧）。
- PostFX 讀 `tCloak`／`tCkFront`：背景沿法線推開、流動波紋；前景蓋住多少就少扭曲多少；被推過來的來源像素是前景也一樣處理；`cloudOcc()` 處理雲在前面的情況。
- `warmMask()` 在主場景裡把 op 版本編譯好（暫時打開物件與祖先的 visible，**不要搬動父節點**：搬了會觸發 ANZU 尾焰重建與遲到編譯）。

### 6-4 PostFX

- 震波：每個震波 = 畫面中心、半徑、強度；核爆的球殼投影成橢圓、地面以下切掉；自機與遮擋物不被扭曲（依深度與遮擋清單 `setOccluders`）。
- 光束的熱擾動段（`uH`／`uHW`）。
- 速度線：消失點跟著前進方向。

### 6-5 海面與倒影

- Three.js Water＋自己的鏡像鏡頭（`renderMirror`，只拍圖層 2），海面著色器用世界座標投影回鏡像畫面取色。倒影不加霧，但不要把 `scene.fog` 換成 null（會讓所有材質重組著色器識別字串、定期卡頓）。

### 6-6 其他

- 陰影：太陽陰影跟著玩家約 360 m 見方；遠處的影子由 `Shadows.ts`（PlanarShadows）投到海、地、雲頂、甲板。
- 環境貼圖：CPU 算等距長方投影的天空（RGBE），PMREM 模糊，只在換天氣時重算。
- 場景的 `matrixWorldAutoUpdate` 關掉（`WorldView`），`updateMatrixWorld` 由主迴圈每幀只更新一次（體積雲模式一幀畫十幾次，每次 render 都重算會很貴）。新加的物件若在主迴圈更新之後才移動，要自己 `updateMatrixWorld`。
- `onBeforeCompile` 的 `customProgramCacheKey` 只放原始碼雜湊（整段原始碼放進去會產生大量字串垃圾）。

---

## 7. 天空、日夜、天氣

- `render/AtmosphereCycle.ts`：`WEATHER_TYPES = clear／cloudy／dusk／storm`，天氣轉場 30 秒（`weatherMix`），`setHour`（`hourMix`，非自動 0.5×secondsPerHour、自動推進 1×）、`autoHour`、`autoWeather`（120～220 秒隨機換）、`solarLighting(hour)`（緯度 24°，回傳太陽方向、daylight、direct、warm）。
- `WorldView.transitionWeather(from, to, mix, hour, solarMix)`：混合兩組 `WEATHER` 預設（天空頂／地平線／底、海、霧、太陽仰角方位與顏色強度、環境光、雨），夜晚混向夜色；設定 `NIGHT_SKY` uniform（月亮方向 = 時刻 +11.1 小時的太陽位置、星空旋轉、夜晚量、清晰度依天氣）。
- `render/NightSky.ts`：ESO 銀河全景貼圖（`assets/sky/milky-way-eso.webp`，依銀河座標貼）＋程式產生的星點＋月亮（圓盤、受光、月海）。GLSL 片段 `NIGHT_SKY_GLSL` 注入天空著色器。
- 體積雲的天氣參數 `VOL_WEATHER`（雲底、雲頂、雲塔、覆蓋率、密度、霧、大氣、天光…）。**光線參數由使用者用 F8 面板調好後貼回來寫進預設值，不要自己改。**
- 天氣的中文名稱只有一份：`data/roster.ts` 的 `WEATHERS`（clear 晴朗、cloudy 多雲、dusk 黃昏、storm 陰雨）。編成畫面、時間與天氣面板、F8 面板都用它，不要另寫一份。
- **第二關不覆寫天氣**：就是所選天氣本身（預設陰雨，可以改）；`setWeather` 的 `deck` 參數已不使用。ANZU 的雲頂 V 字尾流貼在當下實際的雲頂：`StingrayView.WAKE_TOP`，主程式每幀由 `WorldView.cloudTop` 填入（體積雲模式＝`volTop`，否則＝立體雲 `layerTop`）。第二關高度配合陰雨雲頂 11,000 ft：出發 12,500 ft、ANZU 搜索 10,800 ft（`path.alt`）、Boss 戰 13,900 ft（`path.bossAlt`）、僚機前往失聯點 11,500 ft。參數存檔升級 `s2ver` 14 清掉瀏覽器裡存的舊 `path.alt`／`path.bossAlt`。
- 雨：`render/Rain.ts`，雨絲方向依飛機速度向量（墜機時依鏡頭）。

---

## 8. 讀取與預熱（最容易出錯的地方）

**原則：讀取畫面要把這一關會出現的所有東西載入並預熱，遊戲開始後不能有任何東西是「第一次出現才建立、才編譯」。** 新增任何會畫在畫面上的東西時，同時決定它在讀取時怎麼先建好。

`Game.launchNow()` 的流程：
1. 建 Sim、`view.begin(sim)`（建好所有現有飛機的模型、音速錐、電漿殼）、`syncVol()`、`vol.adopt()`。
2. **之後才出場的東西**：`_warmGrp`（編成裡每一種「機種＋塗裝＋陣營」各一份、UAV、RAVEN、特殊兵裝的友軍 UAV、兩份飛彈模型）；`view.fillPool(UAV_DEF, 'enemy', n)`（第二關整場會放出的無人機，n = phase1＋waves＋phase3＋phase4 = 80，放出時 `GameView.takePooled` 直接拿）。
3. 蓋上讀取畫面，等兩格讓它真的畫出來，`warmScene()`（`renderer.compile` 全場景）。
4. `releaseUploadedImages`（貼圖上傳後釋放原圖）、`prepareMask`（HUD 機體圖示）、`releaseGeometries`、`releaseTextures`。
5. `radio.prepareMission(['M2-'] 或 ['SCN-','M1-'])`：把這一關的劇情語音（與 WN）全部解碼並釘住。
6. `fxWarm` 幀（畫面全黑、模擬不前進）：`emitAllFx` 在鏡頭前放一次所有特效；每幀把 `_warmAc`（現有機型、之後的機型、UAV 池）放在鏡頭前用實際管線畫（每格 `MAX_OVERLAYS-1` 架）；`warmMask`；第一格把 ANZU 放在鏡頭前 2.5 km 畫一次。結束時隱藏 UAV 池、移除 `_warmGrp`、`clearWarm()`。

**注意事項**
- `renderer.compile(scene, cam)` 只編譯 `traverseVisible` 走得到的物件；著色器識別字串包含 `shadowMapEnabled` 等場景狀態，所以要在主場景編譯，不能用另一個暫時場景。
- 預熱時不要改父節點（reparent）；要用的話暫時打開 visible 再還原。
- 驗收：`lateCompileCheck`（`window.__lateCompiles`、主控台 `[late-compile]`）必須是零；`core/StallWatch.ts` 記錄超過 50 ms 的卡頓（`window.__stalls`、`[stall]`，附上那兩格發生的事）。

---

## 9. 參數系統（Tuning）

- `core/Tuning.ts`：`tuningSections(settings)` 列出所有可調項目（分類 → 項目 → 欄位 `path`），`obj` 指向實際的資料物件（`COMMON`、`AIRCRAFT`、`WEAPONS`、`GUN`、AI 群組、`STINGRAY`…）。`collectTuning` 收集成快照、`applyTuning` 套用。
- 啟動：`TuningStore.init` 先套用 `data/default-tuning.json`（雷達與音量除外，那兩項只作為「還原預設」的目標）→ 記下 DEFAULTS → 再套用使用者存的 `localStorage['azr.tuning.v4']`。
- **使用者瀏覽器存的參數會蓋掉程式預設**。改預設值時：更新 `default-tuning.json`；如果需要覆蓋使用者已存的舊值，加遷移：`azr.tuning.s2ver`（目前 14）、`wver`、`rver`，只刪那幾個欄位一次。
- 參數面板（F2）即時生效；有些（部件耐久、彈量）下次出擊生效。

## 10. 其他持久化

| 鍵 | 內容 |
|---|---|
| `acx.settings.v1` | 使用者設定（`setVer` 411、`mixVer` 4、`radarVer` 3 的升級遷移在 `loadSettings`） |
| `acx.roster.v4` | 編成 |
| `azr.tuning.v4`（＋ `s2ver`／`wver`／`rver`） | 參數 |
| `azr.mission.v1` | 匯入的任務腳本 |
| `azure.volTune.v1` | 雲的光線（F8） |
| `azr.cloudPerf` | 雲的效能設定 |
| `azr.salvagePref` | SALVAGE 的補給選擇 |
| `azure-requiem-gpu-signature` | 預熱用的顯示卡簽章 |
| Cache Storage | 模型、音效包、語音包、配樂 |

---

## 11. 無線電與語音工作室

- 台詞：`data/radio-lines.json`（`{ "M2-10108": { w: "AW", en, zh } }`）。說話者代號 `w`：AW Spoiler、J2 Bishop、J3 King、J4 Vesper、TY Tyrant、CB Cerberus、RV RAVEN 1、LG LUGAL、FC 火控官、WN 警告系統。
- 錄音檔名：`前綴_編號[_段號].mp3`，前綴 AWACS／BISHOP／KING／VESPER／TYRANT／CERBERUS／RAVEN／LUGAL／FIRECONTROL／WARNING。分段規則 `splitLine(en, zh)`（英中句數相同才逐句對應，太短的相鄰句合併）；`voiceFile(w, id, i, n)`。
- 錄音用清單：`lines.json`（`{cast, lines:[{id,w,en,zh,parts:[{file,en,zh}]}]}`），改了台詞就重新產生（產生器把 radio-lines.json 經 `splitLine`／`voiceFile` 轉出）並交給使用者與語音工作室。
- 解碼策略：開網頁時解碼常駐的通用台詞與 WN；劇情一次性台詞（`M1-`／`M2-`／`SCN-`）在讀取畫面 `prepareMission` 解碼並釘住整場；換關時釋放上一關的。
- **語音工作室**（另一個交付物，完整安裝包交給使用者；原始檔在工作區 `/home/claude/vs/pkg_lumen`）：`studio.py`（本機伺服器）＋`studio.html`（介面）＋`pack_voice.py`（打包，背景執行、`/api/pack/status` 回報進度）。英文 Piper（長句以 90 字分段送 Piper，避免 ONNX 記憶體錯誤）、中文 BreezyVoice／BlueMagpie（各自的 venv 與背景程序）。mp3 位元率 64～320 kbps 可選（22.05 kHz 選 192 以上時先升到 44.1 kHz）。一律交「完整的全新安裝包」。

## 12. 配樂與音效

- `audio/Music.ts`：`MUSIC_FILES`、`MUSIC_CUES`、交叉淡換、交替循環（剩 4 秒換）、`onCueEnd`、`setDuck`（劇情台詞時壓低）、`fullTarget`（墜機動畫 1.0）。換曲時機在 Director（D01，依 mission-script 的 music 欄位）與 Stingray（D02）。
- `audio/Audio.ts`：CC0 取樣、距離衰減表、單發音效匯流排（`stopAll` 換整條；`cutSfx` 只換單發、不動循環音）、循環音（引擎、風、後燃器、警報、TLS）、自訂音效（IndexedDB／檔名自動對應）、`playVoice`（語音直接進壓縮器）、`radioStatic`。Web Audio 的 BufferSource 只能 start 一次，續播要從原位置建新來源。
- `input/Haptics.ts`：WebHID 輸出報告（依 Linux hid-playstation 驅動格式，47 位元組）、扳機效果（Nielk1 TriggerEffectGenerator 格式）；USB 與藍牙同時存在時兩個都送；Gamepad API 震動備援。

---

## 13. 測試

### 13-1 Node 無畫面測試

- 測試檔在 `test/`。模擬層不碰 DOM，但部分模組會 import 圖片與二進位資料，所以用 esbuild 打包後跑：

```bash
npx esbuild test/d02auto-test.ts --bundle --platform=node \
  --loader:.glb=binary --loader:.bin=binary --loader:.mp3=base64 \
  --loader:.jpg=dataurl --loader:.png=dataurl --loader:.webp=dataurl \
  --outfile=/tmp/t.cjs && node /tmp/t.cjs
```

- 測試前常見的墊片：`globalThis.Image = class { set src(_){} }`、`globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop(){} }) }) }) }`。
- 常用測試：
  - `d02auto-test`：第二關玩家由 AI 代飛，整關跑到勝利（印出階段、台詞、距離）。補給時要呼叫 `s2.resupplyDone`。
  - `p3seq-test`：40% 奈米修復流程與台詞順序。
  - `beamlock-test`：震盪束鎖定後瞄準點不動、鎖定時間。
  - `cdtime-test`／`cdvoice-test`：倒數語音時間點（後者模擬有錄音的播放長度）。
  - `radarbeam-test`：雷達紅線與畫面光束方向一致。
  - `cdcancel-test`：階段轉換取消震盪束時倒數清掉。
  - `story-test`、`sim-test`、`d01*`、`sw-hit-test`、`uavdoom-test`、`evade*`…
- `Stingray.debugStage('search'|'reveal'|1|2|3|4|'end')` 可以直接跳到某個階段。

### 13-2 瀏覽器測試

- 本機：`/tmp/srv` 放 `index.html` 並用符號連結指向 `dist/assets` 與使用者上傳的 models／music／sound／voice／head；**HTTP 伺服器要和測試在同一個指令裡啟動**（背景程序在指令之間會被砍掉）。
- Playwright＋`/usr/bin/google-chrome`＋`--use-angle=swiftshader --enable-unsafe-swiftshader`。可以抓主控台錯誤、著色器編譯錯誤、`linkProgram` 次數。限制：沒有真正的顯示卡、跑不了體積雲；出擊後遊戲時間在無頭環境不會前進（測不到戰鬥中的畫面與卡頓）。
- **畫面驗證要在使用者電腦上做**：部署資料夾的 `local_server.bat`（http://localhost:8000），用使用者電腦上的內建瀏覽器開 `index.html`，以 `javascript_tool` 操作 `window.__game`、截圖比對。內建瀏覽器窗格跑在 Intel 內顯，遊戲會自動降級（測雲時把 `g.volSlow` 歸零、清掉 `g.volDisabled`）；先 `resize_window` 成 1600×900。前後比較要在同一個時刻來回切換。
- 改到操作（手把、鍵盤、觸控、選單）時，每個方向、每個按鍵、邊界都要實際操作一次（模擬手把：覆寫 `__game.input.pad`，手動 tick）。

### 13-3 除錯掛鉤

- `window.__game`（Game 實例：`sim`、`view`、`radio`、`renderer`、`roster`、`launch()`、`screens`…）、`__debrief`、`__buildModel`、`__uavDef`、`__stalls`、`__lateCompiles`、`__fxTag`、`__assetStats`。
- 除錯面板（`）、參數（F2）、雲的光線（F8）、雲的效能（F9）、效能錄製（暫停選單，JSON schema `azr-perf-1`：summary、marks、frames；CPU 段 input／control／radio／sim.*／camera／view.*／world／cloakMask／render／hud／audio）。

---

## 14. 已知的陷阱（踩過的）

| 現象 | 原因與正確做法 |
|---|---|
| 一塊透明的「鬼影 ANZU」 | MSAA 解析被 scissor 限制。遮罩 RT 不要開 scissor |
| 遊戲中第一次出現某物卡一下 | 沒在讀取時預熱。照第 8 章做；用遲到編譯偵測器驗收 |
| 預熱了還是遲到編譯 | 在暫時場景 compile（識別字串少了陰影等狀態）、或預熱時改了父節點 |
| 迷彩上被特效開出大洞 | 前景遮罩把光暈很大的特效（火、煙池、雲頂尾流）整片算成不透明；用門檻與排除清單 |
| 雲在 ANZU 背後時邊緣馬賽克 | 雲是半解析度合成。ANZU 改在 CRISP 圖層清晰繪製並混合背景 |
| 半透明物件變成一塊方形、被雲吃掉 | 沒有進 FX_LAYER（例如 Sprite 曾被 adopt 漏掉） |
| 定期卡頓（GC） | 每幀產生大量字串（customProgramCacheKey 放整段原始碼、換 scene.fog 物件）、每幀建立閉包 |
| 改了程式預設值沒效果 | 使用者瀏覽器存的 tuning 蓋過去了；改 default-tuning.json 或加遷移 |
| 倒數語音延遲 | WN 台詞排在佇列裡等；現在 WN 一律立刻講、舊的作廢 |
| 雷達紅線和光束對不上 | 畫面與模擬用了不同的算法；兩邊都要用 `beamLineTo` |
| 語音工作室批次卡在 1/N | 新角色沒加進 studio.html 的 DEFAULTS／DATA_PREFIX |
| Piper「Failed to allocate memory」 | 長句一次送太長；以 90 字分段 |
| 頭像在線上版不見 | 只加了外部 PNG、漏了內嵌縮圖 |

---

## 15. 交付清單（每一次）

1. 改 `src/version.ts`。
2. `npx tsc --noEmit`、`npm run build`。
3. 跑相關的 Node 測試；畫面相關的到使用者電腦看。
4. 部署：`dist/index.html` → 部署資料夾 `index.html`（有新圖片素材時連 `dist/assets` 的新檔一起）；`SendUserFile` 給使用者一份。
5. 台詞有變：重新產生 `lines.json` 交給使用者，必要時更新語音工作室安裝包（完整安裝包）。
6. 文件：更新 claude.ai 專案的對應文件，並寫一份到部署資料夾 `docs\`。
7. 用繁體中文回報：做了什麼、實際測了什麼、沒測什麼、哪些是【提案】。

---

## 16. 規格文件在哪裡

| 文件（claude.ai 專案） | 內容 |
|---|---|
| `ANZU設定資料.md`＋`ANZU設定_44.46更新.md` | ANZU 的完整規格與之後的變更 |
| `第二關_40%奈米修復_44.43.md` | 40% 奈米修復橋段 |
| `第二關_發現橋段_44.31.md`、`第二關實作.md`、`第二關劇本草稿_MANTA.md`、`第二關流程與對白.md` | 第二關流程、位置、台詞 |
| `第一關劇本修訂_D01.md` | 第一關完整劇本 |
| `配樂.md` | 配樂規格 |
| `讀取與預熱規則.md` | 讀取與預熱 |
| `命名與呼號.md` | 角色、陣營、台詞寫作原則 |
| `協作規則_設計優先.md` | 決策權與自行加規則的禁令 |
| `打包規則.md` | 交付、部署、驗證、頭像、效能錄製 |
| `語音工具.md` 等 | 語音工作室 |

（注意：舊文件裡的部分數值已被後續版本取代，以程式與 `default-tuning.json` 為準；例如 ANZU 本體 HP 現在 6,000、干擾間隔 8～20 秒、震盪束鎖定點已改成「鎖定那一刻目標的位置」、沒有偏移。）
