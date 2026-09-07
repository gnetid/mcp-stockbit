@echo off
title Stockbit Custom Dashboard & MCP Server
echo ========================================================
echo   Starting Stockbit Intelligence Dashboard & MCP
echo ========================================================
cd /d "%~dp0"
start http://127.0.0.1:3030
node src/server.mjs
pause
