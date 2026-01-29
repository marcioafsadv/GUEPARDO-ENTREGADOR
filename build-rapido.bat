@echo off
chcp 65001 >nul
echo ════════════════════════════════════════════════════════
echo   BUILD RÁPIDO - SEM REINSTALAR DEPENDÊNCIAS
echo ════════════════════════════════════════════════════════
echo.

REM Muda para o diretório do script
cd /d "%~dp0"

echo Criando build de produção...
echo.

call npm run build

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao criar build!
    echo Tente executar: npm install
    echo.
    pause
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════
echo   BUILD CONCLUÍDO!
echo ════════════════════════════════════════════════════════
echo.
echo Pasta 'dist' criada com sucesso!
echo.
echo Agora faça upload para a Hostinger:
echo 1. Acesse hPanel
echo 2. File Manager -^> public_html
echo 3. Delete tudo
echo 4. Arraste arquivos de 'dist' para lá
echo.
pause
