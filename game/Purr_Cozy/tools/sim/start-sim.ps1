# PurrCozy 30 位測試帳號：在這台電腦常駐執行兩週生活模擬
# 用法：雙擊同資料夾的 Start-PurrCozy-Sim.cmd。要停止就關掉那個視窗（下次再雙擊會接著跑）。
# - 瀏覽器在背景、無畫面、完全靜音，不會碰鍵盤、滑鼠或耳機。
# - 以「低於一般」優先權執行，你工作時電腦會優先給你用。
# - 這個視窗開著的期間電腦不會自動睡眠（螢幕仍可以關）。筆電請接電源，不要闔上螢幕蓋（或在電源設定把「闔上蓋子」設為「不執行任何動作」）。
# - 模擬資料（每個人的瀏覽器資料、進度、紀錄）放在 %LOCALAPPDATA%\PurrCozySim，不在 Dropbox 裡。
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); $OutputEncoding = [Text.UTF8Encoding]::new($false)
$Root  = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path          # ...\Purr_Cozy
$Life  = Join-Path $Root 'tools\sim\life.cjs'
$Acc   = Join-Path $Root '.sim\accounts.json'
$Home2 = Join-Path $env:LOCALAPPDATA 'PurrCozySim'
$State = Join-Path $Home2 'life'
$Start = '2026-11-10'
$End   = '2026-11-24T00:00:00+08:00'
New-Item -ItemType Directory -Force -Path $State | Out-Null
$Log = Join-Path $State 'console.log'
$Host.UI.RawUI.WindowTitle = 'PurrCozy 模擬（關掉這個視窗就會停止）'

function Say($m) { $t = Get-Date -Format 'MM/dd HH:mm:ss'; Write-Host "[$t] $m"; Add-Content -Path $Log -Value "[$t] $m" -Encoding UTF8 }

if (-not (Test-Path $Acc)) { Say "找不到 $Acc（30 個測試帳號的登入資料）"; Read-Host '按 Enter 關閉'; exit 1 }

# 1. Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Say '沒有 Node.js，用 winget 安裝（第一次需要幾分鐘）…'
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements | Out-Host
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Say 'Node.js 安裝後還找不到，請關掉這個視窗再雙擊一次。'; Read-Host '按 Enter 關閉'; exit 1 }
}
Say ("Node.js " + (node --version))

# 2. Playwright + Chromium（裝在 %LOCALAPPDATA%\PurrCozySim，不放進專案資料夾）
# Playwright 1.63 (the version the simulator was tested with). 1.48 cannot unpack its browser on a new Node.js
# (it hangs right after 'Downloading Chromium ... 100%'). npm skips the download when it is already installed.
Say '安裝／更新 Playwright…'
Push-Location $Home2
if (-not (Test-Path 'package.json')) { '{"name":"purrcozy-sim","private":true}' | Set-Content -Path 'package.json' -Encoding ASCII }
npm install playwright@1.63.0 --no-fund --no-audit --loglevel=error | Out-Host
Pop-Location
$Host.UI.RawUI.WindowTitle = 'PurrCozy 模擬（關掉這個視窗就會停止）'
$env:NODE_PATH = Join-Path $Home2 'node_modules'
Say ('Playwright ' + (& node -e "console.log(require('playwright/package.json').version)") + '，確認 Chromium（第一次會下載約 150MB 並解壓縮，需要幾分鐘）…')
& node (Join-Path $Home2 'node_modules\playwright\cli.js') install chromium | Out-Host
$Host.UI.RawUI.WindowTitle = 'PurrCozy 模擬（關掉這個視窗就會停止）'   # npm renames the window while it runs
Say 'Chromium 已就緒。（不要用滑鼠點這個視窗裡面：Windows 會暫停視窗裡的程式，按 Enter 或 Esc 可恢復）'

# 3. 不讓電腦睡眠（只在這個視窗開著時有效），並降低優先權
Add-Type -Namespace PurrSim -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
[PurrSim.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null
(Get-Process -Id $PID).PriorityClass = 'BelowNormal'

# 4. 常駐執行；程式意外結束就 1 分鐘後自動重開，到結束時間就停
Say "開始模擬：$Start 起，到 $End 為止。進度紀錄：$State\logs"
while ($true) {
  if ((Get-Date) -ge [datetime]::Parse($End)) { Say '模擬期間已結束。'; break }
  & node $Life run --login --profiles --start-if-new $Start --end $End --state $State --accounts $Acc --concurrency 6 --load-conc 3 2>&1 | ForEach-Object { $l = "$_"; Write-Host $l; Add-Content -Path $Log -Value $l -Encoding UTF8 }
  if ($LASTEXITCODE -eq 0) { Say '模擬程式正常結束。'; break }
  Say "模擬程式意外結束（代碼 $LASTEXITCODE），1 分鐘後自動重新開始…"
  Start-Sleep -Seconds 60
}
Read-Host '按 Enter 關閉'
