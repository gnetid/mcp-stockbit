@echo off
title Kosongkan Port 3030 (Stockbit Dashboard)
cd /d "%~dp0"

echo ========================================================
echo   Mengosongkan Port 3030
echo ========================================================
echo.

node src/server.mjs --free-port

echo.
echo Selesai. Tekan tombol apa saja untuk keluar.
pause >nul
