@echo off
chcp 65001 >nul
REM Script para commitar e enviar documentação atualizada para o GitHub

echo ╔════════════════════════════════════════════════════════╗
echo ║     ATUALIZAR DOCUMENTAÇÃO NO GITHUB                  ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/5] Verificando Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git não está instalado!
    pause
    exit /b 1
)
echo [OK] Git instalado!
echo.

echo [2/5] Adicionando arquivos atualizados...
git add README.md
git add DEPLOY.md
git add .htaccess
git add .env.production.example
git add vite.config.ts
git add .gitignore
echo [OK] Arquivos adicionados!
echo.

echo [3/5] Criando commit...
git commit -m "docs: Atualiza documentação com instruções completas de deploy na Hostinger"
if errorlevel 1 (
    echo [INFO] Nenhuma mudança para commitar ou commit já feito.
) else (
    echo [OK] Commit criado!
)
echo.

echo [4/5] Enviando para o GitHub...
git push origin main
if errorlevel 1 (
    echo [TENTANDO] Push para branch master...
    git push origin master
    if errorlevel 1 (
        echo [ERRO] Falha ao enviar para o GitHub!
        echo.
        echo Tente manualmente:
        echo   git push origin main
        pause
        exit /b 1
    )
)
echo [OK] Documentação enviada para o GitHub!
echo.

echo ╔════════════════════════════════════════════════════════╗
echo ║              DOCUMENTAÇÃO ATUALIZADA!                 ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Arquivos atualizados no GitHub:
echo   ✓ README.md - Documentação completa do projeto
echo   ✓ DEPLOY.md - Guia de deploy na Hostinger
echo   ✓ .htaccess - Configuração Apache
echo   ✓ .env.production.example - Template de variáveis
echo   ✓ vite.config.ts - Configuração otimizada
echo.
echo Acesse: https://github.com/marcioafsadv/GUEPARDO-ENTREGADOR
echo.
echo ════════════════════════════════════════════════════════
echo PRÓXIMOS PASSOS:
echo ════════════════════════════════════════════════════════
echo.
echo 1. Crie uma NOVA pasta para instalação limpa
echo 2. Clone o repositório novamente:
echo    git clone https://github.com/marcioafsadv/GUEPARDO-ENTREGADOR.git
echo.
echo 3. Entre na pasta:
echo    cd GUEPARDO-ENTREGADOR
echo.
echo 4. Siga as instruções do README.md ou DEPLOY.md
echo.
pause
