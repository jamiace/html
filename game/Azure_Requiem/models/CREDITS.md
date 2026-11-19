# 機體模型來源與授權

模型取自 Sketchfab，經 `tools/process_models.py` 整理後使用（收起或移除起落架、統一方向與實際尺寸、F-14 主翼與各機型的水平尾翼、方向舵、副翼／襟副翼、鴨翼拆成可動零件、縮小貼圖、移除模型自帶的尾焰與雜物），再用 glTF-Transform 把貼圖轉成 WebP。
第 41.5 版：F/A-18、F-22、F-35、F-14、Su-57 換成新的模型（下表）。

| 檔案 | 機型 | 原始標題 | 作者 | 授權 | 來源 |
|---|---|---|---|---|---|
| fa18.glb | F/A-18 | Boeing F/A-18E/F "Super Hornet" | andertan | CC BY 4.0 | https://sketchfab.com/3d-models/boeing-fa-18ef-super-hornet-f71e9fea01e24fea9b1b380161d21d38 |
| f22.glb | F-22 | Lockheed Martin F-22 "Raptor" | andertan | CC BY 4.0 | https://sketchfab.com/3d-models/lockheed-martin-f-22-raptor-7e7b3c372e374dda98e70208d09cfdcf |
| f35.glb | F-35 | F-35 Lightning II - Fighter Jet - Free | bohmerang | CC BY-NC-SA 4.0 | https://sketchfab.com/3d-models/f-35-lightning-ii-fighter-jet-free-b1ab1c0090e34b0fbfe667e706023e6d |
| f14.glb | F-14 | F14 | manilov.ap | CC BY 4.0 | https://sketchfab.com/3d-models/f14-af915a32b088402f8b22e31f93af09af |
| su30.glb | Su-30 | Low poly SU-30 | SIpriv | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-su-30-cb1bde686aab4adb94765dab7c11dc15 |
| su35.glb | Su-35 | Sukhoi Su-35 Flanker-E | andertan | CC BY 4.0 | https://sketchfab.com/3d-models/sukhoi-su-35-flanker-e-35-c98cf9b3b3e04017a04732798a31888a |
| su47.glb | Su-47 | Low poly SU-47 | SIpriv | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-su-47-cd6b863e879a4edd92b24faeb30a56da |
| su57.glb | Su-57 | Sukhoi Su-57 Felon (P) - Fighter Jet - Free | bohmerang | CC BY-NC-SA 4.0 | https://sketchfab.com/3d-models/sukhoi-su-57-felon-p-fighter-jet-free-31127bc63bc048debb694aa88bbaafae |

- CC BY 4.0（https://creativecommons.org/licenses/by/4.0/）：可使用與修改（含商業用途），需標示作者。遊戲主選單已列出作者。
- CC BY-NC-SA 4.0（https://creativecommons.org/licenses/by-nc-sa/4.0/）：需標示作者、**不可用於商業用途**、改作後的模型檔（這裡的 f35.glb、su57.glb）也要用相同授權釋出。
  目前這個專案是非商業的內部試驗，可以使用；日後如果遊戲要販售或用於商業用途，請先把 F-35 與 Su-57 換成允許商業使用的模型。
- 第 41.5 版起不再使用 Sketchfab Standard 授權的模型（舊的 F-22 已換掉），模型檔可以隨遊戲一起散布。

## 飛彈、艦艇與地面防空（第 41.6 版）

用 `tools/process_props.py` 整理（合併網格、統一方向、縮放到實際尺寸、原點放在底部或吃水線、縮小貼圖），再轉 WebP 貼圖。

| 檔案 | 用途 | 原始標題 | 作者 | 授權 | 來源 |
|---|---|---|---|---|---|
| aim9.glb | 所有飛彈（SAM 放大 1.3 倍） | AIM-9 Missile | RickSlash | CC BY 4.0 | https://sketchfab.com/3d-models/aim-9-missile-caaf15b49bac4144b6c6be577c2b872a |
| ship.glb | 我方艦艇（DDG-1000 級） | USS Zumwalt DDG-1000 | yakudami | CC BY 4.0 | https://sketchfab.com/3d-models/uss-zumwalt-ddg-1000-f521d9c702284768adeeddef199389a0 |
| aagun.glb | 小島上的 AA GUN | Sentry Turret 'Darwin' auto-cannon | seangorman | CC BY 4.0 | https://sketchfab.com/3d-models/sentry-turret-darwin-auto-cannon-17840b0ce9754d78b0610e525a7a7ef5 |
| sam.glb | 小島上的 SAM | NASAMS-1 surface-to-air missile system | Muhamad Mirza Arrafi | CC BY 4.0 | https://sketchfab.com/3d-models/nasams-1-surface-to-air-missile-system-5fb34fab137c430988fd5642a3b87db3 |
