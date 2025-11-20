@echo off
title Backend - FastAPI

echo ============================================
echo  Iniciando backend (FastAPI + Uvicorn)
echo ============================================

cd /d "%~dp0backend"

echo Ativando ambiente virtual...
call venv\Scripts\activate

echo Executando servidor...
python -m uvicorn backend.main:app --reload

pause
