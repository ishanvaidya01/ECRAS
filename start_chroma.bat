@echo off
title ECRAS ChromaDB Server
echo ===================================================
echo Starting Standalone ChromaDB Server on port 8000...
echo ===================================================
cd /d "%~dp0"
chroma run --path ./chroma_data --port 8000
pause
