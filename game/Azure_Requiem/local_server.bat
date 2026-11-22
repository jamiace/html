@echo off
rem Azure Requiem local test server (http://localhost:8000)
cd /d "%~dp0"

rem 自動指定使用 Google Chrome 開啟網頁
start "" chrome "http://localhost:8000"

where python >NUL 2>&1 && (python -m http.server 8000 & goto :eof)
where py >NUL 2>&1 && (py -m http.server 8000 & goto :eof)
if exist "%USERPROFILE%\miniconda3\python.exe" ("%USERPROFILE%\miniconda3\python.exe" -m http.server 8000 & goto :eof)
if exist "%USERPROFILE%\anaconda3\python.exe" ("%USERPROFILE%\anaconda3\python.exe" -m http.server 8000 & goto :eof)
echo Python not found.
pause