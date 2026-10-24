@echo off
title FITNESS LEGENDS - Sistema ERP de Escritorio
color 0B

echo ======================================================================
echo           FITNESS LEGENDS GYM - ERP ESCRITORIO
echo ======================================================================
echo.
echo [*] Iniciando servidor de sincronizacion local...
start "FITNESS LEGENDS - Sync Server" /MIN node "%~dp0server\syncServer.cjs"
echo [*] Servidor de sincronizacion listo en segundo plano.
echo.
echo [*] Abriendo Sistema ERP en modo escritorio...
start "" "%~dp0release\FITNESS_LEGENDS_TERMINAL-win32-x64\ControlDeAccesoLegends.exe" --main
