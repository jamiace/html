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
├─ sound/                  音效（已放好全部內建音效的 WAV，可直接覆蓋替換）
│  ├─ manifest.json        「音效欄位 → 檔名」對照表（使用中）
│  ├─ manifest.ace-pack.json  另一份對照表：搭配你那批遊戲音效使用
│  └─ *.mp3                遊戲中每一個聲音各一個檔案，例如 target_switch.mp3（切換目標）
└─ voice/                  無線電錄音（檔名見錄音稿 RECORDING_SCRIPT.md，不需要對照表）
   └─ （你的錄音檔）       例如 BISHOP_ACK-A01.wav
```

交付的 `azure-requiem-deploy.zip` 已經照這個結構放好 `index.html`、四張頭像、`sound/` 裡的全部內建音效與 `manifest.json`。你需要自己放進去的是 `head/Enemy.png` 和 `voice/` 裡的錄音檔；`sound/` 裡的音效可以直接覆蓋替換。

## 載入流程

開啟網頁時會先出現載入畫面，顯示「頭像 x/5　音效 y/n」，全部完成後才進主選單。這段期間做的事：

1. 下載 `head/` 的五張頭像。
2. 解碼內建音效。
3. 讀取 `sound/manifest.json`，把裡面列出的音檔全部下載並解碼，放在記憶體裡。
4. 套用你之前在這個瀏覽器用「自訂音效檔」手動匯入的音檔（如果有）。
5. 下載並解碼 `voice/` 裡的無線電錄音。有錄音的段落播錄音，沒有的段落繼續用語音合成。

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
| `voice/` 裡的某個錄音檔 | 那一段改用語音合成 |
| `manifest.json` 裡列出的某個音檔 | 那一項使用內建音效；沒有內建的就不發聲 |

## sound/ 資料夾與 manifest.json

遊戲中每一個會發出的聲音，都對應 `sound/` 裡的一個檔案（40 個 MP3），`manifest.json` 指向它們。原本由程式即時產生的聲音（提示音、PULL UP 語音），以及借用其他音效、或把其他音效變速播放的聲音，都已經做成獨立的檔案，可以各自替換。

替換的方法有兩種：

1. **直接覆蓋**：用你的音檔取代同名檔案，不用改 `manifest.json`。
2. **改對照表**：把新檔案放進 `sound/`，再修改 `manifest.json` 裡那一行的檔名。WAV、MP3、OGG 都可以，只要瀏覽器能播。

`manifest.json` 每一行可以只寫檔名，或寫成 `{"file": "檔名", "volume": 0.8}`，`volume` 是這個音效的音量倍率（1 為原樣）。

`manifest.ace-pack.json` 是另一份對照表：你那批遊戲音效有的欄位用那批檔案，其餘用這裡的檔案。要使用它，把那批音檔放進 `sound/`，再把它改名成 `manifest.json` 覆蓋原本的。

### 遊戲中使用的所有音效

| 檔案 | 用途 | 類型 | 欄位 | 原本的來源 | `manifest.ace-pack.json` 改用 |
|---|---|---|---|---|---|
| `flight_engine_loop.mp3` | 飛行聲（循環，預設） | 循環 | `engine` | 內建音檔 | `Player_Engine [AircraftEngineType=2722586591] {s} {m}.wav` |
| `flight_engine_fa18_loop.mp3` | 飛行聲：F/A-18E／F | 循環 | `engine_fa18` | 借用通用飛行聲 | `Player_Engine [AircraftEngineType=f18f] {s} {m}.wav` |
| `flight_engine_f14a_loop.mp3` | 飛行聲：F-14A | 循環 | `engine_f14a` | 借用通用飛行聲 | `Player_Engine [AircraftEngineType=f14a] {s} {m}.wav` |
| `flight_engine_f35c_loop.mp3` | 飛行聲：F-35C | 循環 | `engine_f35c` | 借用通用飛行聲 | `Player_Engine [AircraftEngineType=f35c] {s} {m}.wav` |
| `flight_engine_f22a_loop.mp3` | 飛行聲：F-22A | 循環 | `engine_f22a` | 借用通用飛行聲 | `Player_Engine [AircraftEngineType=1925914845] {s} {m}.wav` |
| `flight_wind_loop.mp3` | 氣流（循環） | 循環 | `wind` | 內建音檔 | — |
| `afterburner_loop.mp3` | 後燃器（循環） | 循環 | `ab` | 內建音檔 | — |
| `afterburner_ignite.mp3` | 後燃器點燃 | 單發 | `abKick` | 內建音檔 | — |
| `gun_fire_loop.mp3` | 機砲連射（循環） | 循環 | `gunLoop` | 內建音檔 | — |
| `gun_fire_tail.mp3` | 機砲收尾 | 單發 | `gunTail` | 內建音檔 | — |
| `gun_distant_burst.mp3` | 遠處機砲 | 單發 | `gunBurst` | 內建音檔 | — |
| `missile_launch.mp3` | 飛彈發射 | 單發 | `launch` | 內建音檔 | — |
| `explosion_kill.mp3` | 擊墜爆炸 | 單發 | `explBig` | 內建音檔 | `EXP_TARGET_Air_NORMAL {r}.wav` |
| `explosion_missile_air.mp3` | 飛彈空中爆炸 | 單發 | `explSmall` | 內建音檔 | `EXP_MSL_Air {r}.wav` |
| `explosion_missile_hit.mp3` | 飛彈命中目標 | 單發 | `explHit` | 借用飛彈空中爆炸 | `EXP_MSL_Hit_TARGET {r}.wav` |
| `explosion_crash.mp3` | 墜毀 | 單發 | `crash` | 借用擊墜爆炸 | `EXP_CRASH {r}.wav` |
| `player_hit_gun.mp3` | 自機被機砲擊中 | 單發 | `hit` | 內建音檔 | `Player_Damage_Gun {r}.wav` |
| `player_hit_missile.mp3` | 自機被飛彈擊中 | 單發 | `hitMissile` | 借用機砲被擊中 | `Player_Damage_Missile [CameraViewType=behind] {r}.wav` |
| `gun_impact.mp3` | 機砲命中 | 單發 | `spark` | 內建音檔 | — |
| `flare.mp3` | 熱焰彈 | 單發 | `flare` | 內建音檔 | — |
| `lock_seeking_loop.mp3` | 鎖定中（循環） | 循環 | `lockBeep` | 內建音檔 | — |
| `lock_locked_loop.mp3` | 鎖定完成（循環） | 循環 | `lockTone` | 內建音檔 | — |
| `missile_alert_loop1.mp3` | 飛彈來襲警報：距離遠（循環） | 循環 | `alarm1` | 由內建警報放慢、降低音調 | — |
| `missile_alert_loop2.mp3` | 飛彈來襲警報：距離中等（循環） | 循環 | `alarm2` | 內建警報原樣 | — |
| `missile_alert_loop3.mp3` | 飛彈來襲警報：距離危急（循環） | 循環 | `alarm3` | 由內建警報加快、提高音調 | — |
| `missile_alert_loop.mp3` | 飛彈來襲警報（三段都沒有檔案時才用） | 循環 | `alarm` | 內建音檔 | — |
| `warning_pull_up.mp3` | PULL UP 語音 | 單發 | `pullUp` | 瀏覽器語音合成 | — |
| `target_switch.mp3` | 切換目標 | 單發 | `select` | 內建音檔 | `UI_Select_Move.wav` |
| `weapon_switch_standard.mp3` | 切換兵裝（標準） | 單發 | `select2` | 內建音檔 | `HUD_WEAPON_SELECT_NORMAL {s}.wav` |
| `weapon_switch_special.mp3` | 切換兵裝（特殊） | 單發 | `selectSp` | 借用切換標準飛彈 | `HUD_WEAPON_SELECT_SPECIAL {s}.wav` |
| `weapon_empty.mp3`（volume 0.2） | 彈藥用盡 | 單發 | `empty` | 程式合成 | `HUD_WEAPON_EMPTY.wav` |
| `other_aircraft_flyby_loop.mp3` | 其他飛機的飛行聲（循環） | 循環 | `jetOther` | 借用後燃器循環音 | — |
| `stall_warning.mp3` | 失速提示音 | 單發 | `stall` | 程式合成 | — |
| `weapon_not_ready.mp3` | 武器尚未就緒 | 單發 | `deny` | 程式合成 | — |
| `warning_chime.mp3` | 警告提示音 | 單發 | `warn` | 程式合成 | — |
| `mission_complete.mp3`（volume 1.6） | 任務成功 | 單發 | `victory` | 程式合成 | — |
| `mission_failed.mp3`（volume 1.6） | 任務失敗 | 單發 | `defeat` | 程式合成 | — |
| `missile_flyby.mp3`（volume 0.625） | 飛彈掠過 | 單發 | `passMissile` | 發射音加速播放 | `Pass_Missile {r}.wav` |
| `radio_click.mp3` | 無線電提示音 | 單發 | `radio` | 內建音檔 | — |
| `ui_click.mp3`（volume 0.175） | 選單：確定 | 單發 | `uiDecide` | 程式合成 | `UI_Decide.wav` |

「原本的來源」欄：「內建音檔」是 CC0 錄音剪輯而成；「程式合成」是遊戲原本即時產生的提示音，已照相同參數算成 WAV；「借用」與「加速播放」是原本直接拿其他音效來用，現在各自複製成獨立檔案。PULL UP 改用公眾領域資料集訓練的女聲語音模型預先合成，不再依賴瀏覽器的語音合成。

### 選用欄位（預設不發聲）

下面這些欄位在遊戲裡有對應的時機，但內建沒有音效，預設是安靜的。想加的話，把音檔放進 `sound/` 並在 `manifest.json` 加一行即可。

| 欄位 | 用途 | 類型 | `manifest.ace-pack.json` 使用 |
|---|---|---|---|
| `engine_su57` | 飛行聲：Su-57 | 循環 | `Player_Engine [AircraftEngineType=pkfa] {s} {m}.wav` |
| `highG` | High-G 氣流（循環） | 循環 | `Player_Air_Resistance_HiG.wav` |
| `psmIn` | PSM 進入 | 單發 | `Player_Air_Resistance_COBRA_In.wav` |
| `alertRadar` | 警示音：被雷達照射（短音） | 單發 | `HUD_MISL_ALERT_RADER_Play.wav` |
| `alertWarn` | 警示音：被鎖定（短音） | 單發 | `HUD_MISL_ALERT_WARNING_Play.wav` |
| `alertMissile` | 警示音：飛彈來襲（短音） | 單發 | `HUD_MISL_ALERT_CAUTION_Play.wav` |
| `alertDanger` | 警示音：飛彈逼近（短音） | 單發 | `HUD_MISL_ALERT_DANGER_Play.wav` |
| `outOfArea` | 離開作戰區警告 | 單發 | `HUD_ALERT_OUT_OF_AREA_Play.wav` |
| `ready` | 裝填完成 | 單發 | `HUD_WEAPON_READY.wav` |
| `pass` | 敵機近距離掠過 | 單發 | `Pass_All [Pass_SoundType=Side] [Pass_AircraftType=Jet_Normal] {r}.wav` |
| `pauseOn` | 暫停 | 單發 | `UI_Pause_On.wav` |
| `pauseOff` | 解除暫停 | 單發 | `UI_Pause_Off.wav` |
| `uiMove` | 選單：移動 | 單發 | `UI_3_Cursor_Move_Play.wav` |

### 飛彈來襲警報（三段）

有飛彈追你時，依最近一枚飛彈的距離切換三段循環警報，越近越緊張：

| 段 | 距離 | 欄位 | 檔案 |
|---|---|---|---|
| 1 | 約 9,800 ft 以外 | `alarm1` | `missile_alert_loop1.mp3` |
| 2 | 約 4,300～9,800 ft | `alarm2` | `missile_alert_loop2.mp3` |
| 3 | 約 4,300 ft 以內 | `alarm3` | `missile_alert_loop3.mp3` |

- 兩個距離門檻可在參數面板「共通」分頁調整（「飛彈警報第 2 段距離」「第 3 段距離」）。
- 某一段沒有檔案時，改用最接近的另一段；三段都沒有時，才使用單一的 `alarm`。
- 有三段警報時，「警示音（短音）」欄位裡的 `alertMissile`、`alertDanger` 不再用於飛彈來襲；`alertRadar`（被雷達照射）、`alertWarn`（被鎖定）仍照常使用。
- 沒有三段警報、又加入了短音欄位時，維持原本的做法：由短音依距離改變重複的快慢。

### 其他說明

- **循環類**會反覆播放，檔案結尾要能無縫接回開頭。匯出的檔案已經處理好接縫。MP3 編碼器會在頭尾補一小段靜音，遊戲載入時會自動剪掉（最多各 0.08 秒）；若循環時仍聽得到空隙，改用 WAV 或 OGG 最保險。
- **戰鬥音效**（機砲、飛彈、爆炸、撞擊、熱焰彈、其他飛機的飛行聲）另外受設定裡的「戰鬥音效音量」和距離衰減影響；**飛行聲**（引擎、氣流、後燃器）受「飛行音量」影響。
- 飛行聲依玩家選的機種使用對應的檔案；四個機種的檔案目前內容相同，可以個別替換。
- 無線電的人聲不在 `sound/`，而是 `voice/` 資料夾，檔名見錄音稿 `RECORDING_SCRIPT.md`。
- `sound/` 讀不到（例如直接雙擊開啟）或某個檔案缺少時，遊戲改用內嵌在 `index.html` 裡的同一套內建音效，不會沒有聲音。

## 確認有沒有載入成功

- 載入畫面的音效總數會從 25 增加（25 是內建音效的數量，其餘是 `sound/` 資料夾的；使用預設的 `manifest.json` 時是 25 + 40）。
- 進遊戲後按 F2 → 「音量」分頁 →「自訂音效檔」，成功載入的欄位會標示「自訂」，旁邊可以試聽。
