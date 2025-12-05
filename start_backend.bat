@echo off
title Backend - Sistema de Gestao Financeira

echo ========================================
echo   INICIANDO BACKEND (API)
echo ========================================
echo.

REM Navega para a pasta raiz do projeto
cd /d "%~dp0.."

REM Verifica se Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale o Python 3.8 ou superior.
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Cria ambiente virtual se nao existir
if not exist "backend\venv" (
    echo [1/4] Criando ambiente virtual...
    python -m venv backend\venv
    echo      Ambiente virtual criado com sucesso!
    echo.
) else (
    echo [1/4] Ambiente virtual ja existe.
    echo.
)

REM Ativa o ambiente virtual
echo [2/4] Ativando ambiente virtual...
call backend\venv\Scripts\activate
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao ativar ambiente virtual.
    pause
    exit /b 1
)
echo      Ambiente ativado!
echo.

REM Instala dependencias
echo [3/4] Instalando dependencias...
pip install -q -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo      Dependencias instaladas!
echo.

REM Inicia o servidor
echo [4/4] Iniciando servidor FastAPI...
echo.
echo ========================================
echo   SERVIDOR RODANDO!
echo ========================================
echo.
echo  Acesse o sistema em:
echo  - Frontend: http://localhost:5500
echo  - API:      http://localhost:8000
echo  - Health:   http://localhost:8000/api/health
echo  - Docs:     http://localhost:8000/docs
echo.
echo  Pressione CTRL+C para parar o servidor
echo ========================================
echo.

python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

pause
