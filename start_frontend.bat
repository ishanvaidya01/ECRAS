@echo off
title ECRAS Frontend Dashboard
echo ===================================================
echo Starting ECRAS Frontend Dashboard on port 5173...
echo ===================================================
cd /d "%~dp0\frontend"
npm run dev
pause
