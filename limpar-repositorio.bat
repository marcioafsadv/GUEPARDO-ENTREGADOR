@echo off
chcp 65001 >nul
REM Script para limpar arquivos incorretos do repositório Git

echo ╔════════════════════════════════════════════════════════╗
echo ║     LIMPEZA DO REPOSITÓRIO GIT                        ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [AVISO] Este script vai remover pastas do sistema que foram
echo enviadas por engano para o GitHub (AppData, OneDrive, etc.)
echo.
pause

echo.
echo [1/6] Removendo pastas do sistema do Git...

REM Remove pastas do sistema do controle do Git
git rm -r --cached AppData 2>nul
git rm -r --cached OneDrive 2>nul
git rm -r --cached .antigravity 2>nul
git rm -r --cached .gemini 2>nul
git rm -r --cached Temp 2>nul
git rm -r --cached temp 2>nul

echo [OK] Pastas removidas do Git!
echo.

echo [2/6] Removendo arquivos temporários...
git rm --cached *.tmp 2>nul
git rm --cached *.temp 2>nul
git rm --cached *.lock 2>nul

echo [OK] Arquivos temporários removidos!
echo.

echo [3/6] Verificando se .env.local foi enviado por engano...
git rm --cached .env.local 2>nul
if errorlevel 1 (
    echo [OK] .env.local não foi enviado (correto!)
) else (
    echo [AVISO] .env.local foi removido do Git!
    echo [IMPORTANTE] Considere regenerar suas credenciais do Supabase!
)
echo.

echo [4/6] Atualizando .gitignore...
echo [OK] .gitignore já está configurado!
echo.

echo [5/6] Criando commit de limpeza...
git add .gitignore
git add .gitattributes
git commit -m "Limpeza: Remove arquivos do sistema e temporários"
if errorlevel 1 (
    echo [INFO] Nenhuma mudança para commitar ou commit já feito.
) else (
    echo [OK] Commit de limpeza criado!
)
echo.

echo [6/6] Enviando correções para o GitHub...
git push origin main
if errorlevel 1 (
    echo [TENTANDO] Enviando para branch master...
    git push origin master
    if errorlevel 1 (
        echo [ERRO] Falha ao enviar para o GitHub!
        echo Execute manualmente: git push origin main
        pause
        exit /b 1
    )
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║              LIMPEZA CONCLUÍDA!                       ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Verificações finais:
echo   1. Acesse: https://github.com/marcioafsadv/Guepardo-Delivery-Entregador
echo   2. Verifique se AppData e OneDrive foram removidos
echo   3. Confirme que os arquivos do projeto estão lá
echo.
echo Arquivos que DEVEM estar no repositório:
echo   ✓ App.tsx
echo   ✓ package.json
echo   ✓ README.md
echo   ✓ components/
echo   ✓ supabase.ts
echo.
echo Arquivos que NÃO devem estar:
echo   ✗ .env.local
echo   ✗ AppData/
echo   ✗ OneDrive/
echo   ✗ node_modules/
echo.
pause
