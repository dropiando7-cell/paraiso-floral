Set WshShell = CreateObject("WScript.Shell")
' Obtener el directorio actual del script
strCurDir = WshShell.CurrentDirectory
' Ejecutar pythonw.exe en segundo plano sin ventana
WshShell.Run "pythonw.exe """ & strCurDir & "\scripts\print_server_tickets.py""", 0, False
