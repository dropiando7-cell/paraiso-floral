@echo off
title Servidor de Impresion Tickets - Paraiso Floral
cd /d "%~dp0"
echo ========================================================
echo   SERVIDOR DE IMPRESION STAR BSC10II - PARAISO FLORAL   
echo ========================================================
echo.
python scripts/print_server_tickets.py
echo.
echo El servidor se ha detenido. Presiona una tecla para salir...
pause >nul
