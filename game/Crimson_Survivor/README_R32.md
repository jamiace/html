# 深紅倖存者 R32 效能優化版

本版本以使用者最新提供的 R31 檔案為基準，只調整效能架構與指定視覺項目，未降低敵人、子彈、粒子或武器特效數量。

## 主要修改

### 分段效能監測

暫停畫面新增「效能監測」按鈕。開啟後顯示：

- 平均 FPS、平均幀時間、取樣期間最慢幀
- 敵人更新、敵人 Grid 重建
- 武器、遊戲排程、玩家子彈碰撞、敵方子彈
- 特殊武器、EXP、粒子
- 敵人、玩家子彈、敵方子彈、武器特效、粒子繪製耗時
- 敵人／子彈／粒子數量
- Grid 查詢次數、候選物件數、圖片繪製次數及快取數量

Profiler 關閉時不執行分段 `performance.now()` 計時，避免監測本身持續增加負擔。

### 固定環形 Spatial Grid

- 原本的 `Map` Spatial Hash 改為固定 100 × 100 Cells 的環形 Grid。
- 敵人使用 `enemySpatial`。
- 玩家子彈使用 `projectileSpatial`。
- Grid 以 Generation Stamp 重用固定 Bucket，不需要每幀建立及刪除 Map Entry。

設定位置：

```json
"performance": {
  "spatialCellSize": 128,
  "spatialGridWidth": 100,
  "spatialGridHeight": 100
}
```

### 玩家子彈雙向 Grid 碰撞

流程改為：

1. 更新全部玩家子彈位置。
2. 將玩家子彈放入 `projectileSpatial`。
3. 每隻敵人只查詢附近 Grid Cells 中的子彈。
4. 仍使用原本的圓形精確碰撞、穿透、爆炸與擊退規則。

### 圖片快取

- 玩家子彈拖尾、核心與發光改用圖片快取。
- 敵方子彈本體、旋轉狀態、脈動狀態與拖尾改用圖片快取。
- 一般 Canvas 粒子依顏色與尺寸建立圖片快取。
- 火焰噴射核心預先畫入 OffscreenCanvas；正式繪製只執行 translate、rotate、globalAlpha、drawImage。

### Chain Lightning

每次產生 Chain Lightning 時，預先建立數組隨機雷電路徑。顯示期間只切換預建路徑，不再每幀重新產生亂數及重建節點。

```json
"lightningPathFrames": 5,
"lightningPathFrameRate": 30
```

### 敵人繪製

敵人不再繪製：

- 橢圓地面陰影
- `shadowBlur`
- `shadowColor`

凍結圓環、受傷透明變化、蓄力提示、Boss／巨像 HP 條均保留。

### 武器設定快取

所有武器 Lv.1～Lv.5 設定會在「武器範圍／尺寸永久能力改變時」一次重建。戰鬥迴圈中 `weaponLevelConfig()` 改為直接讀取快取陣列。

### 遊戲內排程

戰鬥中的以下延遲事件已移出瀏覽器 `setTimeout`：

- 雷射標記延遲爆發
- 地雷連鎖引爆

目前由 `game.delayedCasts` 與 `updateDelayedCasts()` 控制，暫停或遊戲結束時會跟著停止／清除。網路逾時、排行榜重試、Toast 移除及音效間隔仍保留瀏覽器計時器，這些不屬於戰鬥模擬。

### 武器索敵距離

武器索敵改為「該武器目前最大射程 × 110%」。

```json
"weaponSearchRangeMultiplier": 1.1
```

例如射程 400 px 的武器，索敵距離為 440 px。武器範圍永久能力提升後，索敵距離也會跟著目前射程更新。

## 已完成檢查

- JavaScript 語法檢查
- JSON 解析及設定值檢查
- 固定 100 × 100 Grid 驗證
- 敵人 Grid／玩家子彈 Grid 驗證
- Chain Lightning 繪製階段無亂數產生驗證
- 敵人繪製無 shadowBlur、shadowColor、橢圓陰影驗證
- 雷射標記／地雷連鎖遊戲內排程驗證
- Headless Chromium 一般遊戲啟動測試
- Headless Chromium：12 種武器 Lv.5、所有永久能力滿級、直接進入 Boss 階段壓力測試
- 瀏覽器測試未發生 JavaScript Runtime Error
