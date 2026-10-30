@echo off
cd /d "%~dp0"
py -3 tools\rebuild-resources.py
if errorlevel 1 python tools\rebuild-resources.py
pause
