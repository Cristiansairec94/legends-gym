@echo off
title FITNESS LEGENDS - Sistema Central (Recepcion y Administracion)
color 0B

echo ======================================================================
echo           FITNESS LEGENDS GYM - SISTEMA CENTRAL ERP
echo           Recepcion, POS, Administracion y Servidor de Red
echo ======================================================================
echo.
echo [*] Iniciando servidor con acceso para terminales en Red Local (LAN)...
echo [*] Las terminales independientes podran conectarse a esta IP.
echo.

cd /d "%~dp0"

call npm.cmd run dev -- --host
pause
