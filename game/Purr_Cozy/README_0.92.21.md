# Purr Cozy 0.92.21 — 一次 Git push 更新

## 第一次安裝
完整解壓本包到 Purr_Cozy 根目錄，合併所有子資料夾。version.json 是遊戲必要檔案，不能刪；README_0.92.xx.md 才是可移除的說明文件。

## 每次更新，只做這幾步
1. 修改圖片、程式或內建清單。
2. 雙擊 Update-Game.cmd，確認顯示 READY。
3. 在 Git 工具一次 commit 所有本次遊戲修改，包含 build-manifests 新檔案、resources.json 與 version.json。
4. 一次 push。GitHub Pages 完成這次部署後重新整理遊戲。
不必先推素材再推版號。撤回先前「version.json 最後上傳」的 Git 操作要求；那不適合這個 GitHub Pages 流程。不要手動忽略 build-manifests 資料夾。

## 這次修正
- 真正缺 version.json 時，不再誤報 Python 未安裝。工具優先從該路徑的 Git HEAD 恢復；無 Git 記錄則明確指出缺檔，不猜版號、不印 traceback。
- 版本檔與清單採暫存檔完成後取代，避免寫出半份 JSON。
- 使用 build-manifests/<整包CRC32>.json 固定內容清單，新舊清單不同網址，降低版本檔更新卻取得舊清單的問題。resources.json 保留為可讀副本；遊戲依 version.json 指向的清單讀取。
- CDN 暫時回傳舊檔導致 CRC 不符時，有限次以新查詢網址重試；仍不符會顯示檔名並停止，不使用半套版本。
- 修改內容後總 checksum 自動改變，修圖不必手動增加遊戲版號；功能發布仍可自行編輯 version.json 的 version。
- 音檔不做 checksum，玩家播放清單保存在帳號存檔，內建清單隨程式更新。

GitHub Pages 仍需等待部署完成，push 成功不代表網站瞬間切換。若部署缺少檔案，工具／載入器會報錯；不聲稱能消除所有網路與部署失敗。
包含 0.92.18 之後的必要修正，適用 0.92.18～0.92.20。不清除原存檔、音樂或全部快取。
程式測試與清單校驗已進行，沒有替你執行 commit/push 或真實 Google 雲端寫入。前次瀏覽器啟動遭自動核准審查拒絕，環境不開放所需沙箱核准，尚未完成瀏覽器實測。
