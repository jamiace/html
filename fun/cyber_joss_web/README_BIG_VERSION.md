# 賽博燒金紙 v6：原版 + 放大金紙版

- `index.html`：原本版本，引用 `styles.css`。
- `index_big.html`：放大金紙版本，引用 `styles_big.css`。
- `styles_big.css`：完整複製原本樣式，並在底部加入 `.app-big` 專用覆蓋設定。
- `app.js`：兩個入口共用同一份互動邏輯。
- `service-worker.js`：更新快取為 `cyber-joss-paper-v6-big`，並快取兩個入口。

金紙放大版主要調整位置在 `styles_big.css` 底部的 `BIG PAPER VERSION / index_big.html` 區塊。
