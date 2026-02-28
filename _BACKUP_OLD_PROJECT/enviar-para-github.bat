@echo off
chcp 65001 >nul
REM Script automatizado para enviar projeto ao GitHub
REM Repositório: https://github.com/marcioafsadv/Guepardo-Delivery.git

echo ╔════════════════════════════════════════════════════════╗
echo ║     GUEPARDO ENTREGADOR - ENVIO PARA GITHUB           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Verifica se o Git está instalado
echo [VERIFICANDO] Git instalado...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git não está instalado!
    echo.
    echo Instalando Git automaticamente...
    winget install --id Git.Git -e --source winget
    echo.
    echo [IMPORTANTE] Feche este terminal e execute o script novamente!
    pause
    exit /b 1
)
echo [OK] Git instalado!
echo.

REM Verifica se já existe repositório Git
if exist ".git" (
    echo [AVISO] Repositório Git já existe nesta pasta.
    echo Deseja reinicializar? (S/N)
    set /p resposta=
    if /i "%resposta%"=="S" (
        echo [LIMPANDO] Removendo repositório anterior...
        rmdir /s /q .git
    ) else (
        echo [CANCELADO] Operação cancelada.
        pause
        exit /b 0
    )
)

echo.
echo ════════════════════════════════════════════════════════
echo PASSO 1: Inicializando repositório Git
echo ════════════════════════════════════════════════════════
git init
if errorlevel 1 (
    echo [ERRO] Falha ao inicializar repositório!
    pause
    exit /b 1
)
echo [OK] Repositório inicializado!
echo.

echo ════════════════════════════════════════════════════════
echo PASSO 2: Adicionando arquivos
echo ════════════════════════════════════════════════════════
git add .
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar arquivos!
    pause
    exit /b 1
)
echo [OK] Arquivos adicionados!
echo.

echo ════════════════════════════════════════════════════════
echo PASSO 3: Criando commit inicial
echo ════════════════════════════════════════════════════════
git commit -m "Initial commit: Guepardo Entregador - Sistema de gestão de entregas"
if errorlevel 1 (
    echo [ERRO] Falha ao criar commit!
    echo.
    echo Configurando Git pela primeira vez...
    echo.
    set /p nome="Digite seu nome completo: "
    set /p email="Digite seu email: "
    git config --global user.name "%nome%"
    git config --global user.email "%email%"
    echo.
    echo [TENTANDO NOVAMENTE] Criando commit...
    git commit -m "Initial commit: Guepardo Entregador - Sistema de gestão de entregas"
)
echo [OK] Commit criado!
echo.

echo ════════════════════════════════════════════════════════
echo PASSO 4: Renomeando branch para 'main'
echo ════════════════════════════════════════════════════════
git branch -M main
echo [OK] Branch renomeada!
echo.

echo ════════════════════════════════════════════════════════
echo PASSO 5: Conectando ao GitHub
echo ════════════════════════════════════════════════════════
git remote remove origin 2>nul
git remote add origin https://github.com/marcioafsadv/Guepardo-Delivery.git
if errorlevel 1 (
    echo [ERRO] Falha ao conectar ao GitHub!
    pause
    exit /b 1
)
echo [OK] Conectado ao GitHub!
echo.

echo ════════════════════════════════════════════════════════
echo PASSO 6: Enviando código para o GitHub
echo ════════════════════════════════════════════════════════
echo.
echo [IMPORTANTE] O GitHub solicitará suas credenciais:
echo   - Username: marcioafsadv
echo   - Password: Use um Personal Access Token
echo.
echo Como criar o token:
echo   1. Acesse: https://github.com/settings/tokens
echo   2. Clique em "Generate new token (classic)"
echo   3. Marque apenas "repo"
echo   4. Copie o token e cole aqui quando solicitar
echo.
pause
echo.
echo [ENVIANDO] Aguarde...
git push -u origin main
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao enviar para o GitHub!
    echo.
    echo Possíveis causas:
    echo   - Credenciais incorretas
    echo   - Token sem permissões adequadas
    echo   - Problemas de conexão
    echo.
    echo Tente novamente com:
    echo   git push -u origin main
    echo.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║              SUCESSO! CÓDIGO ENVIADO!                 ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Acesse seu repositório em:
echo https://github.com/marcioafsadv/Guepardo-Delivery
echo.
echo [VERIFICAÇÃO] Certifique-se de que:
echo   ✓ Todos os arquivos estão no GitHub
echo   ✓ O arquivo .env.local NÃO foi enviado
echo   ✓ A pasta node_modules NÃO foi enviada
echo.
pause
