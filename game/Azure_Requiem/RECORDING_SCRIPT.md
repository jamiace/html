# Azure Requiem 無線電錄音稿

遊戲裡每一段會播出的語音都列在這裡，每段對應一個錄音檔名。把錄好的檔案放進遊戲資料夾的 `voice/`，遊戲就會播放你的錄音；沒有錄音的段落會繼續使用語音合成，所以可以分批錄、分批放。

共 **154 個檔案**：

| 發話者 | 檔名前綴 | 檔案數 |
|---|---|---|
| AWACS（預警機管制員） | `AWACS_` | 46 |
| Joker 2 Bishop | `BISHOP_` | 27 |
| Joker 3 King | `KING_` | 21 |
| Joker 4 Vesper | `VESPER_` | 25 |
| Tyrant（暴君） | `TYRANT_` | 27 |
| Cerberus 隊員 | `CERBERUS_` | 7 |
| 機上警告（女聲） | `WARN_` | 1 |

另附 `azure-requiem-recording-script.csv`，內容相同，可以用試算表開啟或匯入錄音軟體。

## 檔名規則

- 格式是「發話者_台詞編號.wav」，例如 `BISHOP_ACK-A01.wav`。
- 較長的台詞在遊戲裡會分成幾段顯示字幕，每段各錄一個檔案，檔名後面加 `_1`、`_2`，例如 `TYRANT_TYR-IN1_1.wav`、`TYRANT_TYR-IN1_2.wav`。每段字幕播完自己的錄音才換下一段，所以字幕和聲音會對得上。
- 檔名大小寫要完全一致，副檔名是小寫的 `.wav`。

## 錄音規格

- WAV，單聲道，44.1 kHz 或 48 kHz，16-bit。
- 頭尾的靜音剪到 0.1 秒以內：遊戲是一段接一段播放，靜音太長會有明顯的空檔。
- 所有檔案的音量盡量一致，峰值約 −3 dBFS。
- 遊戲不會替錄音加任何效果，聽到的就是檔案原本的聲音。想要無線電的效果（限頻、雜訊、按鍵音）或暴君的機械感、迴音，請在後製時加好。

## 念法

- 「英文（請照念）」欄已經把數字呼號寫成念法：Joker One、Fox Two、Fox Three。
- 架數是分開錄的（`AWACS_AWX-NUM-04` 到 `AWACS_AWX-NUM-12`），遊戲會接在「Radar contact to the north!」或「New contacts entering…」之後播出，請用自然收尾的語調念，不要像念到一半。
- 同一句台詞有多個人的版本時（例如三名僚機都會替玩家喊 Fox Two），請各自用角色的語氣錄。

## 放到哪裡

```
azure-requiem/
├─ index.html
├─ head/
├─ sound/
└─ voice/
   ├─ AWACS_AWX-OPEN_1.wav
   ├─ BISHOP_ACK-A01.wav
   └─ …
```

錄音檔和頭像、音效一樣，在網頁載入時就全部下載並解碼好，載入畫面會顯示「語音 x/154」。和 `sound/` 一樣，必須透過網頁伺服器開啟才讀得到，直接雙擊 `index.html` 只會用語音合成。

## AWACS（預警機管制員）　（檔名前綴 `AWACS_`）　共 46 個檔案

**語氣：**男聲。冷靜、清楚、中立，像塔台或管制員；緊急狀況才稍微提高音量。

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `AWACS_AWX-OPEN_1.wav` | Joker Flight, this is AWACS. | Joker 小隊，這裡是 AWACS。 | 進入戰場 5 秒後（此時還沒有敵機）（第 1/3 段） |
| `AWACS_AWX-OPEN_2.wav` | The airspace is quiet for now. | 空域目前平靜。 | 進入戰場 5 秒後（此時還沒有敵機）（第 2/3 段） |
| `AWACS_AWX-OPEN_3.wav` | Stay on course and keep your eyes open. | 保持航向，提高警覺。 | 進入戰場 5 秒後（此時還沒有敵機）（第 3/3 段） |
| `AWACS_AWX-CONTACT-N.wav` | Radar contact to the north! | 雷達接觸，北方！ | 第一波出現約 1 秒後，敵機在北方時（接著播架數） |
| `AWACS_AWX-CONTACT-E.wav` | Radar contact to the east! | 雷達接觸，東方！ | 第一波出現約 1 秒後，敵機在東方時（接著播架數） |
| `AWACS_AWX-CONTACT-S.wav` | Radar contact to the south! | 雷達接觸，南方！ | 第一波出現約 1 秒後，敵機在南方時（接著播架數） |
| `AWACS_AWX-CONTACT-W.wav` | Radar contact to the west! | 雷達接觸，西方！ | 第一波出現約 1 秒後，敵機在西方時（接著播架數） |
| `AWACS_AWX-NUM-04.wav` | Four bandits. | 共 4 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 4 架時 |
| `AWACS_AWX-NUM-05.wav` | Five bandits. | 共 5 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 5 架時 |
| `AWACS_AWX-NUM-06.wav` | Six bandits. | 共 6 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 6 架時 |
| `AWACS_AWX-NUM-07.wav` | Seven bandits. | 共 7 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 7 架時 |
| `AWACS_AWX-NUM-08.wav` | Eight bandits. | 共 8 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 8 架時 |
| `AWACS_AWX-NUM-09.wav` | Nine bandits. | 共 9 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 9 架時 |
| `AWACS_AWX-NUM-10.wav` | Ten bandits. | 共 10 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 10 架時 |
| `AWACS_AWX-NUM-11.wav` | Eleven bandits. | 共 11 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 11 架時 |
| `AWACS_AWX-NUM-12.wav` | Twelve bandits. | 共 12 架敵機。 | 接在「雷達接觸」或「新目標進場」之後，該波有 12 架時 |
| `AWACS_AWX-ENGAGE.wav` | Close the distance and prepare to engage. | 拉近距離，準備接戰。 | 第一波通報的最後一句，接在架數之後 |
| `AWACS_AWX-REINF.wav` | Expect reinforcements. | 預期還有增援。 | 接在接戰指示之後（編成有兩波以上時） |
| `AWACS_AWX-NEW-N.wav` | New contacts entering the combat zone from the north edge. | 新目標由北側邊界進入作戰區。 | 第二波以後由北側邊界進場 3～5 秒後（接著播架數） |
| `AWACS_AWX-NEW-E.wav` | New contacts entering the combat zone from the east edge. | 新目標由東側邊界進入作戰區。 | 第二波以後由東側邊界進場 3～5 秒後（接著播架數） |
| `AWACS_AWX-NEW-S.wav` | New contacts entering the combat zone from the south edge. | 新目標由南側邊界進入作戰區。 | 第二波以後由南側邊界進場 3～5 秒後（接著播架數） |
| `AWACS_AWX-NEW-W.wav` | New contacts entering the combat zone from the west edge. | 新目標由西側邊界進入作戰區。 | 第二波以後由西側邊界進場 3～5 秒後（接著播架數） |
| `AWACS_MIS-01.wav` | Joker Flight, cleared to engage. | Joker 小隊，准許接戰。 | 第一次有敵機接近到約 30,000 ft 內（與 DET-07 二選一） |
| `AWACS_DET-07.wav` | Hostiles confirmed. Weapons free. | 確認為敵機，允許開火。 | 第一次有敵機接近到約 30,000 ft 內（與 MIS-01 二選一） |
| `AWACS_AWX-CERB.wav` | Warning. Cerberus squadron confirmed. Their lead is the ace known as Tyrant. Stay sharp. | 警告。確認為 Cerberus 中隊，長機是王牌「暴君」。提高警覺。 | 進場的那一波有暴君時，接在進場通報之後 |
| `AWACS_AWX-LAST.wav` | That was the last group. Finish them. | 這是最後一批了。解決他們。 | 最後一波進場時（該波沒有暴君） |
| `AWACS_AWX-OUT_1.wav` | Joker One, you are leaving the combat zone. | Joker 1，你正在離開作戰區。 | 玩家飛出作戰區（第 1/2 段） |
| `AWACS_AWX-OUT_2.wav` | Turn back now. | 立刻折返。 | 玩家飛出作戰區（第 2/2 段） |
| `AWACS_KIL-01.wav` | Joker One, bandit down. | Joker 1，敵機已擊落。 | 玩家擊墜一般敵機，約 1.5 秒後（五句選一） |
| `AWACS_KIL-02.wav` | Splash one. Confirmed kill. | 擊落一架，戰果確認。 | 玩家擊墜一般敵機，約 1.5 秒後（五句選一） |
| `AWACS_KIL-10.wav` | Joker One, ace pilot down. | Joker 1，敵方王牌已擊落。 | 玩家擊墜王牌；或暴君被擊墜之後 |
| `AWACS_KIL-16.wav` | All hostile aircraft in this group eliminated. | 本波敵機全數殲滅。 | 場上敵機清空，而且還有下一波 |
| `AWACS_HIT-01.wav` | Direct hit, Joker One. | 直接命中，Joker 1。 | 玩家的飛彈完全命中（機艙）但未擊墜（50% 機率，二句選一） |
| `AWACS_THR-01.wav` | Joker One, bandit on your six! | Joker 1，敵機在你六點鐘！ | 一架敵機咬住玩家後方（三句選一） |
| `AWACS_THR-05.wav` | Missile warning! Joker One, evade! | 飛彈警報！Joker 1，閃避！ | 一枚飛彈開始追玩家（四句選一） |
| `AWACS_THR-09.wav` | Joker One, deploy countermeasures! | Joker 1，施放反制措施！ | 一枚飛彈開始追玩家（四句選一） |
| `AWACS_THR-12.wav` | Missile defeated. Threat cleared. | 飛彈已脫鎖，威脅解除。 | 玩家甩掉飛彈（70% 機率，二句選一） |
| `AWACS_LCK-05.wav` | Joker One, you've got a shot. | Joker 1，你有射擊機會。 | 玩家取得飛彈鎖定（二句選一） |
| `AWACS_FLT-01.wav` | Joker One, you're taking heavy damage. | Joker 1，你的機體嚴重受損。 | 玩家損傷第一次達到 45% |
| `AWACS_FLT-08.wav` | Warning, Joker One. Airframe damage critical. | 警告，Joker 1，機體損傷已達危急程度。 | 玩家損傷第一次達到 75% |
| `AWACS_FLT-03.wav` | Stall warning! Recover your airspeed! | 失速警報！恢復空速！ | 玩家失速（二句選一） |
| `AWACS_ALL-10.wav` | Joker Two is taking damage! | Joker 2 正在受損！ | Bishop 損傷第一次達到 40%（二句選一） |
| `AWACS_ALL-11.wav` | Joker Three, critical damage! | Joker 3，嚴重受損！ | King 損傷第一次達到 40%（二句選一） |
| `AWACS_ALL-15.wav` | Friendly down. Pilot ejected. | 友機墜落，飛行員已彈射。 | 僚機被擊墜，約 1.2 秒後 |
| `AWACS_MIS-10.wav` | All bandits down. Joker Flight, mission complete. | 敵機全數擊落，Joker 小隊，任務完成。 | 勝利（第一句） |
| `AWACS_MIS-13.wav` | Joker One lost. Mission failed. | Joker 1 遭擊落，任務失敗。 | 玩家被擊墜（第一句） |

## Joker 2 Bishop　（檔名前綴 `BISHOP_`）　共 27 個檔案

**語氣：**男聲。穩重、邏輯清楚、低沉，是小隊裡的大哥。

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `BISHOP_ACK-A01.wav` | Joker Two, wilco. Moving on your target. | Joker 2 收到，前往指定目標。 | ↑ 集中攻擊，玩家有選定目標（三句選一） |
| `BISHOP_ACK-C01.wav` | Copy, Joker One. We have your six. | 收到，Joker 1。我們守住你的後方。 | ↓ 掩護，附近沒有敵機追擊玩家（三句選一） |
| `BISHOP_ACK-C04.wav` | Stay on your heading. We're intercepting. | 保持航向，我們正在攔截。 | ↓ 掩護，有敵機正在追擊玩家（二句選一） |
| `BISHOP_ACK-D01.wav` | Roger. Splitting up to engage. | 收到，分頭接敵。 | ← 自由攻擊，場上有敵機（三句選一） |
| `BISHOP_ACK-S01.wav` | Special weapons authorized. Understood. | 特殊兵裝許可，明白。 | → 開啟特殊兵裝許可（二句選一） |
| `BISHOP_ACK-S04.wav` | Copy. Switching to standard weapons. | 收到，改用一般兵裝。 | → 關閉特殊兵裝許可（二句選一） |
| `BISHOP_FOXP-J2-2.wav` | Joker One, Fox Two! | Joker 1，Fox Two！ | 玩家發射有鎖定的 MSL／MSL_HS／QAAM，僚機代為呼叫（75% 機率，三名僚機選一） |
| `BISHOP_FOXP-J2-3.wav` | Joker One, Fox Three! | Joker 1，Fox Three！ | 玩家發射有鎖定的 4AAM／HVAA，僚機代為呼叫（75% 機率，三名僚機選一） |
| `BISHOP_FIR-04.wav` | Joker Two, Fox Two. | Joker 2，紅外線飛彈發射。 | Bishop 自己發射 MSL／QAAM（60% 機率） |
| `BISHOP_FOXW-J2-3.wav` | Joker Two, Fox Three. | Joker 2，Fox Three。 | Bishop 自己發射 4AAM／HVAA（60% 機率） |
| `BISHOP_KIL-03.wav` | Clean shot, Joker One. | 漂亮的一擊，Joker 1。 | 玩家擊墜一般敵機，約 1.5 秒後（五句選一） |
| `BISHOP_KIL-14.wav` | Joker Two, splash one. | Joker 2，擊落一架。 | Bishop 自己擊墜敵機 |
| `BISHOP_HIT-02.wav` | He's smoking! Keep at it. | 他開始冒煙了！繼續！ | 玩家的飛彈命中機身、機翼或機尾但未擊墜（50% 機率，三句選一） |
| `BISHOP_HIT-05.wav` | That wasn't enough. He's still flying. | 還不夠，他還能飛。 | 玩家的飛彈命中機身、機翼或機尾但未擊墜（50% 機率，三句選一） |
| `BISHOP_THR-02.wav` | He's lining up a shot on you! | 他正在對你瞄準！ | 一架敵機咬住玩家後方（三句選一） |
| `BISHOP_THR-10.wav` | Stay calm. I'll pull him off you. | 穩住，我會把他引開。 | 一架敵機咬住玩家後方（三句選一） |
| `BISHOP_THR-06.wav` | Two missiles tracking you! | 兩枚飛彈正在追你！ | 兩枚以上飛彈同時追玩家 |
| `BISHOP_THR-14.wav` | That was close. Check your aircraft. | 剛才真險，檢查機體狀況。 | 玩家被飛彈擊中，但還沒到重傷門檻（50% 機率） |
| `BISHOP_FLT-02.wav` | You're losing speed. Watch the stall. | 你的速度正在下降，小心失速。 | 玩家失速（二句選一） |
| `BISHOP_FLT-10.wav` | You've recovered. Get your speed back. | 你恢復了，先把速度拉回來。 | 玩家從失速恢復 |
| `BISHOP_FLT-06.wav` | Don't bleed all your speed in the turn. | 別在轉彎時把速度耗光。 | High-G 中速度掉到接近失速 |
| `BISHOP_ALL-01.wav` | Bandit on my six. Need assistance. | 有敵機咬住我，請求支援。 | Bishop 被敵機追到約 3,000 ft 內 |
| `BISHOP_ALL-12.wav` | I can't stay in the fight like this. | 這樣我沒辦法繼續作戰。 | Bishop 損傷第一次達到 40%（二句選一） |
| `BISHOP_MIS-03.wav` | We'll take the first group. Stay together. | 第一波交給我們，保持隊形。 | 接戰許可之後 |
| `BISHOP_MIS-09.wav` | Airspace is almost clear. | 空域快清乾淨了。 | 最後一波只剩 1～2 架 |
| `BISHOP_MIS-14.wav` | Joker One, respond! Joker One! | Joker 1，回答！Joker 1！ | 玩家被擊墜（第二句） |
| `BISHOP_DET-03.wav` | Tally two. They're closing fast. | 目視兩架，正在快速逼近。 | 第二波以後進場，AWACS 通報之後（三句選一；該波沒有暴君） |

## Joker 3 King　（檔名前綴 `KING_`）　共 21 個檔案

**語氣：**男聲。反應快、有情緒、語速快，容易興奮，但不失專業。

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `KING_ACK-A02.wav` | Copy! I'll get on his tail! | 收到！我去咬住他！ | ↑ 集中攻擊，玩家有選定目標（三句選一） |
| `KING_ACK-C02.wav` | Coming in! I'll get them off you! | 我來了！我把他們趕走！ | ↓ 掩護，有敵機正在追擊玩家（二句選一） |
| `KING_ACK-D02.wav` | Finally! My pick, then! | 終於！那我自己選對手啦！ | ← 自由攻擊，場上有敵機（三句選一） |
| `KING_ACK-S02.wav` | Oh, I've been saving these! | 喔，我一直在等這個！ | → 開啟特殊兵裝許可（二句選一） |
| `KING_FOXP-J3-2.wav` | Joker One! Fox Two! | Joker 1！Fox Two！ | 玩家發射有鎖定的 MSL／MSL_HS／QAAM，僚機代為呼叫（75% 機率，三名僚機選一） |
| `KING_FOXP-J3-3.wav` | Joker One! Fox Three! | Joker 1！Fox Three！ | 玩家發射有鎖定的 4AAM／HVAA，僚機代為呼叫（75% 機率，三名僚機選一） |
| `KING_FOXW-J3-2.wav` | Joker Three, Fox Two! | Joker 3，Fox Two！ | King 自己發射 MSL／QAAM（60% 機率） |
| `KING_FIR-05.wav` | Fox Three! Going after the lead! | Fox Three！正在攻擊領頭機！ | King 自己發射 4AAM／HVAA（60% 機率） |
| `KING_KIL-04.wav` | That's one more for you! | 你又擊落一架啦！ | 玩家擊墜一般敵機，約 1.5 秒後（五句選一） |
| `KING_KIL-08.wav` | Two in a row! You're on fire! | 連續兩架！你太猛了！ | 玩家在 14 秒內擊墜第 2 架 |
| `KING_KIL-15.wav` | Got him! He's going down! | 打中了！他墜下去了！ | King 自己擊墜敵機 |
| `KING_HIT-03.wav` | Nice hit, Ace! | 打得好，Ace！ | 玩家的飛彈完全命中（機艙）但未擊墜（50% 機率，二句選一） |
| `KING_THR-07.wav` | They're all over your tail! | 他們全咬住你後方了！ | 兩架以上敵機咬住玩家後方 |
| `KING_THR-03.wav` | Ace, break right! Now! | Ace，立刻往右閃！ | 一枚飛彈開始追玩家（四句選一） |
| `KING_LCK-06.wav` | He's right in front of you, Ace! | Ace，他就在你正前方！ | 玩家取得飛彈鎖定（二句選一） |
| `KING_ACT-C02.wav` | He's off your tail! | 他不再咬住你了！ | 咬住玩家的敵機離開了（60% 機率，二句選一） |
| `KING_FLT-07.wav` | Whoa! That was one hell of a turn! | 哇！那個轉彎真誇張！ | 玩家做出 PSM（過失速機動） |
| `KING_ALL-02.wav` | Ace! I've got someone on my tail! | Ace！有人咬住我了！ | King 被敵機追到約 3,000 ft 內 |
| `KING_ALL-13.wav` | I'm hit! Still flying! | 我中彈了！但還能飛！ | King 損傷第一次達到 40%（二句選一） |
| `KING_MIS-11.wav` | We actually did it! Nice flying, everyone! | 我們真的成功了！大家飛得漂亮！ | 勝利（第二句） |
| `KING_DET-04.wav` | More bandits? Let's go! | 還有敵機？來吧！ | 第二波以後進場，AWACS 通報之後（三句選一；該波沒有暴君） |

## Joker 4 Vesper　（檔名前綴 `VESPER_`）　共 25 個檔案

**語氣：**女聲。話少、乾脆、冷靜，幾乎不帶情緒。

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `VESPER_ACK-A03.wav` | Target copied. Engaging. | 收到目標，開始攻擊。 | ↑ 集中攻擊，玩家有選定目標（三句選一） |
| `VESPER_ACK-A05.wav` | No target designated. | 尚未指定目標。 | ↑ 集中攻擊，但玩家沒有選定目標 |
| `VESPER_ACK-C03.wav` | Cover acknowledged. Moving to your rear. | 收到掩護指令，移往你後方。 | ↓ 掩護，附近沒有敵機追擊玩家（三句選一） |
| `VESPER_ACK-C05.wav` | No immediate threats on your six. | 你後方目前沒有立即威脅。 | ↓ 掩護，附近沒有敵機追擊玩家（三句選一） |
| `VESPER_ACK-D03.wav` | Dispersing. Targets acquired. | 散開中，已取得目標。 | ← 自由攻擊，場上有敵機（三句選一） |
| `VESPER_ACK-D05.wav` | No contacts. Holding patrol pattern. | 沒有敵情，維持巡邏航線。 | ← 自由攻擊，但場上沒有敵機 |
| `VESPER_ACK-S03.wav` | Special weapons on hold. | 特殊兵裝暫停使用。 | → 關閉特殊兵裝許可（二句選一） |
| `VESPER_FOXP-J4-2.wav` | Joker One, Fox Two. | Joker 1，Fox Two。 | 玩家發射有鎖定的 MSL／MSL_HS／QAAM，僚機代為呼叫（75% 機率，三名僚機選一） |
| `VESPER_FOXP-J4-3.wav` | Joker One, Fox Three. | Joker 1，Fox Three。 | 玩家發射有鎖定的 4AAM／HVAA，僚機代為呼叫（75% 機率，三名僚機選一） |
| `VESPER_ACT-A03.wav` | Target locked. Fox Two. | 已鎖定，Fox Two。 | Vesper 自己發射 MSL／QAAM（60% 機率，二句選一） |
| `VESPER_FOXW-J4-2.wav` | Joker Four, Fox Two. | Joker 4，Fox Two。 | Vesper 自己發射 MSL／QAAM（60% 機率，二句選一） |
| `VESPER_FOXW-J4-3.wav` | Fox Three. | Fox Three。 | Vesper 自己發射 4AAM／HVAA（60% 機率） |
| `VESPER_KIL-05.wav` | One bandit down. | 一架敵機被擊落。 | 玩家擊墜一般敵機，約 1.5 秒後（五句選一） |
| `VESPER_KIL-09.wav` | Three confirmed. | 確認三架。 | 玩家在 14 秒內擊墜第 3 架以上 |
| `VESPER_KIL-13.wav` | My kill. Moving to the next. | 我擊落的，轉向下一個。 | Vesper 自己擊墜敵機 |
| `VESPER_HIT-04.wav` | Target damaged. | 目標受損。 | 玩家的飛彈命中機身、機翼或機尾但未擊墜（50% 機率，三句選一） |
| `VESPER_THR-04.wav` | Break left. Missile inbound. | 往左閃，飛彈來襲。 | 一枚飛彈開始追玩家（四句選一） |
| `VESPER_THR-13.wav` | You're clear. Keep flying. | 安全了，繼續飛。 | 玩家甩掉飛彈（70% 機率，二句選一） |
| `VESPER_THR-08.wav` | You're spiked. | 你被雷達照射了。 | 玩家被敵機雷達鎖定，且當下沒有飛彈來襲 |
| `VESPER_ACT-C03.wav` | Your six is clear. | 你的後方已安全。 | 咬住玩家的敵機離開了（60% 機率，二句選一） |
| `VESPER_ACT-C05.wav` | Missile diverted. You're clear. | 飛彈已被引開，你安全了。 | 追玩家的飛彈被熱焰彈誘開（50% 機率） |
| `VESPER_ALL-03.wav` | Defensive. One bandit on me. | 正在防禦，一架敵機追我。 | Vesper 被敵機追到約 3,000 ft 內 |
| `VESPER_ALL-14.wav` | Flight controls damaged. | 飛控受損。 | Vesper 損傷第一次達到 40% |
| `VESPER_MIS-12.wav` | Returning to base. | 準備返航。 | 勝利（第三句） |
| `VESPER_DET-05.wav` | Two contacts. High and fast. | 兩個目標，位置高、速度快。 | 第二波以後進場，AWACS 通報之後（三句選一；該波沒有暴君） |

## Tyrant（暴君）　（檔名前綴 `TYRANT_`）　共 27 個檔案

**語氣：**男聲。極低沉、緩慢、冷血，對一切不屑一顧。可在後製加一點機械感或迴音。

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `TYRANT_TYR-IN1_1.wav` | Joker One. I have heard that name. | Joker 1。我聽過這個名字。 | 暴君所在的那一波進場，AWACS 警告之後（二句選一）（第 1/2 段） |
| `TYRANT_TYR-IN1_2.wav` | Today, I erase it. | 今天，我要把它抹去。 | 暴君所在的那一波進場，AWACS 警告之後（二句選一）（第 2/2 段） |
| `TYRANT_TYR-IN2_1.wav` | This sky belongs to Cerberus. | 這片天空屬於 Cerberus。 | 暴君所在的那一波進場，AWACS 警告之後（二句選一）（第 1/2 段） |
| `TYRANT_TYR-IN2_2.wav` | You are trespassing. | 你們越界了。 | 暴君所在的那一波進場，AWACS 警告之後（二句選一）（第 2/2 段） |
| `TYRANT_TYR-LK1.wav` | I see you. | 我看見你了。 | 暴君咬住玩家後方（三句選一） |
| `TYRANT_TYR-LK2.wav` | Run. It changes nothing. | 逃吧。什麼也改變不了。 | 暴君咬住玩家後方（三句選一） |
| `TYRANT_TYR-LK3.wav` | Your turn is too wide. Predictable. | 你的轉彎太大了。一眼就看穿。 | 暴君咬住玩家後方（三句選一） |
| `TYRANT_TYR-FIRE1.wav` | Fall. | 墜落吧。 | 暴君對玩家發射飛彈（二句選一） |
| `TYRANT_TYR-FIRE2.wav` | Let us see you dodge this one. | 看你怎麼躲這一發。 | 暴君對玩家發射飛彈（二句選一） |
| `TYRANT_TYR-HIT1.wav` | A scratch. Is that all you have? | 擦傷而已。你只有這點本事？ | 暴君被玩家打中（二句選一） |
| `TYRANT_TYR-HIT2.wav` | Good. Finally, someone worth the fuel. | 很好。總算有個值得我耗油的對手。 | 暴君被玩家打中（二句選一） |
| `TYRANT_TYR-HURT.wav` | Interesting. You can make me bleed. | 有意思。你竟然能傷到我。 | 暴君損傷第一次達到 60% |
| `TYRANT_TYR-KILLW.wav` | One less Joker. Who is next? | 少了一張 Joker。下一個是誰？ | 暴君擊墜一架僚機 |
| `TYRANT_TYR-PCRIT.wav` | Your aircraft is dying. Listen to it. | 你的機體正在死去。聽聽它的聲音。 | 暴君把玩家打到損傷 75% 以上 |
| `TYRANT_TYR-TAUNT1.wav` | No orders. No mercy. Only the hunt. | 沒有命令，沒有慈悲。只有狩獵。 | 暴君以玩家為目標時的挑釁（約每 40 秒一次，四句選一） |
| `TYRANT_TYR-TAUNT2.wav` | The sky is always silent before it takes you. | 天空在帶走你之前，總是寂靜的。 | 暴君以玩家為目標時的挑釁（約每 40 秒一次，四句選一） |
| `TYRANT_TYR-TAUNT3_1.wav` | Three heads, one will. | 三個頭，一個意志。 | 暴君以玩家為目標時的挑釁（約每 40 秒一次，四句選一）（第 1/2 段） |
| `TYRANT_TYR-TAUNT3_2.wav` | Cerberus does not let go. | Cerberus 從不鬆口。 | 暴君以玩家為目標時的挑釁（約每 40 秒一次，四句選一）（第 2/2 段） |
| `TYRANT_TYR-EVADE.wav` | Too slow. | 太慢了。 | 暴君以玩家為目標時的挑釁（約每 40 秒一次，四句選一） |
| `TYRANT_TYR-DEAD1.wav` | So this is how the silence sounds. | 原來，寂靜是這樣的聲音。 | 暴君被僚機擊墜 |
| `TYRANT_TYR-DEAD2.wav` | Well flown, Ace. | 飛得漂亮，Ace。 | 暴君被玩家擊墜 |
| `TYRANT_TYR-HEADFALLS.wav` | One head falls. The beast does not notice. | 掉了一顆頭。野獸不會在意。 | Cerberus 隊員被擊墜，約 1.5 秒後（70% 機率） |
| `TYRANT_TYR-REPLY1.wav` | Then you were never worthy of the name. | 那你從來就配不上這個名字。 | 緊接在 CB-PLEA1 之後，不屑地回應 |
| `TYRANT_TYR-REPLY2.wav` | Cover? Cerberus does not carry the weak. | 掩護？Cerberus 不背負弱者。 | 緊接在 CB-PLEA2 之後，不屑地回應 |
| `TYRANT_TYR-REPLY3.wav` | Do not beg on my frequency. | 別在我的頻道上乞求。 | 緊接在 CB-PLEA3 之後，不屑地回應 |
| `TYRANT_TYR-REPLY4.wav` | Good. Hold him still. You make fine bait. | 很好。把他拖住。你是不錯的誘餌。 | 緊接在 CB-PLEA4 之後，不屑地回應 |
| `TYRANT_TYR-REPLY5.wav` | Die quietly. You are disturbing the hunt. | 安靜地死。你打擾到狩獵了。 | 緊接在 CB-PLEA5 之後，不屑地回應 |

## Cerberus 隊員　（檔名前綴 `CERBERUS_`）　共 7 個檔案

**語氣：**男聲。驚慌、急促、聲音偏高，在向長機求救。所有隊員共用同一組錄音。

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `CERBERUS_CB-LEADDOWN.wav` | Lead is down?! That is impossible! | 長機被擊墜了？！不可能！ | 暴君被擊墜，約 1.5 秒後（還有隊員存活時） |
| `CERBERUS_CB-PLEA1_1.wav` | Cerberus Lead, he's on my six! | Cerberus 長機，他咬住我六點鐘了！ | 中彈或被玩家咬住時，向暴君求救（接著播 TYR-REPLY1）（第 1/2 段） |
| `CERBERUS_CB-PLEA1_2.wav` | I can't shake him! | 我甩不掉！ | 中彈或被玩家咬住時，向暴君求救（接著播 TYR-REPLY1）（第 2/2 段） |
| `CERBERUS_CB-PLEA2.wav` | Lead, I'm hit! Requesting cover! | 長機，我中彈了！請求掩護！ | 中彈或被玩家咬住時，向暴君求救（接著播 TYR-REPLY2） |
| `CERBERUS_CB-PLEA3.wav` | Tyrant! Missile on me! Help! | 暴君！飛彈追著我！救我！ | 被我方飛彈追時，向暴君求救（接著播 TYR-REPLY3） |
| `CERBERUS_CB-PLEA4.wav` | Lead, please! I can't hold him off! | 長機，拜託！我擋不住他！ | 中彈或被玩家咬住時，向暴君求救（接著播 TYR-REPLY4） |
| `CERBERUS_CB-PLEA5.wav` | I'm losing control! Tyrant, respond! | 我快失控了！暴君，請回答！ | 中彈或被玩家咬住時，向暴君求救（接著播 TYR-REPLY5） |
## 機上警告

| 檔名 | 英文（請照念） | 中文（參考） | 情境 |
|---|---|---|---|
| `WARN_PULL_UP.wav` | Pull up! | 拉起！ | 離地過低或即將撞地時，每 1.8 秒重複；HUD 同時顯示 PULL UP |

這一句不是無線電，是機上的自動警告，建議用女聲、平板、清楚的語氣。

## 沒有列在這裡的台詞

`data/radio-lines.json` 裡還有 Joker 1（玩家）的台詞，以及劇本中目前沒有接上觸發條件的句子，遊戲不會播出，所以不需要錄。之後若接上新的觸發，我會再補檔名。
