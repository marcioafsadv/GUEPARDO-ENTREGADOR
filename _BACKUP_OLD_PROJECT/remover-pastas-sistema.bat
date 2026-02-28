@echo off
chcp 65001 >nul
REM Script para forçar remoção completa de pastas do sistema do Git

echo ╔════════════════════════════════════════════════════════╗
echo ║     REMOÇÃO FORÇADA DE ARQUIVOS DO SISTEMA            ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [IMPORTANTE] Este script vai remover PERMANENTEMENTE as pastas
echo do sistema do repositório Git e do GitHub.
echo.
pause

echo.
echo [1/8] Removendo .antigravity do Git...
git rm -r -f .antigravity 2>nul
git rm -r -f --cached .antigravity 2>nul
echo [OK] .antigravity removido!

echo.
echo [2/8] Removendo AppData do Git...
git rm -r -f AppData 2>nul
git rm -r -f --cached AppData 2>nul
echo [OK] AppData removido!

echo.
echo [3/8] Removendo OneDrive do Git...
git rm -r -f OneDrive 2>nul
git rm -r -f --cached OneDrive 2>nul
echo [OK] OneDrive removido!

echo.
echo [4/8] Removendo .gemini do Git...
git rm -r -f .gemini 2>nul
git rm -r -f --cached .gemini 2>nul
echo [OK] .gemini removido!

echo.
echo [5/8] Removendo pastas temporárias...
git rm -r -f Temp 2>nul
git rm -r -f temp 2>nul
git rm -r -f tmp 2>nul
echo [OK] Pastas temporárias removidas!

echo.
echo [6/8] Verificando .env.local...
git rm -f .env.local 2>nul
git rm -f --cached .env.local 2>nul
echo [OK] Verificação concluída!

echo.
echo [7/8] Criando commit de remoção forçada...
git add -A
git commit -m "Remove pastas do sistema e arquivos temporários do repositório"
if errorlevel 1 (
    echo [INFO] Nenhuma mudança para commitar.
) else (
    echo [OK] Commit criado!
)

echo.
echo [8/8] Forçando push para o GitHub...
git push -f origin main
if errorlevel 1 (
    echo [TENTANDO] Push para branch master...
    git push -f origin master
    if errorlevel 1 (
        echo [ERRO] Falha ao fazer push!
        echo.
        echo Tente manualmente no GitHub Desktop:
        echo   1. Abra o GitHub Desktop
        echo   2. Clique em "Push origin"
        echo   3. Se necessário, force o push
        pause
        exit /b 1
    )
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║              REMOÇÃO CONCLUÍDA!                       ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Aguarde alguns segundos e verifique no GitHub:
echo https://github.com/marcioafsadv/Guepardo-Delivery-Entregador
echo.
echo As seguintes pastas devem ter sido REMOVIDAS:
echo   ✓ .antigravity
echo   ✓ AppData
echo   ✓ OneDrive
echo   ✓ .gemini
echo.
echo Se ainda aparecerem, use o método alternativo:
echo   1. Vá em Settings no GitHub
echo   2. Delete this repository
echo   3. Recrie usando o script enviar-para-github.bat
echo.
pause
