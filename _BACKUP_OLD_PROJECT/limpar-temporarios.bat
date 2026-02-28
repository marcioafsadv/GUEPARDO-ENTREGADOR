@echo off
chcp 65001 >nul
REM Script para limpar arquivos temporários e resolver problemas do Git

echo ╔════════════════════════════════════════════════════════╗
echo ║     LIMPEZA DE ARQUIVOS TEMPORÁRIOS                   ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/4] Fechando processos que podem estar bloqueando arquivos...
taskkill /F /IM "GitHubDesktop.exe" 2>nul
taskkill /F /IM "git.exe" 2>nul
timeout /t 2 /nobreak >nul
echo [OK] Processos fechados!
echo.

echo [2/4] Removendo pastas temporárias...
if exist "AppData" (
    echo Removendo pasta AppData...
    rmdir /s /q "AppData" 2>nul
    echo [OK] AppData removida!
)
if exist "Temp" (
    echo Removendo pasta Temp...
    rmdir /s /q "Temp" 2>nul
    echo [OK] Temp removida!
)
if exist "temp" (
    echo Removendo pasta temp...
    rmdir /s /q "temp" 2>nul
    echo [OK] temp removida!
)
echo.

echo [3/4] Removendo arquivos temporários...
del /s /q *.tmp 2>nul
del /s /q *.temp 2>nul
echo [OK] Arquivos temporários removidos!
echo.

echo [4/4] Limpando cache do Git...
if exist ".git" (
    git clean -fd 2>nul
    git gc 2>nul
    echo [OK] Cache do Git limpo!
) else (
    echo [INFO] Repositório Git ainda não inicializado.
)
echo.

echo ╔════════════════════════════════════════════════════════╗
echo ║              LIMPEZA CONCLUÍDA!                       ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Próximos passos:
echo   1. Abra o GitHub Desktop novamente
echo   2. Tente publicar o repositório
echo.
echo Se o erro persistir, execute: enviar-para-github.bat
echo.
pause
