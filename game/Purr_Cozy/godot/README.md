# Godot 素材交接

此資料夾用於將本次 PNG 接到 Godot 4。將本包的 `assets/png/` 及 `godot/` 放到 Godot 專案根目錄下，保持相對路徑不變。這是素材與資源描述，並非整個 Purr Cozy 的 Godot 移植。

## 已提供

- `furniture/*.tres`：每一個家具品項一份 Resource。以 `get_meta("base")` 取得 Texture2D，以 `get_meta("pivot")` 取得支點；背面、坐姿前景、床被等存在時有對應欄位。
- `animations/furniture/*.tres`：帶動畫家具的 SpriteFrames，含 on/off 幀，6 fps。
- `animations/avatars/*.tres`：玩家預設造型與六位商人的 SpriteFrames，含站立、走路、坐姿、打字、伸展、閱讀與其他既有動作。
- `animations/cats/*.tres`：毛色、項圈與頭飾組合的 SpriteFrames。動作名稱與原 Web 一致。
- `assets.json`：機器可讀的尺寸、pivot、層級、座位、桌面、窗景孔洞、光源與動作索引。
- `assets/png/catalog.json`：Web 使用的完整清單，含紙娃娃與索引遮罩等進階資料。
- `assets/png/merchants/*_background_*.png`、`*_stall.png`：商人的背景與攤位可獨立使用；完整場景也保留日、夕、夜三態。

## 座標、取樣與遮擋

- 原點為圖片左上，x 向右、y 向下，1 個原始像素對應 1 個邏輯單位。
- Texture Filter 使用 Nearest，不開 Mipmaps；不要用圖片實體尺寸去猜家具碰撞厚度。
- `pivot` 是圖片內的錨點。`Sprite2D.centered = false` 時，可設 `offset = -pivot`，再把節點放到世界座標錨點。
- 紙娃娃與角色動作採固定尺寸畫布。貓咪各幀尺寸不同，使用 `assets.json` 的每幀 pivot 對齊腳底，勿單純置中。
- 家具的擺放原點仍是左上；`surface`、`seat`、`bed`、`window` 和 `light` 為相對該原點的座標。
- 普通家具按落地位置排序；坐下時先畫椅子底圖、人物，再畫 `seated_foreground`。睡覺先畫床、角色，再畫 `sleep_foreground`；如廁最後覆蓋 `toilet_foreground`。
- 各遮擋 PNG 都保留與底圖相同的完整尺寸與原點，透明區域已留空，不需要再猜偏移量。
- 椅子 back 與 seated_foreground 使用同一張背面 PNG，與 Web 中的實際遮擋方式一致。

## 使用範例

```gdscript
var item: Resource = load("res://godot/furniture/desk.tres")
$Sprite2D.texture = item.get_meta("base")
$Sprite2D.centered = false
$Sprite2D.offset = -item.get_meta("pivot")
$Sprite2D.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

var frames: SpriteFrames = load("res://godot/animations/cats/ginger__none__none.tres")
$AnimatedSprite2D.sprite_frames = frames
$AnimatedSprite2D.play("walk")
```

貓咪動畫尺寸不一時，播放每幀後請依該幀 pivot 更新 offset。若採 AnimatedSprite3D，將相同支點與 pixel_size 轉成你的 3D 尺度。

## 紙娃娃資料

`avatar/body/<top>.png` 為衣著模板圖集，欄寬 18、列高 13、每列 64 格。格子索引：

```
index = ((bottomIndex × shoesCount) + shoeIndex) × poseCount + poseIndex
x = (index % 64) × 18
y = floor(index / 64) × 13
```

索引順序在 `catalog.json.body`。頭髮、五官、帽子及配件的圖框則在 `frames`，圖檔在 `atlases/`。一般顯示使用彩色 PNG；要實作完全相同的即時染色，才使用 `masks/` 的調色角色編碼。遮罩 R/G 合成 16 位元角色 ID，alpha 0 表示無像素；65535 表示配件擦除下層像素。遮罩必須無損、禁止線性篩選及色彩轉換。`palette` 列出原始顏色角色。

本次維持原 Web 的正面、背面、側面及鏡像方向，**沒有宣稱已新增八個不同角度的人物原畫**。3D 厚度、法線貼圖、深度及完整 HD-2D 光照資料也不屬於原 Web 的既有資料；移植時另行設定，不應以假數值代填。

## 資源格式依據

- AtlasTexture：使用 atlas、region、filter_clip。
  https://docs.godotengine.org/en/stable/classes/class_atlastexture.html
- SpriteFrames：每個動畫由 Texture2D 幀、speed 與 loop 組成。
  https://docs.godotengine.org/en/stable/classes/class_spriteframes.html

本次已檢查所有 `.tres` 引用檔存在、圖框在圖集內及資料索引完整；執行環境沒有 Godot 編輯器，未冒稱已完成編輯器匯入或 F5 執行測試。
