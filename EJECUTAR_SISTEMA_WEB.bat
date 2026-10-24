@echo off
title FITNESS LEGENDS - Servidor Web y ERP
color 0A

echo ======================================================================
echo           FITNESS LEGENDS GYM - SISTEMA WEB Y ERP
echo ======================================================================
echo.
echo [*] Directorio de trabajo: %~dp0
echo [*] Iniciando servidor web de produccion y base de datos...
echo.

cd /d "%~dp0"

REM Verificar si existe dist/, de lo contrario compilar
if not exist "dist\index.html" (
    echo [*] Compilando aplicacion web por primera vez...
    call npm.cmd run build
)

REM Iniciar servidor web y abrir navegador
node server\webServer.cjs
pause
