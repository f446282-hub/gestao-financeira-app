@echo off
title Frontend - Sistema de Gestao Financeira

echo ========================================
echo   INICIANDO FRONTEND (Interface Web)
echo ========================================
echo.

REM Verifica se Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale o Python 3.8 ou superior.
    pause
    exit /b 1
)

echo [INFO] Iniciando servidor HTTP na porta 5500...
echo.
echo ========================================
echo   SERVIDOR FRONTEND RODANDO!
echo ========================================
echo.
echo  Acesse o sistema em:
echo  http://localhost:5500
echo.
echo  Certifique-se de que o BACKEND esta rodando!
echo  Backend: http://localhost:8000
echo.
echo  Pressione CTRL+C para parar o servidor
echo ========================================
echo.

REM Abre o navegador automaticamente
start "" http://localhost:5500

REM Inicia o servidor HTTP
python -m http.server 5500

pause
