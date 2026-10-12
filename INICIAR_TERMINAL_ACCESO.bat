@echo off
title FITNESS LEGENDS - Terminal de Control de Acceso (Torniquete)
color 0E

echo ======================================================================
echo           FITNESS LEGENDS GYM - TERMINAL DE ACCESO
echo           App de Escritorio para Equipo Independiente
echo ======================================================================
echo.
echo [*] Iniciando aplicacion de control de acceso para torniquete...
echo [*] Modo: Equipo Independiente (Standalone)
echo.

cd /d "%~dp0"

REM Ejecutar aplicacion de escritorio en modo terminal
npm.cmd run desktop:terminal

if %errorlevel% neq 0 (
    echo.
    echo [!] Hubo un error al iniciar la aplicacion de escritorio.
    echo [*] Intentando iniciar servidor local...
    call npm.cmd run preview -- --host
    pause
)
