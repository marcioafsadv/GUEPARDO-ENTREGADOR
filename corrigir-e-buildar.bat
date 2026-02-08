@echo off
chcp 65001 >nul
echo ════════════════════════════════════════════════════════
echo   CORRIGIR INSTALAÇÃO E CRIAR BUILD
echo ════════════════════════════════════════════════════════
echo.

REM Muda para o diretório do script (garante caminho correto)
cd /d "%~dp0"

echo [INFO] Diretório atual: %CD%
echo.

echo [1/6] Verificando se node_modules existe...
if exist "node_modules" (
    echo [INFO] Removendo node_modules antigo...
    rmdir /s /q node_modules
    echo [OK] node_modules removido!
) else (
    echo [INFO] node_modules não existe (ok)
)
echo.

echo [2/6] Verificando se package-lock.json existe...
if exist "package-lock.json" (
    echo [INFO] Removendo package-lock.json...
    del /f /q package-lock.json
    echo [OK] package-lock.json removido!
) else (
    echo [INFO] package-lock.json não existe (ok)
)
echo.

echo [3/6] Limpando cache do npm...
call npm cache clean --force
echo [OK] Cache limpo!
echo.

echo [4/6] Instalando dependências do zero...
echo [INFO] Isso pode levar alguns minutos, aguarde...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependências!
    echo.
    echo Verifique se:
    echo   1. Você tem conexão com a internet
    echo   2. O arquivo package.json existe nesta pasta
    echo.
    pause
    exit /b 1
)
echo.
echo [OK] Dependências instaladas com sucesso!
echo.

echo [5/6] Verificando se Vite foi instalado...
if exist "node_modules\vite\bin\vite.js" (
    echo [OK] Vite encontrado!
) else (
    echo [ERRO] Vite não foi instalado corretamente!
    pause
    exit /b 1
)
echo.

echo [6/6] Criando build de produção...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao criar build!
    echo.
    pause
    exit /b 1
)
echo.

echo ════════════════════════════════════════════════════════
echo   BUILD CONCLUÍDO COM SUCESSO!
echo ════════════════════════════════════════════════════════
echo.
echo A pasta 'dist' foi criada com os arquivos prontos!
echo.
echo Arquivos na pasta dist:
dir dist /b
echo.
echo ════════════════════════════════════════════════════════
echo   PRÓXIMOS PASSOS - DEPLOY NA HOSTINGER
echo ════════════════════════════════════════════════════════
echo.
echo 1. Acesse: https://hpanel.hostinger.com/
echo 2. Abra o File Manager
echo 3. Vá para a pasta public_html
echo 4. DELETE todos os arquivos antigos
echo 5. Arraste TODOS os arquivos DE DENTRO da pasta 'dist'
echo    para dentro de public_html
echo 6. Copie também o arquivo .htaccess para public_html
echo.
echo Aguarde 2-3 minutos e acesse seu site!
echo.
pause
