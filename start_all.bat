@echo off
title ECRAS Master Launcher
echo ===================================================
echo Launching ECRAS Vector Database Modern Instance
echo ===================================================
echo 1. Starting ChromaDB Server (Port 8000)...
start "ECRAS 1. ChromaDB Server" cmd /k "%~dp0start_chroma.bat"
timeout /t 3 /nobreak >nul

echo 2. Starting Vector Backend API (Port 3000)...
start "ECRAS 2. Vector Backend API" cmd /k "%~dp0start_backend.bat"
timeout /t 4 /nobreak >nul

echo 3. Starting React Frontend Dashboard (Port 5173)...
start "ECRAS 3. Frontend Dashboard" cmd /k "%~dp0start_frontend.bat"

echo.
echo All services launched!
echo Access the application at: http://localhost:5173
echo.
pause
