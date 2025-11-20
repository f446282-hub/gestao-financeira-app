@echo off
title Frontend - HTTP Server

echo ============================================
echo  Iniciando Frontend
echo ============================================

cd /d "%~dp0frontend"

echo Abrindo servidor local http://127.0.0.1:5500
start "" http://127.0.0.1:5500

python -m http.server 5500

pause
