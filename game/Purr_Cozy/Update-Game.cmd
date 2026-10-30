@echo off
chcp 65001 >nul
setlocal
pushd "%~dp0"
where py >nul 2>nul
if not errorlevel 1 goto use_py
where python >nul 2>nul
if not errorlevel 1 goto use_python
echo ERROR: Python 3 was not found. Install Python 3 and run again.
goto failed
:use_py
py -3 tools\rebuild-resources.py
goto result
:use_python
python tools\rebuild-resources.py
:result
if errorlevel 1 goto failed
echo.
echo READY: Commit ALL changed game files together, then push ONCE.
popd
pause
exit /b 0
:failed
echo.
echo UPDATE FAILED. Read the specific error above. No commit or push was made.
popd
pause
exit /b 1
