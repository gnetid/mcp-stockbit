@echo off
title Stockbit Full Stack (Desktop Bridge & Dashboard)
cd /d "%~dp0"

echo ========================================================
echo   Starting Stockbit Bridge & Intelligence Dashboard
echo ========================================================

:: Check port 9222
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Stockbit Desktop belum aktif di port 9222.
    echo Menjalankan Stockbit Desktop dengan parameter debug...
    call launch-stockbit.bat
)

echo.
echo Memeriksa dan mengosongkan port 3030 jika ada proses lama...
node src/server.mjs --free-port

echo Membuka Web Dashboard di browser: http://localhost:3030
start http://localhost:3030
node src/server.mjs
pause

