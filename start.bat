@echo off
rem FitTrack Pro: start local server + open browser (no Python/Git needed)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
pause
