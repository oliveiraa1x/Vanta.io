@echo off
REM 🚀 Deploy Script para Squarespace Cloud (Windows)

setlocal enabledelayedexpansion

echo.
echo ================================
echo   Vanta.io - Deploy Squarespace
echo ================================
echo.

REM Verificar pré-requisitos
echo Verificando pré-requisitos...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] npm %NPM_VER%

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado
    exit /b 1
)
echo [OK] Git encontrado

echo.
echo Preparando aplicacao para deploy...

REM Build do Frontend
echo.
echo Building frontend...
cd frontend
call npm install
call npm run build

if not exist "build" (
    echo [ERRO] Build falhou
    cd ..
    exit /b 1
)
echo [OK] Frontend build concluido
cd ..

REM Instalar dependências do Backend
echo.
echo Instalando dependencias do backend...
cd backend
call npm install
cd ..

REM Git setup
echo.
echo Configurando repositorio Git...

if not exist ".git" (
    call git init
    call git config user.email "seu@email.com"
    call git config user.name "Deploy Bot"
)

call git add .
call git commit -m "Deploy: %date% %time%"

echo.
echo ================================
echo [OK] Pronto para deploy!
echo ================================
echo.
echo Proximos passos:
echo 1. Configure o remote do Squarespace:
echo    git remote add squarespace ^<seu-url^>
echo.
echo 2. Faca deploy:
echo    git push squarespace main
echo.
echo 3. Acompanhe na dashboard:
echo    https://squarespace.com/cloud
echo.
pause
