# 《深紅倖存者》R33：真實 FPS 與可匯出效能 Log

## 修正原因

R32 Profiler 的 `Frame` 是從開始執行 `update()` 到完成 `draw()` 的 JavaScript 工作時間，並不是兩張實際畫面之間的間隔。

例如畫面顯示：

```text
Frame 1.80ms
FPS 556
```

原本的 FPS 是用 `1000 / 1.80` 反推理論工作吞吐量。Canvas 指令提交後的瀏覽器合成、GPU、VSync、GC、其他主執行緒工作與作業系統排程不在 1.80ms 內，所以這個數字不能代表玩家實際看到的 FPS。

R33 改為使用相鄰兩次 `requestAnimationFrame` callback timestamp 的真實間隔：

```text
實際 FPS = 取樣期間的畫面幀數 / 真實經過時間
Frame Time = 相鄰兩次 requestAnimationFrame 的時間差
```

如果實際只有 25 FPS，應接近：

```text
實際 FPS 25
Frame 40ms
```

## 新 Profiler 資訊

- 實際 FPS
- 1% Low FPS（由 Frame P99 換算）
- Frame 平均、P95、P99、最大值
- JS Work 平均、P95、P99、最大值
- `Frame-JS`：真實 Frame Time 減去已監測的遊戲 JS Work
- JS 使用比例
- Update 與 Draw（JS 指令提交）分段成本
- 敵人、Grid、武器、排程、玩家彈碰撞、敵方彈、特殊武器、EXP／粒子成本
- 各類繪製成本
- 超過 17.5、25、33.34、50、100ms 的長幀數量
- 因 `maxDeltaSeconds` 而被截斷的模擬幀數
- 平均物件數、Grid Query、候選碰撞數、DrawImage 與 Cache 數量

`Frame-JS` 可能包含：

- VSync／顯示器等待
- Canvas 2D GPU 或軟體光柵化
- 瀏覽器合成
- Garbage Collection
- 瀏覽器其他主執行緒工作
- 作業系統排程
- 尚未包進分段 Profiler 的 JavaScript

Canvas 2D 的部分實際繪製可能延後到 JavaScript callback 結束後才執行，因此 `Draw(JS提交)` 很低而真實 FPS 很低時，`Frame-JS` 會特別重要。

## 如何錄製 Log

1. 開始遊戲。
2. 按 `ESC` 暫停。
3. 按下「效能記錄：開始」。
4. 可同時開啟「效能監測」，但不是必要條件。
5. 繼續遊戲，重現卡頓場景。
6. 再次暫停。
7. 按下「效能記錄：錄製中」停止錄製。
8. 按下「下載效能 Log（JSON）」。

遊戲結束時，如果 Log 仍在錄製，系統會自動停止，並在結算畫面加入「下載效能 Log（JSON）」按鈕。

## 建議錄製方式

不要只錄一兩秒。建議涵蓋：

- 一段正常流暢場景
- 開始下降到 30 FPS 左右的場景
- 最嚴重的 11～20 FPS 場景
- Boss 戰與大量招喚怪物
- 多種滿級武器同時運作

錄製 30 秒到數分鐘即可。完整一局也可，預設最多保留 7,200 筆每秒取樣，約兩小時。

## JSON 內容

### metadata

包含遊戲版本、設定版本、瀏覽器、CPU 邏輯核心數、裝置記憶體、視窗大小、DPR、Canvas 實際像素與監測門檻。

### summary

包含整段記錄的：

- 真實平均 FPS
- 最低一秒 FPS
- 最大 Frame Time
- 最大 P99 Frame Time
- 平均 JS Work
- 平均 Frame-JS
- 各級長幀總數
- 最大敵人、玩家彈、敵方彈、粒子與武器 FX 數量
- 最慢的 20 個取樣區段

### samples

每秒一筆，包含：

- 遊戲時間與階段
- FPS、Frame P50／P95／P99／Max
- JS Work P95／P99／Max
- Frame-JS
- 所有分段程式耗時
- Grid Query／候選物件／DrawImage
- 各物件平均與最高數量
- 武器與永久能力配置
- JavaScript Heap（Chrome 可用時）

### events

包含：

- 開始／停止錄製
- 超過 50ms 的個別嚴重長幀
- Chrome Long Task API 偵測到的 50ms 以上主執行緒工作
- 分頁隱藏、恢復或長時間 rAF 中斷

## 初步判讀方式

### Frame 很高，JS Work 也很高

遊戲 JavaScript／Canvas 指令提交是主要瓶頸。再看 Update、Draw 與各子項即可定位。

### Frame 很高，但 JS Work 很低，Frame-JS 很高

問題更可能位於 Canvas 實際光柵化、GPU／瀏覽器合成、硬體加速、VSync、GC、其他瀏覽器工作或系統排程。

### `browser_long_task` 很多

表示瀏覽器主執行緒存在 50ms 以上的長工作。事件會記錄發生時間與長度。

### FPS 和物件數高度同步下降

可由 samples 對照 enemies、playerProjectiles、enemyShots、particles、weaponFx 與各系統時間，判斷是哪類物件造成成本增長。
