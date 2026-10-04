import time
import requests
import socket
import json
import os
import sys
import datetime

# Soporte para cola de impresión de Windows (USB / Drivers Star)
try:
    import win32print
    WIN32_DISPONIBLE = True
except ImportError:
    WIN32_DISPONIBLE = False

# ==============================================================================
# CONFIGURACIÓN DEL SERVIDOR Y LA IMPRESORA STAR BSC10II
# ==============================================================================
HOST = os.environ.get("SERVER_URL", "https://paraiso-floral.vercel.app")
API_PENDIENTES = f"{HOST}/api/impresion/tickets/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/tickets/completar"

# Nombre de impresora en Windows (para conexión por USB o Driver)
PRINTER_NAME = os.environ.get("PRINTER_NAME", "")

# IP y Puerto (para conexión por Cable de Red / Ethernet Socket)
PRINTER_IP = os.environ.get("PRINTER_IP", "192.168.100.3")
PRINTER_PORT = int(os.environ.get("PRINTER_PORT", 9100))

TIEMPO_ESPERA_ACTIVO = 1.0
TIEMPO_ESPERA_INACTIVO = 2.0

# Margen izquierdo y ancho de contenido para centrar en papel de 80mm
MARGIN_LEFT = "  "
ANCHO_CONTENIDO = 42

# ==============================================================================
# COMANDOS ESC/POS PARA IMPRESORAS TÉRMICAS (STAR BSC10 / EPSON COMPATIBLE)
# ==============================================================================
ESC = b'\x1b'
GS = b'\x1d'
LF = b'\n'

CMD_INIT = ESC + b'@'
CMD_CENTER = ESC + b'a\x01'
CMD_LEFT = ESC + b'a\x00'
CMD_RIGHT = ESC + b'a\x02'
CMD_BOLD_ON = ESC + b'E\x01'
CMD_BOLD_OFF = ESC + b'E\x00'
CMD_DOUBLE_HEIGHT = ESC + b'!\x10'
CMD_NORMAL = ESC + b'!\x00'
CMD_CUT = GS + b'V\x00'

def remove_accents(text):
    if not text: return ""
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
    }
    for search, replace in replacements.items():
        text = text.replace(search, replace)
    return text

def format_currency(amount):
    try:
        val = float(amount)
        return f"L {val:,.2f}"
    except:
        return f"L {amount}"

def build_receipt(data):
    """
    Construye los bytes ESC/POS crudos a partir de los datos del ticket.
    Con márgenes calibrados, alineación simétrica y pie de página profesional.
    """
    doc = data.get('documento', {})
    org = data.get('organization', {})
    items = data.get('items', [])
    cliente = data.get('cliente', {})

    receipt = bytearray()
    receipt.extend(CMD_INIT)
    
    # --- CABECERA (Centrada por hardware ESC/POS) ---
    receipt.extend(CMD_CENTER)
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(CMD_DOUBLE_HEIGHT)
    org_name = remove_accents(org.get('name', 'DISTRIBUIDORA PARAISO FLORAL, S. DE R.L.'))
    receipt.extend(org_name.encode('ascii', 'ignore') + LF)
    receipt.extend(CMD_NORMAL)
    receipt.extend(CMD_BOLD_OFF)
    
    rtn = org.get('rtn', '')
    if rtn:
        receipt.extend(f"RTN: {rtn}".encode('ascii', 'ignore') + LF)
    
    direccion = org.get('direccion', '')
    if direccion:
        import textwrap
        dir_lines = textwrap.wrap(remove_accents(direccion), width=38)
        for d_line in dir_lines:
            receipt.extend(d_line.encode('ascii', 'ignore') + LF)
    
    receipt.extend(LF)
    
    # --- DATOS FACTURA (Alineados a la izquierda con margen visual) ---
    receipt.extend(CMD_LEFT)
    correlativo = doc.get('correlativo') or doc.get('numero') or '000-001-01-00000001'
    receipt.extend(f"{MARGIN_LEFT}FACTURA NO: {correlativo}".encode('ascii', 'ignore') + LF)
    
    fecha = doc.get('fechaEmision') or doc.get('fecha') or ''
    if fecha:
        try:
            d = datetime.datetime.fromisoformat(str(fecha).replace('Z', '+00:00'))
            fecha_str = d.strftime("%d/%m/%Y %H:%M")
        except:
            fecha_str = str(fecha)
    else:
        fecha_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    receipt.extend(f"{MARGIN_LEFT}FECHA: {fecha_str}".encode('ascii', 'ignore') + LF)
    
    cai_val = doc.get('cai') or 'N/A'
    receipt.extend(f"{MARGIN_LEFT}CAI: {cai_val}".encode('ascii', 'ignore') + LF)
        
    cliente_nombre = remove_accents(cliente.get('nombre', 'CONSUMIDOR FINAL'))
    receipt.extend(f"{MARGIN_LEFT}CLIENTE: {cliente_nombre}".encode('ascii', 'ignore') + LF)
    if cliente.get('rtn'):
        receipt.extend(f"{MARGIN_LEFT}RTN CLIENTE: {cliente.get('rtn')}".encode('ascii', 'ignore') + LF)
    
    # Separador de 42 columnas centrado con margen
    sep_line = f"{MARGIN_LEFT}{'-' * ANCHO_CONTENIDO}"
    receipt.extend(sep_line.encode('ascii', 'ignore') + LF)
    
    # --- DETALLES DE PRODUCTOS (CANT(4) + DESCRIPCION(24) + TOTAL(14) = 42) ---
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(f"{MARGIN_LEFT}{'CANT':<4}{'DESCRIPCION':<24}{'TOTAL':>14}".encode('ascii', 'ignore') + LF)
    receipt.extend(CMD_BOLD_OFF)
    receipt.extend(sep_line.encode('ascii', 'ignore') + LF)
    
    import textwrap
    for item in items:
        cant_num = item.get('cantidad', 1)
        cant_str = str(cant_num)
        
        # Limpieza de descripción
        desc_full = remove_accents(item.get('descripcion', '')).replace('\r', '')
        desc_lines = desc_full.split('\n')
        desc_raw = desc_lines[0].strip()
        if "Producto registrado desde" in desc_raw:
            desc_raw = desc_raw.split("Producto registrado desde")[0].strip()
            
        desc_raw = remove_accents(item.get('nombre') or item.get('productoNombre') or desc_raw or "Producto").strip()
        
        total_val = item.get('totalLinea') or item.get('total') or 0
        total_str = format_currency(total_val)
        
        # Ajustar texto de producto a 24 caracteres por línea
        wrapped = textwrap.wrap(desc_raw, width=24)
        if not wrapped:
            wrapped = [""]
            
        for i, line in enumerate(wrapped):
            c_str = cant_str if i == 0 else ""
            t_str = total_str if i == len(wrapped) - 1 else ""
            line_str = f"{MARGIN_LEFT}{c_str:<4}{line:<24}{t_str:>14}"
            receipt.extend(line_str.encode('ascii', 'ignore') + LF)
        
    receipt.extend(sep_line.encode('ascii', 'ignore') + LF)
    
    # --- TOTALES (Alineación a la derecha perfecta: Label 26 + Monto 16 = 42) ---
    subtotal_num = doc.get('subTotal') or doc.get('subtotal') or 0
    if subtotal_num == 0 and items:
        subtotal_num = sum(float(it.get('totalLinea') or it.get('total') or 0) for it in items)
    subtotal_str = format_currency(subtotal_num)
    
    try:
        t15 = float(doc.get('totalGravado15', 0))
    except:
        t15 = 0.0
    try:
        t18 = float(doc.get('totalGravado18', 0))
    except:
        t18 = 0.0
        
    impuesto_num = (t15 * 0.15) + (t18 * 0.18)
    if impuesto_num == 0 and doc.get('isv'):
        try:
            impuesto_num = float(doc.get('isv'))
        except:
            pass
    impuesto_str = format_currency(impuesto_num)
    
    total_num = doc.get('total', 0)
    if total_num == 0:
        total_num = subtotal_num + impuesto_num
    total_str = format_currency(total_num)
    
    receipt.extend(f"{MARGIN_LEFT}{'SUBTOTAL:':<26}{subtotal_str:>16}".encode('ascii', 'ignore') + LF)
    if (impuesto_num > 0 or t15 > 0 or t18 > 0):
        receipt.extend(f"{MARGIN_LEFT}{'IMPUESTO (15%):':<26}{impuesto_str:>16}".encode('ascii', 'ignore') + LF)
    
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(f"{MARGIN_LEFT}{'TOTAL:':<26}{total_str:>16}".encode('ascii', 'ignore') + LF)
    receipt.extend(CMD_BOLD_OFF)
    
    receipt.extend(LF)
    
    # --- PIE DE PAGINA (100% Centrado con publicidad solicitada) ---
    receipt.extend(CMD_CENTER)
    receipt.extend(b"*** GRACIAS POR SU COMPRA ***" + LF)
    receipt.extend(b"Desarrollado por Soluciones Tecnologicas HN" + LF)
    receipt.extend(b"+504 94897451" + LF)
    
    # 8 líneas de avance para corte de papel limpio sin cortar el texto
    receipt.extend(LF * 8)
    receipt.extend(CMD_CUT)
    
    return bytes(receipt)

def buscar_impresora_windows():
    """Busca en Windows si hay una impresora Star o de tickets configurada."""
    if not WIN32_DISPONIBLE:
        return None
    try:
        printers = [p[2] for p in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)]
        if PRINTER_NAME and PRINTER_NAME in printers:
            return PRINTER_NAME
        for p in printers:
            p_upper = p.upper()
            if any(k in p_upper for k in ["STAR", "BSC10", "BSC-10", "TICKET", "POS-80", "RECEIPT"]):
                return p
        return None
    except Exception as e:
        print(f"[-] Error enumerando impresoras de Windows: {e}")
        return None

def imprimir_ticket_windows(data, target_printer):
    """Envía el ticket en modo RAW a la cola de Windows vía USB/Driver."""
    if not WIN32_DISPONIBLE:
        print("[-] win32print no está disponible en este entorno.")
        return False
    try:
        raw_data = build_receipt(data)
        print(f"[*] Enviando ticket a la impresora Windows: '{target_printer}' (Modo RAW)...")
        hPrinter = win32print.OpenPrinter(target_printer)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Ticket Paraiso Floral", None, "RAW"))
            try:
                win32print.StartPagePrinter(hPrinter)
                win32print.WritePrinter(hPrinter, raw_data)
                win32print.EndPagePrinter(hPrinter)
            finally:
                win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
        print("[+] Ticket enviado a Windows Spooler exitosamente.")
        return True
    except Exception as e:
        print(f"[-] Error imprimiendo en Windows '{target_printer}': {e}")
        return False

def imprimir_ticket_socket(data):
    """Envía el ticket directamente por TCP/IP Socket (puerto 9100)."""
    try:
        raw_data = build_receipt(data)
        print(f"[*] Conectando a {PRINTER_IP}:{PRINTER_PORT}...")
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(4.0)
        s.connect((PRINTER_IP, PRINTER_PORT))
        s.sendall(raw_data)
        s.close()
        print("[+] Ticket enviado por red a la impresora exitosamente.")
        return True
    except Exception as e:
        print(f"[-] Error enviando socket a la impresora ({PRINTER_IP}:{PRINTER_PORT}): {e}")
        return False

def imprimir_ticket(data):
    """Determina automáticamente el mejor método (USB Windows o Socket Red)."""
    win_printer = buscar_impresora_windows()
    if win_printer:
        return imprimir_ticket_windows(data, win_printer)
    return imprimir_ticket_socket(data)

def probar_impresion():
    """Genera e imprime un ticket de prueba con diseño centrado y pie de página actualizado."""
    print("\n--- GENERANDO TICKET DE PRUEBA ACTUALIZADO ---")
    datos_prueba = {
        "organization": {
            "name": "Distribuidora Paraiso Floral, S. de R.L.",
            "rtn": "05019023491749",
            "direccion": "8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortes"
        },
        "documento": {
            "correlativo": "000-001-01-00003270",
            "fechaEmision": datetime.datetime.now().isoformat(),
            "cai": "59E2BE-0CEE4D-D2A4E0-63BE03-09094F-EB",
            "subTotal": 5104.35,
            "totalGravado15": 5104.35,
            "total": 5870.00
        },
        "cliente": {
            "nombre": "SALMA FLORES",
            "rtn": "0501199501234"
        },
        "items": [
            {
                "cantidad": 1,
                "nombre": "BABY ECUADOR",
                "totalLinea": 350.00
            },
            {
                "cantidad": 4,
                "nombre": "ROSAS COLORES",
                "totalLinea": 1400.00
            },
            {
                "cantidad": 1,
                "nombre": "MARGARITAS BLANCAS",
                "totalLinea": 150.00
            },
            {
                "cantidad": 2,
                "nombre": "PITOSPORO",
                "totalLinea": 500.00
            },
            {
                "cantidad": 1,
                "nombre": "ENVIO",
                "totalLinea": 340.00
            }
        ]
    }
    
    win_printer = buscar_impresora_windows()
    if win_printer:
        print(f"[i] Impresora detectada: {win_printer}")
        
    resultado = imprimir_ticket(datos_prueba)
    if resultado:
        print("\n[✓] PRUEBA EXITOSA: El ticket con el diseño centrado fue enviado.")
    else:
        print("\n[X] ERROR: No se pudo comunicar con la impresora.")

def iniciar():
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        probar_impresion()
        return

    win_printer = buscar_impresora_windows()

    print("=========================================================")
    print("  SERVIDOR DE TICKETS STAR BSC10II - PARAÍSO FLORAL POS  ")
    print(f" Servidor ERP    : {HOST}")
    if win_printer:
        print(f" Impresora Modo  : USB / Windows Driver ('{win_printer}')")
    else:
        print(f" Impresora Modo  : Red Socket ({PRINTER_IP}:{PRINTER_PORT})")
    print(f" Protocolo       : ESC/POS (Raw Direct)")
    print("=========================================================\n")
    print("Tip: Puedes probar la impresora ejecutando: python scripts/print_server_tickets.py --test\n")

    org_id = os.environ.get("ORGANIZATION_ID", None)
    params = {}
    if org_id:
        params["orgId"] = org_id

    print("Sondeando tickets pendientes en la nube...\n")

    while True:
        tiempo_espera = TIEMPO_ESPERA_INACTIVO
        try:
            res = requests.get(API_PENDIENTES, params=params, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                if trabajos:
                    print(f"\n[+] Se encontraron {len(trabajos)} tickets pendientes...")
                    for trabajo in trabajos:
                        id_trabajo = trabajo['id']
                        raw_data = trabajo.get('urlImagen') or trabajo.get('url_imagen')
                        
                        print(f"\n[+] --> PROCESANDO TICKET ID #{id_trabajo}")
                        try:
                            datos = json.loads(raw_data)
                        except:
                            datos = {}
                            
                        if imprimir_ticket(datos):
                            res_post = requests.post(API_COMPLETAR, json={"id": id_trabajo})
                            if res_post.status_code == 200:
                                print(f"[+] Ticket #{id_trabajo} COMPLETADO exitosamente.")
                        else:
                            requests.post(API_COMPLETAR, json={"id": id_trabajo, "error": True})
                            print(f"[-] Ticket #{id_trabajo} falló al imprimir.")

                    tiempo_espera = TIEMPO_ESPERA_ACTIVO
        except requests.exceptions.RequestException:
            pass
        except Exception as e:
            print(f"[-] Error en el bucle principal: {e}")

        time.sleep(tiempo_espera)

if __name__ == '__main__':
    iniciar()
