@echo off
setlocal enabledelayedexpansion
title Stockbit Desktop Launcher (Debug Mode)

echo ========================================================
echo   Stockbit Desktop Launcher (Port 9222 Debug Mode)
echo ========================================================

:: 1. Check if port 9222 is already listening
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Stockbit Desktop sudah berjalan dan terhubung di port 9222.
    echo Anda siap menggunakan MCP Server atau Dashboard!
    echo ========================================================
    pause
    exit /b 0
)

:: 2. Check if Stockbit process is running without port 9222
tasklist /FI "IMAGENAME eq Stockbit.exe" 2>NUL | find /I /N "Stockbit.exe">NUL
if %ERRORLEVEL% EQU 0 (
    echo [PERINGATAN] Stockbit sedang berjalan, TETAPI tanpa port debugging 9222.
    echo Bridge tidak dapat mengakses data sebelum aplikasi direstart dengan flag port 9222.
    echo.
    set /p RESTART_CHOICE="Tutup dan restart Stockbit sekarang? (Y/N): "
    if /i "!RESTART_CHOICE!"=="Y" (
        echo Menutup Stockbit...
        taskkill /F /IM Stockbit.exe >nul 2>&1
        timeout /t 2 /nobreak >nul
    ) else (
        echo Silakan tutup Stockbit secara manual lalu jalankan script ini kembali.
        pause
        exit /b 1
    )
)

:: 3. Find Stockbit.exe location
set "STOCKBIT_PATH="

if exist "C:\Program Files\Stockbit\Stockbit.exe" (
    set "STOCKBIT_PATH=C:\Program Files\Stockbit\Stockbit.exe"
) else if exist "C:\Program Files (x86)\Stockbit\Stockbit.exe" (
    set "STOCKBIT_PATH=C:\Program Files (x86)\Stockbit\Stockbit.exe"
) else if exist "%LOCALAPPDATA%\Programs\Stockbit\Stockbit.exe" (
    set "STOCKBIT_PATH=%LOCALAPPDATA%\Programs\Stockbit\Stockbit.exe"
) else if exist "%APPDATA%\Programs\Stockbit\Stockbit.exe" (
    set "STOCKBIT_PATH=%APPDATA%\Programs\Stockbit\Stockbit.exe"
)

if "!STOCKBIT_PATH!"=="" (
    echo [ERROR] Stockbit.exe tidak ditemukan di lokasi standar:
    echo   - C:\Program Files\Stockbit\Stockbit.exe
    echo   - %LOCALAPPDATA%\Programs\Stockbit\Stockbit.exe
    echo.
    echo Silakan masukkan path lengkap ke Stockbit.exe di komputer Anda:
    set /p USER_PATH="Path: "
    if exist "!USER_PATH!" (
        set "STOCKBIT_PATH=!USER_PATH!"
    ) else (
        echo Path tidak valid. Operasi dibatalkan.
        pause
        exit /b 1
    )
)

echo Menjalankan Stockbit dari:
echo "!STOCKBIT_PATH!"
echo Dengan parameter: --remote-debugging-port=9222
echo.
start "" "!STOCKBIT_PATH!" --remote-debugging-port=9222

echo Menunggu inisialisasi WebView2 port 9222...
timeout /t 3 /nobreak >nul

echo [BERHASIL] Stockbit Desktop telah dijalankan dengan port 9222!
echo Silakan login ke akun Stockbit Anda jika belum login.
echo ========================================================
pause
