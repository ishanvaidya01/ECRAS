@echo off
title ECRAS Vector Backend API
echo ===================================================
echo Starting ECRAS Vector Database Backend on port 3000...
echo ===================================================
cd /d "%~dp0\backend"
node server.js
pause
