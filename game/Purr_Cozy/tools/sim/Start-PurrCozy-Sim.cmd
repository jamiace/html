@echo off
rem Double-click to run the PurrCozy 30-account simulation on this computer. Close the window to stop.
start "PurrCozy sim" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-sim.ps1"
