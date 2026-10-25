@echo off
title Gerente Virtual - Lavagem de Caminhoes
echo Iniciando Gerente Virtual em modo Aplicativo Independente...

cd /d "%~dp0"

:: Inicia o servidor de banco de dados se nao estiver rodando
netstat -ano | findstr :3001 >nul
if %errorlevel% neq 0 (
    echo Subindo servidor do banco de dados...
    start /B node server/index.js
    timeout /t 2 /nobreak >nul
)

:: Abre como Aplicativo Nativo de Desktop (janela independente sem barra de navegador)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3001
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3001
) else (
    start http://localhost:3001
)

exit
