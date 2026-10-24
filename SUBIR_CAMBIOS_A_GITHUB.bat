@echo off
title FITNESS LEGENDS - Sincronizar Cambios con GitHub
color 0A

echo ======================================================================
echo           FITNESS LEGENDS GYM - SINCRONIZADOR CON GITHUB
echo ======================================================================
echo.

cd /d "%~dp0"

echo [*] Estado actual del repositorio:
git status -s
echo.

set /p MSG="Ingresa una descripcion del cambio (presiona Enter para automatica): "
if "%MSG%"=="" (
    set MSG=Actualizacion del sistema %date% %time%
)

echo.
echo [*] Guardando cambios y preparando commit...
git add -A

git commit -m "%MSG%"

echo.
echo [*] Subiendo cambios a GitHub (repositorio origin/main)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================================
    echo   [OK] !Cambios subidos a GitHub exitosamente!
    echo   Repositorio: https://github.com/Cristiansairec94/legends-gym
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo   [!] Hubo un error al subir a GitHub. Revisa tu conexion.
    echo ======================================================================
)

echo.
pause
