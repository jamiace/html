# 小窩時光 Pocket Nook

![小窩時光遊戲畫面](assets/previews/screenshot.png)

像素風的 Lo-Fi 學習與專注小遊戲：每天複習 20 個高中英文單字，照顧房間裡的貓咪和植物，用番茄鐘專注賺金幣，把小房間佈置成自己喜歡的樣子。

純 HTML、CSS、JavaScript，不需要任何建置工具，放上 GitHub Pages 就能玩。所有家具、角色、寵物和圖示都是像素圖，原始檔在 `assets/sprites/`，可以直接拿去改。

## 功能

### 學習
- **500 個台灣高中程度英文單字**，分基礎（200）、進階（180）、挑戰（120）三個程度，每個字都有詞性和中文。
- **每日任務**：每天複習 20 個字（翻卡片），再做 10 題小測驗，完成後領每日獎勵；連續天數越多，獎勵越多。
- **四種題型**：看英文選中文、看中文選英文、拼字、聽發音選中文（使用瀏覽器內建的語音）。
- **間隔複習**：答對的字隔 1、2、4、7、15 天再出現，答錯的字隔天再考；新字和該複習的字會自動排進每天的 20 個。
- **自由練習**：隨時再練 10 個字，每天最多賺 40 金幣。
- **單字本**：搜尋、依程度和熟練度篩選、聽發音。

### 房間裡的需求
房間裡會不時冒出泡泡，代表有東西需要你：

| 需求 | 需要的道具或行動 |
| --- | --- |
| 貓咪肚子餓（飽足度會隨時間下降） | 貓罐頭，貓咪會走到碗旁邊吃 |
| 貓咪好無聊（心情太低） | 貓薄荷，貓咪會滿屋子跑 |
| 貓咪撒嬌 | 貓零食 |
| 貓咪想被摸摸 | 點牠三下 |
| 貓咪想要坐墊、貓跳台等家具 | 把那件家具擺出來（沒有就去商店買） |
| 植物葉子枯黃 | 植物營養液 |
| 家具積灰塵 | 清潔噴霧 |
| 燈泡燒壞（燈打不開） | 燈泡 |
| 角色肚子餓／想睡 | 飯糰（下一輪專注金幣 +30%）／咖啡（經驗 +30%） |
| 想佈置房間、房間太暗、外面天氣很好 | 擺一件家具、開燈、拉開窗簾 |

道具可以用**複習 5 個單字**換（答對 3 題得 1 個，全對得 2 個），也可以用金幣在商店買。完成需求會得到金幣、經驗，照顧寵物還會增加羈絆。

### 成長與經濟
- **金幣來源**：專注（每分鐘）、完成一輪專注、小測驗、每日任務、全部完成獎勵、需求、成就、待辦、寵物羈絆升級、寵物叼來的禮物、升級禮物、掛機收入。
- **經驗來源**：專注、小測驗、新學會的字、每日任務、需求、成就、待辦。
- **道具來源**：學習換取、商店、每日任務、成就、升級禮物盒、寵物禮物。
- **每日任務**：每天 5 個，固定有「今日單字」和「購買某件家具」，另外 3 個從專注、待辦、需求、餵貓、摸貓、測驗、佈置、練習中隨機抽，全部完成再加碼。
- **成就**：學會單字、精熟單字、連續天數、測驗答對數、專注時數、需求、羈絆、佈置、累積金幣，共 9 種、多個階段；部分階段送限定家具（學霸獎盃、單字達人獎狀）。
- **舒適度**：房間裡擺的東西越多越好，每升一級專注、測驗、任務、需求等金幣收入 +3%（最多 +30%），掛機收入也會增加。
- **寵物羈絆**：摸摸、餵食、陪玩會增加羈絆，升級送金幣和零食，Lv 2 之後寵物偶爾會叼禮物給你。

### 房間與工具

- **番茄鐘**：專注、短休息、長休息。專注時每分鐘賺金幣和經驗，角色會走到書桌前坐下工作，完成一輪還有額外獎勵。
- **升級禮物**：升級時房間裡會掉下禮物盒，點開得到新家具。
- **佈置**：商店、收納箱，近 90 件家具與擺飾，拖曳擺放；小物會自動放上桌面、櫃子和層架，也能翻轉、收起。
- **主題房間**：溫馨小窩、海邊小屋、森林木屋、櫻花和室、雪國閣樓、星空工作室，可以一鍵整套佈置。
- **壁紙、地板、窗景**：14 種壁紙、11 種地板、5 種窗外風景（城市、海邊、森林、櫻花、雪國）。窗外會跟著真實時間變成白天、黃昏、夜晚，也可以下雨。
- **光影**：晚上房間會變暗，立燈、檯燈、串燈、壁爐、行燈、霓虹燈都會發光。
- **音樂播放器**：本機 MP3、FLAC、M4A、OGG、WAV（存在瀏覽器裡，重新整理還在）、YouTube 影片與播放清單、網站內建曲目。播放時房間裡的唱機和喇叭會冒出音符。
- **小工具**：待辦清單、便條紙（電腦版可以釘在畫面上拖著走）。
- **角色與寵物**：4 種髮型、8 種髮色、3 種膚色、8 種上衣、5 種褲子；5 種貓、4 種柴犬。
- **迷你模式**：只留房間和計時器，適合放在螢幕角落。
- **自動存檔**：進度存在瀏覽器裡。

<p>
<img src="assets/previews/theme_seaside.png" width="32%" alt="海邊小屋">
<img src="assets/previews/theme_forest.png" width="32%" alt="森林木屋">
<img src="assets/previews/theme_sakura.png" width="32%" alt="櫻花和室">
<img src="assets/previews/theme_snow.png" width="32%" alt="雪國閣樓">
<img src="assets/previews/theme_studio.png" width="32%" alt="星空工作室">
<img src="assets/previews/theme_cozy_night.png" width="32%" alt="夜晚的溫馨小窩">
</p>

## 在自己電腦上執行

請用本機伺服器開啟（直接雙擊 `index.html` 也能玩，但會改用程式內建的圖，YouTube 也無法播放）：

```bash
# 擇一
python3 -m http.server 8000
npx serve .
```

然後打開 <http://localhost:8000>。

## 發布到 GitHub Pages

1. 在 GitHub 建立一個新的 repository，把這個資料夾的內容推上去：

   ```bash
   git init
   git add .
   git commit -m "小窩時光"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<repo 名稱>.git
   git push -u origin main
   ```

2. 到 repo 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 **Save**。
3. 一兩分鐘後，同一頁會出現網址：`https://<你的帳號>.github.io/<repo 名稱>/`

不需要任何建置步驟，改完檔案推上去就會更新。

## 資料夾結構

```
index.html             進入點
css/style.css          介面樣式（顏色、字型變數都在最上面）
js/
  config.js            執行設定（要不要讀 PNG 圖檔）
  core.js              調色盤、像素畫布、圖片管理
  sprites_items.js     家具、牆面、擺飾（程式繪製版本）
  sprites_themes.js    主題家具與音樂圖示
  sprites_chars.js     角色（髮型、表情、身體）與寵物
  sprites_ui.js        介面圖示與視窗邊框
  catalog.js           物品、壁紙、地板、窗景、主題房間的資料
  vocab.js             500 個單字
  learn.js             單字複習、小測驗、單字本
  life.js              道具、寵物狀態、需求、每日任務、成就、舒適度
  sprites_life.js      道具、需求泡泡、寵物碗、獎盃的像素圖
  engine.js            房間繪製、壁紙地板紋理、窗外景色、光影
  actors.js            角色與寵物的行為
  music.js             音樂播放器
  game.js              遊戲狀態、經濟、番茄鐘、存檔
  ui.js                視窗與各種面板
  sprite-loader.js     讀取 assets/sprites 的 PNG
  main.js              啟動
assets/
  sprites/             所有像素圖 PNG 與 index.json
  palette/             調色盤（.gpl 給 Aseprite、GIMP；.png 色票）
  previews/            主題房間、壁紙、地板、窗景的預覽圖
  fonts/               字型與授權
music/                 內建音樂與 playlist.json
tools/
  sprite-sheet.html    像素圖總覽，可以打包下載
  fetch-fonts.mjs      把中文字型下載到本機
```

## 修改美術

遊戲啟動時會讀取 `assets/sprites/` 的 PNG，取代同名的程式繪製圖，所以用 Aseprite、Photoshop、Piskel 直接編輯這些檔案就好：

- **檔名不要改**，名稱要和 `assets/sprites/index.json` 的清單一致。新增圖檔時也要加進清單。
- 背景保持透明，一格像素就是一個遊戲像素（不要放大後存檔）。
- 尺寸可以改，但家具的檯面、燈光、座位、床位位置寫在 `js/catalog.js`（`surface`、`light`、`seat`、`bed`），尺寸改很多時要一起調整。
- 請用 `assets/palette/pocket-nook.gpl` 的顏色畫。家具換色版（粉紅床、楓紅沙發）、寵物毛色、角色的髮色和衣服都是用調色盤換色，用了調色盤以外的顏色也能顯示，只是那些顏色不會被換掉。
- 角色的頭和身體不用畫外框，組合時會自動加上深色外框（寵物和家具的圖則已經含外框）。角色是拆開組合的：`head_<髮型>_<方向>_<表情>`（髮型 short/bob/bun/long，方向 front/side/back，表情 open/closed/happy）和 `body_<姿勢>_<影格>`。寵物是 `cat_walk0`～`cat_walk3`、`cat_sit0`、`cat_sit1`、`cat_sleep0`、`cat_sleep1`，狗是 `dog_` 開頭。
- 開燈版本（例如 `lamp_floor_on`）和 `desk_white`、`i_next` 這類衍生圖是獨立檔案，改了原圖也要一起改。
- 改完用 `tools/sprite-sheet.html` 檢查（一樣要透過本機伺服器開啟）。

壁紙、地板和窗外景色是程式即時畫出來的紋理，在 `js/engine.js` 的 `WALL`、`FLOOR` 和 `scene*` 函式裡；長相可以看 `assets/previews/`。

想回到程式繪製的版本，把 `js/config.js` 的 `NOOK_USE_PNG_SPRITES` 改成 `false`。

## 換成自己的單字表

單字在 `js/vocab.js`，一行一個字，格式是 `英文|詞性|中文`，用 `#1`、`#2`、`#3` 分程度。照這個格式改或增減就好，數量不限。玩家的學習紀錄是用單字在清單裡的順序記的，已經有人在玩之後，新字請加在最後面。

## 新增家具或主題

在 `js/catalog.js` 的 `ITEMS` 加一筆（每個欄位的說明在檔案開頭），再放一張同名 PNG 到 `assets/sprites/` 並加進 `index.json`。主題房間在同一個檔案的 `THEMES`，`layout` 列出每件家具的位置。房間座標：後牆 x 30–210、y 12–96；地板 y 96–170，越往下越靠近畫面。

## 音樂

- **本機檔案**：在「音樂」視窗按「加入本機音樂」，或把檔案拖進頁面。檔案只存在玩家自己的瀏覽器（IndexedDB），不會上傳到任何地方。
- **YouTube**：貼上影片或播放清單網址。依 YouTube 的使用規定，播放器會以小視窗顯示在畫面上，關掉小視窗就會停止播放。少數影片的上傳者禁止嵌入播放，會自動跳到下一首。
- **網站內建曲目**：把音樂檔放進 `music/`，寫進 `music/playlist.json`，說明在 `music/README.md`。

## 字型

- **Pixelify Sans**（英文）與 **Silkscreen**（數字）已附在 `assets/fonts/`，SIL Open Font License 1.1。
- **LXGW WenKai TC 霞鶩文楷**（中文）預設從 Google Fonts 載入。想完全自架，在專案根目錄執行：

  ```bash
  node tools/fetch-fonts.mjs
  ```

  需要 Node.js 18 以上。腳本會把字型下載到 `assets/fonts/wenkai/`，並把 `assets/fonts/fonts.css` 改成讀本機檔案，之後一起 commit 即可。

## 存檔

遊戲進度（包含每個單字的學習紀錄）存在瀏覽器的 localStorage，本機音樂檔存在 IndexedDB。換瀏覽器、使用無痕視窗或清除網站資料，就會從頭開始。

## 和 Claude 版本的差異

「一起專注」（看到同時開著頁面的朋友走進房間）用的是 Claude 頁面提供的即時連線，這個獨立版本沒有伺服器，所以拿掉了那個按鈕。想加回來，可以接 Firebase、Supabase 這類即時資料庫，把 `js/game.js` 裡的 `Cowork` 改成使用它們的 presence 功能。

## 授權

- 程式碼與像素美術：MIT，見 [LICENSE](LICENSE)。
- Pixelify Sans、Silkscreen、LXGW WenKai TC：SIL Open Font License 1.1，授權檔在 `assets/fonts/`。
