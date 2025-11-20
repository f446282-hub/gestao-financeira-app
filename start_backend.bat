@echo off
title Backend - FastAPI

echo ============================================
echo  Iniciando backend (FastAPI + Uvicorn)
echo ============================================

REM Ir para a pasta raiz do projeto (onde fica a pasta backend)
cd /d "%~dp0"

echo Ativando ambiente virtual...
call backend\venv\Scripts\activate

echo Executando servidor...
python -m uvicorn backend.main:app --reload

pause
