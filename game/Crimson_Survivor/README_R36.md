# R36 Multi Canvas 固定 60 FPS版

基準：R35A Multi Canvas（重新壓力測試平均 114.11 FPS、最低 Sample 56.75 FPS）。

修改：
- 畫面呈現上限固定 60 FPS。
- 所有遊戲邏輯改為固定 60Hz 更新，移動、冷卻、傷害 Tick、Boss 倒數與物理數據維持一致。
- 偶發長幀最多補算 15 個固定步進，避免遊戲時間永久落後。
- 保留原有 Multi Canvas 快取、功能、視覺、操作、武器與數值。
- Boss 長矛改為快取水平原圖，發射時保存實際軌跡角度，繪製時再依該角度旋轉；圖片、速度與碰撞方向一致。
- 效能 Log metadata 新增 targetFps、fixedUpdateHz、fixedUpdateSteps 與 backlog drop 記錄。

替換 game.js 與 game-config.json 後，請完整重新整理頁面。
