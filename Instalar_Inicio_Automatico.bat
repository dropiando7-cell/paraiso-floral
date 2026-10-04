@echo off
title Configurar Inicio Automatico - Servidor Tickets
cd /d "%~dp0"

echo ========================================================
echo   CONFIGURANDO INICIO AUTOMATICO DEL SERVIDOR DE TICKETS 
echo ========================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_VBS=%TEMP%\CreateShortcut.vbs"

echo Creando acceso directo en la carpeta de Inicio de Windows...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo sLinkFile = "%STARTUP_FOLDER%\Servidor_Tickets_POS.lnk" >> "%SHORTCUT_VBS%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_VBS%"
echo oLink.TargetPath = "%~dp0Iniciar_Servidor_Tickets.bat" >> "%SHORTCUT_VBS%"
echo oLink.WorkingDirectory = "%~dp0" >> "%SHORTCUT_VBS%"
echo oLink.WindowStyle = 7 >> "%SHORTCUT_VBS%"
echo oLink.Description = "Servidor de Impresion Tickets Paraiso Floral" >> "%SHORTCUT_VBS%"
echo oLink.Save >> "%SHORTCUT_VBS%"

cscript //nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%"

echo.
echo [OK] Servidor de Tickets configurado para iniciar automaticamente al encender la PC!
echo.
pause
