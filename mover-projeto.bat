@echo off
chcp 65001 >nul
echo ════════════════════════════════════════════════════════
echo   MOVER PROJETO PARA CAMINHO SIMPLES
echo ════════════════════════════════════════════════════════
echo.

echo [1/4] Criando pasta C:\Projetos...
if not exist "C:\Projetos" (
    mkdir "C:\Projetos"
    echo [OK] Pasta criada!
) else (
    echo [INFO] Pasta já existe
)
echo.

echo [2/4] Copiando projeto para C:\Projetos\GUEPARDO-ENTREGADOR...
echo [INFO] Isso pode levar alguns minutos...
echo.

REM Remove pasta de destino se já existir
if exist "C:\Projetos\GUEPARDO-ENTREGADOR" (
    echo [INFO] Removendo instalação anterior...
    rmdir /s /q "C:\Projetos\GUEPARDO-ENTREGADOR"
)

REM Copia o projeto
xcopy "%~dp0*" "C:\Projetos\GUEPARDO-ENTREGADOR\" /E /I /H /Y

if errorlevel 1 (
    echo [ERRO] Falha ao copiar projeto!
    pause
    exit /b 1
)

echo [OK] Projeto copiado!
echo.

echo [3/4] Limpando arquivos temporários da cópia...
if exist "C:\Projetos\GUEPARDO-ENTREGADOR\node_modules" (
    rmdir /s /q "C:\Projetos\GUEPARDO-ENTREGADOR\node_modules"
)
if exist "C:\Projetos\GUEPARDO-ENTREGADOR\package-lock.json" (
    del /f /q "C:\Projetos\GUEPARDO-ENTREGADOR\package-lock.json"
)
if exist "C:\Projetos\GUEPARDO-ENTREGADOR\dist" (
    rmdir /s /q "C:\Projetos\GUEPARDO-ENTREGADOR\dist"
)
echo [OK] Limpeza concluída!
echo.

echo [4/4] Abrindo nova pasta no Explorer...
explorer "C:\Projetos\GUEPARDO-ENTREGADOR"
echo.

echo ════════════════════════════════════════════════════════
echo   PROJETO MOVIDO COM SUCESSO!
echo ════════════════════════════════════════════════════════
echo.
echo Novo caminho: C:\Projetos\GUEPARDO-ENTREGADOR
echo.
echo PRÓXIMOS PASSOS:
echo.
echo 1. Abra o PowerShell na nova pasta
echo    (Botão direito -^> Abrir no Terminal)
echo.
echo 2. Execute os comandos:
echo    npm install
echo    npm run build
echo.
echo 3. A pasta 'dist' será criada com sucesso!
echo.
echo ════════════════════════════════════════════════════════
echo.
pause
