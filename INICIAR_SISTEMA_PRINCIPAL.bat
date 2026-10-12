@echo off
title FITNESS LEGENDS - Sistema Central (Recepcion y Administracion)
color 0B

echo ======================================================================
echo           FITNESS LEGENDS GYM - SISTEMA CENTRAL ERP
echo           Recepcion, POS, Administracion y Servidor de Red LAN
echo ======================================================================
echo.
echo [*] Iniciando Servidor Central de Sincronizacion de Socios (Puerto 3001)...
start "FITNESS LEGENDS - Sync Server" /MIN node server/syncServer.cjs
echo [*] Servidor de Sincronizacion iniciado en segundo plano.
echo.
echo [*] Iniciando Interfaz Principal ERP y Servidor Web (Puerto 5173)...
echo [*] Las terminales independientes podran conectarse a esta IP.
echo.

cd /d "%~dp0"

call npm.cmd run dev -- --host
pause
