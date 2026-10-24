@echo off
title FITNESS LEGENDS - Control Biometrico Web
color 0E

echo ======================================================================
echo           FITNESS LEGENDS GYM - CONTROL BIOMETRICO WEB
echo           Terminal de Acceso y Torniquete en Navegador Web
echo ======================================================================
echo.
echo [*] Directorio de trabajo: %~dp0
echo [*] Verificando servidor web de produccion...
echo.

cd /d "%~dp0"

REM Verificar si existe dist/index.html, de lo contrario compilar
if not exist "dist\index.html" (
    echo [*] Compilando aplicacion web por primera vez...
    call npm.cmd run build
)

REM Iniciar servidor web de sincronizacion y produccion en segundo plano
start "FITNESS LEGENDS - Servidor Web" /MIN node server\webServer.cjs

timeout /t 2 /nobreak >nul

echo [*] Abriendo Control Biometrico en el Navegador Web...
echo [*] Direccion: http://localhost:5173/?mode=terminal
echo.

REM Intentar abrir en modo aplicacion web sin bordes de navegador si Chrome o Edge estan instalados
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://localhost:5173/?mode=terminal"
    exit
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:5173/?mode=terminal"
    exit
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:5173/?mode=terminal"
    exit
)

REM Si no, abrir con el navegador predeterminado
start "" "http://localhost:5173/?mode=terminal"
exit
