@echo off
chcp 65001 >nul
REM Script para criar repositório GitHub limpo do zero

echo ╔════════════════════════════════════════════════════════╗
echo ║     CRIAR REPOSITÓRIO GITHUB LIMPO                    ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [PASSO 1] Limpando configuração Git anterior...
echo.

REM Remove a pasta .git antiga
if exist ".git" (
    echo Removendo repositório Git anterior...
    rmdir /s /q .git
    echo [OK] Repositório anterior removido!
) else (
    echo [INFO] Nenhum repositório anterior encontrado.
)
echo.

echo [PASSO 2] Removendo pastas do sistema da pasta do projeto...
echo.

REM Remove fisicamente as pastas do sistema se existirem
if exist "AppData" (
    echo Removendo pasta AppData...
    rmdir /s /q AppData
)
if exist "OneDrive" (
    echo Removendo pasta OneDrive...
    rmdir /s /q OneDrive
)
if exist ".antigravity" (
    echo Removendo pasta .antigravity...
    rmdir /s /q .antigravity
)
if exist ".gemini" (
    echo Removendo pasta .gemini...
    rmdir /s /q .gemini
)
if exist "Temp" (
    rmdir /s /q Temp
)
if exist "temp" (
    rmdir /s /q temp
)

echo [OK] Pastas do sistema removidas!
echo.

echo [PASSO 3] Verificando arquivos do projeto...
echo.

if not exist "package.json" (
    echo [ERRO] package.json não encontrado!
    echo Certifique-se de estar na pasta correta do projeto.
    pause
    exit /b 1
)

if not exist "App.tsx" (
    echo [ERRO] App.tsx não encontrado!
    echo Certifique-se de estar na pasta correta do projeto.
    pause
    exit /b 1
)

echo [OK] Arquivos do projeto encontrados!
echo.

echo [PASSO 4] Inicializando novo repositório Git...
echo.

git init
if errorlevel 1 (
    echo [ERRO] Falha ao inicializar Git!
    pause
    exit /b 1
)
echo [OK] Repositório Git inicializado!
echo.

echo [PASSO 5] Configurando Git (se necessário)...
echo.

git config user.name >nul 2>&1
if errorlevel 1 (
    set /p nome="Digite seu nome completo: "
    set /p email="Digite seu email: "
    git config --global user.name "%nome%"
    git config --global user.email "%email%"
    echo [OK] Git configurado!
) else (
    echo [OK] Git já está configurado!
)
echo.

echo [PASSO 6] Adicionando arquivos do projeto...
echo.

git add .
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar arquivos!
    pause
    exit /b 1
)
echo [OK] Arquivos adicionados!
echo.

echo [PASSO 7] Criando commit inicial...
echo.

git commit -m "Initial commit: Guepardo Entregador - Sistema de gestão de entregas"
if errorlevel 1 (
    echo [ERRO] Falha ao criar commit!
    pause
    exit /b 1
)
echo [OK] Commit criado!
echo.

echo [PASSO 8] Renomeando branch para 'main'...
echo.

git branch -M main
echo [OK] Branch renomeada!
echo.

echo ╔════════════════════════════════════════════════════════╗
echo ║              REPOSITÓRIO LOCAL PRONTO!                ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo PRÓXIMOS PASSOS:
echo.
echo 1. Crie um NOVO repositório no GitHub:
echo    https://github.com/new
echo.
echo    - Nome: Guepardo-Delivery-Entregador
echo    - Visibilidade: Private (recomendado)
echo    - NÃO marque nenhuma opção adicional
echo    - Clique em "Create repository"
echo.
echo 2. Depois de criar, execute UM dos comandos abaixo:
echo.
echo    OPÇÃO A - Via HTTPS (mais fácil):
echo    git remote add origin https://github.com/marcioafsadv/Guepardo-Delivery-Entregador.git
echo    git push -u origin main
echo.
echo    OPÇÃO B - Use o GitHub Desktop:
echo    - Abra o GitHub Desktop
echo    - Repository -^> Add -^> Add Existing Repository
echo    - Selecione ESTA pasta
echo    - Clique em "Publish repository"
echo.
echo ════════════════════════════════════════════════════════
echo.
pause
