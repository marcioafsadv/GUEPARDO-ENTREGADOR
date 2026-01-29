@echo off
chcp 65001 >nul
REM Script para criar build de produção para Hostinger

echo ╔════════════════════════════════════════════════════════╗
echo ║     BUILD DE PRODUÇÃO - HOSTINGER                     ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Muda para o diretório do script
cd /d "%~dp0"

echo [INFO] Diretório atual: %CD%
echo.

echo [1/6] Verificando Node.js e npm...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js não está instalado!
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo [OK] Node.js instalado!
echo.

echo [2/6] Verificando arquivos do projeto...
if not exist "package.json" (
    echo [ERRO] package.json não encontrado!
    echo Certifique-se de estar na pasta correta do projeto.
    pause
    exit /b 1
)
if not exist "vite.config.ts" (
    echo [ERRO] vite.config.ts não encontrado!
    echo Certifique-se de estar na pasta correta do projeto.
    pause
    exit /b 1
)
echo [OK] Arquivos do projeto encontrados!
echo.

echo [3/6] Limpando instalação anterior...
if exist "node_modules" (
    echo Removendo node_modules antigo...
    rmdir /s /q node_modules
)
if exist "package-lock.json" (
    echo Removendo package-lock.json...
    del /f /q package-lock.json
)
echo [OK] Limpeza concluída!
echo.

echo [4/6] Instalando dependências...
echo Aguarde, isso pode levar alguns minutos...
call npm install
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependências!
    echo.
    echo Tente executar manualmente:
    echo   npm install
    pause
    exit /b 1
)
echo [OK] Dependências instaladas!
echo.

echo [5/6] Criando build de produção...
echo Aguarde, compilando o projeto...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha ao criar build!
    echo.
    echo Verifique os erros acima e tente novamente.
    pause
    exit /b 1
)
echo [OK] Build criado com sucesso!
echo.

echo [6/6] Verificando pasta dist...
if not exist "dist" (
    echo [ERRO] Pasta dist não foi criada!
    pause
    exit /b 1
)
echo [OK] Pasta dist criada!
echo.
echo Arquivos gerados:
dir dist /b
echo.

echo ╔════════════════════════════════════════════════════════╗
echo ║              BUILD CONCLUÍDO COM SUCESSO!             ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo A pasta 'dist' contém os arquivos prontos para deploy.
echo Tamanho da pasta dist:
for /f "tokens=3" %%a in ('dir dist /s /-c ^| find "bytes"') do set size=%%a
echo %size% bytes
echo.
echo ════════════════════════════════════════════════════════
echo PRÓXIMOS PASSOS PARA DEPLOY NA HOSTINGER:
echo ════════════════════════════════════════════════════════
echo.
echo 1. Acesse: https://hpanel.hostinger.com/
echo 2. Vá em File Manager (Gerenciador de Arquivos)
echo 3. Navegue até public_html
echo 4. DELETE todos os arquivos antigos em public_html
echo 5. Faça upload de TODOS os arquivos da pasta 'dist'
echo    (Arraste os arquivos DE DENTRO de 'dist' para public_html)
echo.
echo 6. Copie também o arquivo .htaccess para public_html
echo.
echo IMPORTANTE:
echo   ✓ Envie o CONTEÚDO da pasta 'dist', não a pasta em si
echo   ✓ Envie o arquivo .htaccess também
echo   ✓ Aguarde 2-3 minutos após o upload
echo   ✓ Limpe o cache do navegador (Ctrl + Shift + R)
echo.
echo Após o upload, acesse:
echo https://lightyellow-ferret-827040.hostingersite.com/
echo.
pause
