@echo off
rem FitTrack Pro: เปิด local server แล้วเปิดเบราว์เซอร์ให้อัตโนมัติ
rem (ต้องเปิดผ่าน http://localhost วิดีโอ YouTube / Bluetooth / Service Worker จึงจะใช้ได้)
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8080

where python >nul 2>nul
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%/"
  echo FitTrack: http://localhost:%PORT%/   ^(ปิดหน้าต่างนี้เพื่อหยุด^)
  python -m http.server %PORT% --bind 127.0.0.1
  goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 5 >nul & start http://localhost:%PORT%/"
  echo FitTrack: http://localhost:%PORT%/   ^(ปิดหน้าต่างนี้เพื่อหยุด^)
  npx -y serve -l %PORT% .
  goto :eof
)

echo ไม่พบ Python หรือ Node.js — ติดตั้งอย่างใดอย่างหนึ่งก่อน:
echo   Python: https://www.python.org/downloads/
echo   Node.js: https://nodejs.org/
pause
