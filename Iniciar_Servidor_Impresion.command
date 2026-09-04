#!/bin/bash
cd "$(dirname "$0")"
echo "========================================================"
echo "    INICIANDO SERVIDOR DE IMPRESIÓN PARAÍSO FLORAL    "
echo "========================================================"
echo "Ejecutando servidor de impresión..."
echo ""
python3 scripts/print_server_macos.py
echo ""
echo "El servidor se ha detenido. Presiona cualquier tecla para cerrar esta ventana..."
read -n 1
