@echo off
REM Script para inicializar o repositório Git e fazer o primeiro commit

echo ========================================
echo   Inicializando Repositorio Git
echo ========================================
echo.

REM Verifica se o Git está instalado
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao esta instalado!
    echo Baixe em: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo [1/5] Inicializando repositorio Git...
git init

echo.
echo [2/5] Adicionando arquivos ao staging...
git add .

echo.
echo [3/5] Criando primeiro commit...
git commit -m "Initial commit: Guepardo Entregador - Sistema de gestao de entregas"

echo.
echo [4/5] Renomeando branch para 'main'...
git branch -M main

echo.
echo ========================================
echo   Repositorio Git Inicializado!
echo ========================================
echo.
echo Proximos passos:
echo.
echo 1. Crie um repositorio no GitHub:
echo    https://github.com/new
echo.
echo 2. Execute o comando abaixo (substitua SEU-USUARIO):
echo    git remote add origin https://github.com/SEU-USUARIO/guepardo-entregador.git
echo.
echo 3. Envie o codigo para o GitHub:
echo    git push -u origin main
echo.
echo Consulte o guia completo em: github_deploy_guide.md
echo.
pause
