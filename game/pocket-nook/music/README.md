# 內建音樂

把你自己做的音樂檔（MP3、FLAC、M4A、OGG、WAV）放進這個資料夾，再寫進 `playlist.json`，
網站開啟時就會出現在「音樂」視窗的「內建音樂」分頁，所有玩家都聽得到。
想直接用 Google 雲端硬碟資料夾，或用工具從雲端硬碟一次下載，見專案根目錄 README 的「音樂」一節。

```json
[
  { "src": "music/rainy-cafe.mp3", "title": "雨天的咖啡廳", "album": "雨天" },
  { "src": "music/night-walk.flac", "title": "Night Walk" },
  "music/morning.mp3"
]
```

- `src` 是相對於網站根目錄的路徑，也可以是完整網址。
- `album` 是分類名稱（選填），同一個分類的歌會排在一起，可以整個分類播放。
- `drive` 是雲端硬碟的檔案 ID（選填），`tools/fetch-drive-music.mjs` 會自動填；有填的話，同一首就不會再從雲端硬碟串流。
- 只寫字串時，標題會用檔名。
- 檔案太大會讓網站變慢，GitHub 單一檔案上限是 100 MB，建議 MP3 用 192 kbps 左右。
- 只放你有權利公開的音樂。

玩家自己加入的本機檔案只存在他們的瀏覽器裡（IndexedDB），不會上傳。
