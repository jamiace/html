@echo off
chcp 65001 >nul
pushd "%~dp0"
where py >nul 2>nul
if errorlevel 1 (python tools\rebuild-resources.py) else (py -3 tools\rebuild-resources.py)
if errorlevel 1 echo FAILED: Python 3 is required.
popd
pause
