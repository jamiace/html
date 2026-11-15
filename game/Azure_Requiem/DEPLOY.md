# Azure Requiem 部署資料夾結構

把下面這個資料夾整個放到網頁伺服器上，用瀏覽器開啟 `index.html` 即可。

```
azure-requiem/
├─ index.html              遊戲本體（單一檔案：程式、3D 引擎、內建音效、頭像縮圖都在裡面）
├─ head/                   無線電頭像（建議 500×500 的 PNG）
│  ├─ Joker_2.png          Joker 2 Bishop
│  ├─ Joker_3.png          Joker 3 King
│  ├─ Joker_4.png          Joker 4 Vesper
│  ├─ Tyrant.png           Tyrant（暴君）
│  └─ Enemy.png            Cerberus 隊員　← 這張要自己放進來
└─ sound/                  外部音效
   ├─ manifest.json        「音效欄位 → 檔名」對照表
   └─ （你的音效檔）       檔名要和 manifest.json 裡寫的一模一樣
```

交付的 `azure-requiem-deploy.zip` 已經照這個結構放好 `index.html`、四張頭像和 `sound/manifest.json`。你需要自己放進去的是 `head/Enemy.png` 和 `sound/` 裡的音效檔。

## 載入流程

開啟網頁時會先出現載入畫面，顯示「頭像 x/5　音效 y/n」，全部完成後才進主選單。這段期間做的事：

1. 下載 `head/` 的五張頭像。
2. 解碼內建音效。
3. 讀取 `sound/manifest.json`，把裡面列出的音檔全部下載並解碼，放在記憶體裡。
4. 套用你之前在這個瀏覽器用「自訂音效檔」手動匯入的音檔（如果有）。

進入遊戲之後不會再下載任何頭像或音效。網路太慢時最多等 60 秒，之後先進遊戲，沒載到的音效用內建的。

優先順序（後面的蓋過前面的）：內建音效 → `sound/` 資料夾 → 瀏覽器裡手動匯入的音檔。

## 必須透過網頁伺服器開啟

- **直接雙擊 `index.html`（網址是 `file://` 開頭）時，瀏覽器不允許網頁讀取 `sound/` 裡的檔案**，這是瀏覽器的安全限制。此時頭像仍會載入，但音效只會用內建的。
- 本機測試可以在這個資料夾裡執行 `python -m http.server 8000`，再開 `http://localhost:8000/`。
- 部署到 Linux 主機時，資料夾與檔名的大小寫要完全一致：資料夾是小寫的 `head` 和 `sound`。
- 檔名可以有空白、方括號、大括號，遊戲會自動處理網址編碼。若你的主機不接受這類檔名，可以把檔案改成簡單的名字，並同步修改 `manifest.json`。

## 找不到檔案時

| 缺少的檔案 | 結果 |
|---|---|
| `head/Joker_2.png`、`Joker_3.png`、`Joker_4.png`、`Tyrant.png` | 使用內嵌在 `index.html` 裡的縮圖 |
| `head/Enemy.png` | 使用程式畫的紅色預設圖 |
| `sound/manifest.json` | 全部使用內建音效 |
| `manifest.json` 裡列出的某個音檔 | 那一項使用內建音效；沒有內建的就不發聲 |

## sound/manifest.json

格式是一個 JSON 物件，鍵是音效欄位，值是 `sound/` 資料夾裡的檔名。不想替換的欄位直接刪掉那一行即可。下表是所有可用的欄位，以及目前 `manifest.json` 指定的檔名（依你提供的檔案清單對應；我沒有聽過這些檔案，是依檔名判斷用途）。

| 欄位 | 用途 | 目前指定的檔名 |
|---|---|---|
| `engine` | 飛行聲（循環，預設） | `Player_Engine [AircraftEngineType=2722586591] {s} {m}.wav` |
| `engine_fa18` | 飛行聲：F/A-18E／F | `Player_Engine [AircraftEngineType=f18f] {s} {m}.wav` |
| `engine_f14a` | 飛行聲：F-14A | `Player_Engine [AircraftEngineType=f14a] {s} {m}.wav` |
| `engine_f35c` | 飛行聲：F-35C | `Player_Engine [AircraftEngineType=f35c] {s} {m}.wav` |
| `engine_f22a` | 飛行聲：F-22A | `Player_Engine [AircraftEngineType=1925914845] {s} {m}.wav` |
| `engine_su57` | 飛行聲：Su-57 | `Player_Engine [AircraftEngineType=pkfa] {s} {m}.wav` |
| `wind` | 氣流（循環） | （未指定，使用內建） |
| `highG` | High-G 氣流（循環） | `Player_Air_Resistance_HiG.wav` |
| `psmIn` | PSM 進入 | `Player_Air_Resistance_COBRA_In.wav` |
| `ab` | 後燃器（循環） | （未指定，使用內建） |
| `abKick` | 後燃器點燃 | （未指定，使用內建） |
| `gunLoop` | 機砲連射（循環） | （未指定，使用內建） |
| `gunTail` | 機砲收尾 | （未指定，使用內建） |
| `gunBurst` | 遠處機砲 | （未指定，使用內建） |
| `launch` | 飛彈發射 | （未指定，使用內建） |
| `explBig` | 擊墜爆炸 | `EXP_TARGET_Air_NORMAL {r}.wav` |
| `explSmall` | 飛彈空中爆炸 | `EXP_MSL_Air {r}.wav` |
| `explHit` | 飛彈命中目標 | `EXP_MSL_Hit_TARGET {r}.wav` |
| `crash` | 墜毀 | `EXP_CRASH {r}.wav` |
| `hit` | 自機被機砲擊中 | `Player_Damage_Gun {r}.wav` |
| `hitMissile` | 自機被飛彈擊中 | `Player_Damage_Missile [CameraViewType=behind] {r}.wav` |
| `spark` | 機砲命中 | （未指定，使用內建） |
| `flare` | 熱焰彈 | （未指定，使用內建） |
| `lockBeep` | 鎖定中（循環） | （未指定，使用內建） |
| `lockTone` | 鎖定完成（循環） | （未指定，使用內建） |
| `alarm` | 飛彈來襲警報（循環，內建） | （未指定，使用內建） |
| `alertRadar` | 警示音：被雷達照射（短音） | `HUD_MISL_ALERT_RADER_Play.wav` |
| `alertWarn` | 警示音：被鎖定（短音） | `HUD_MISL_ALERT_WARNING_Play.wav` |
| `alertMissile` | 警示音：飛彈來襲（短音） | `HUD_MISL_ALERT_CAUTION_Play.wav` |
| `alertDanger` | 警示音：飛彈逼近（短音） | `HUD_MISL_ALERT_DANGER_Play.wav` |
| `missile` | 飛彈來襲語音 | （未指定，使用內建） |
| `pullUp` | PULL UP 語音 | （未指定，使用內建） |
| `outOfArea` | 離開作戰區警告 | `HUD_ALERT_OUT_OF_AREA_Play.wav` |
| `select` | 切換目標 | `UI_Select_Move.wav` |
| `select2` | 切換兵裝（標準） | `HUD_WEAPON_SELECT_NORMAL {s}.wav` |
| `selectSp` | 切換兵裝（特殊） | `HUD_WEAPON_SELECT_SPECIAL {s}.wav` |
| `empty` | 彈藥用盡 | `HUD_WEAPON_EMPTY.wav` |
| `ready` | 裝填完成 | `HUD_WEAPON_READY.wav` |
| `pass` | 敵機近距離掠過 | `Pass_All [Pass_SoundType=Side] [Pass_AircraftType=Jet_Normal] {r}.wav` |
| `passMissile` | 飛彈掠過 | `Pass_Missile {r}.wav` |
| `radio` | 無線電提示音 | （未指定，使用內建） |
| `pauseOn` | 暫停 | `UI_Pause_On.wav` |
| `pauseOff` | 解除暫停 | `UI_Pause_Off.wav` |
| `uiDecide` | 選單：確定 | `UI_Decide.wav` |
| `uiMove` | 選單：移動 | `UI_3_Cursor_Move_Play.wav` |

說明：

- 飛行聲會依玩家選的機種切換：有該機種的欄位就用它，否則用 `engine`。Su-30SM、Su-35、Su-47 沒有專屬欄位，使用 `engine`。
- `engine_f22a` 和 `engine` 指定的是檔名為數字代號的兩個引擎檔，我無法判斷它們原本是哪個機種，只是暫時這樣分配。
- 四個「警示音（短音）」是很短的單音，遊戲會依威脅程度用不同的間隔重複播放。只要有載入其中任何一個，內建的循環警報就不會再播。
- 循環類的音效（飛行聲、氣流、後燃器、機砲連射、鎖定音）用外部檔案時會原樣循環，檔案本身要能無縫接續。

## 確認有沒有載入成功

- 載入畫面的音效總數會從 22 增加（22 是內建音效的數量，其餘是 `sound/` 資料夾的）。
- 進遊戲後按 F2 → 「音量」分頁 →「自訂音效檔」，成功載入的欄位會標示「自訂」，旁邊可以試聽。
