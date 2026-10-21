# 內建音樂

把你自己做的音樂檔（MP3、FLAC、M4A、OGG、WAV）放進這個資料夾，再寫進 `playlist.json`，
網站開啟時就會自動出現在播放清單裡，所有玩家都聽得到。

```json
[
  { "src": "music/rainy-cafe.mp3", "title": "雨天的咖啡廳" },
  { "src": "music/night-walk.flac", "title": "Night Walk" },
  "music/morning.mp3"
]
```

- `src` 是相對於網站根目錄的路徑，也可以是完整網址。
- 只寫字串時，標題會用檔名。
- 檔案太大會讓網站變慢，GitHub 單一檔案上限是 100 MB，建議 MP3 用 192 kbps 左右。
- 只放你有權利公開的音樂。

玩家自己加入的本機檔案只存在他們的瀏覽器裡（IndexedDB），不會上傳。
