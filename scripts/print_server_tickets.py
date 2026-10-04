import time
import requests
import socket
import json
import os
import datetime

# ==============================================================================
# CONFIGURACIÓN DEL SERVIDOR Y LA IMPRESORA
# ==============================================================================
HOST = os.environ.get("SERVER_URL", "https://paraiso-floral.vercel.app")
API_PENDIENTES = f"{HOST}/api/impresion/tickets/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/tickets/completar"

# La IP de tu impresora Star BSC10
PRINTER_IP = "192.168.100.3"
PRINTER_PORT = 9100

TIEMPO_ESPERA_ACTIVO = 1.0
TIEMPO_ESPERA_INACTIVO = 2.0

# ==============================================================================
# COMANDOS ESC/POS PARA IMPRESORAS TÉRMICAS
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
        'ñ': 'n', 'Ñ': 'N'
    }
    for search, replace in replacements.items():
        text = text.replace(search, replace)
    return text

def format_currency(amount):
    try:
        return f"L {float(amount):,.2f}"
    except:
        return f"L {amount}"

def build_receipt(data):
    """
    Construye los bytes ESC/POS crudos a partir de los datos del ticket.
    """
    doc = data.get('documento', {})
    org = data.get('organization', {})
    items = data.get('items', [])
    cliente = data.get('cliente', {})

    receipt = bytearray()
    receipt.extend(CMD_INIT)
    
    # --- CABECERA ---
    receipt.extend(CMD_CENTER)
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(CMD_DOUBLE_HEIGHT)
    receipt.extend(remove_accents(org.get('name', 'DISTRIBUIDORA')).encode('ascii', 'ignore') + LF)
    receipt.extend(CMD_NORMAL)
    receipt.extend(CMD_BOLD_OFF)
    
    rtn = org.get('rtn', '')
    if rtn:
        receipt.extend(b"RTN: " + rtn.encode('ascii', 'ignore') + LF)
    
    direccion = org.get('direccion', '')
    if direccion:
        receipt.extend(remove_accents(direccion).encode('ascii', 'ignore') + LF)
    
    receipt.extend(LF)
    
    # --- DATOS FACTURA ---
    receipt.extend(CMD_LEFT)
    receipt.extend(b"FACTURA NO: " + str(doc.get('correlativo', '')).encode('ascii', 'ignore') + LF)
    
    fecha = doc.get('fechaEmision', '')
    if fecha:
        try:
            d = datetime.datetime.fromisoformat(fecha.replace('Z', '+00:00'))
            fecha_str = d.strftime("%d/%m/%Y %H:%M")
        except:
            fecha_str = str(fecha)
        receipt.extend(b"FECHA: " + fecha_str.encode('ascii', 'ignore') + LF)
    
    receipt.extend(b"CAI: " + str(doc.get('cai', 'N/A')).encode('ascii', 'ignore') + LF)
    receipt.extend(b"CLIENTE: " + remove_accents(cliente.get('nombre', 'CONSUMIDOR FINAL')).encode('ascii', 'ignore') + LF)
    if cliente.get('rtn'):
        receipt.extend(b"RTN CLIENTE: " + str(cliente.get('rtn')).encode('ascii', 'ignore') + LF)
    
    receipt.extend(b"-" * 42 + LF)
    
    # --- DETALLES ---
    # Formato: 42 columnas aprox en 80mm
    # CANT | DESCRIPCION | TOTAL
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(b"CANT DESCRIPCION                 TOTAL" + LF)
    receipt.extend(CMD_BOLD_OFF)
    receipt.extend(b"-" * 42 + LF)
    
    for item in items:
        cant = str(item.get('cantidad', 1))
        desc = remove_accents(item.get('descripcion', ''))[:25] # truncar descripcion a 25 char
        total = format_currency(item.get('total', 0))
        
        # Alinear columnas
        line = f"{cant:<4} {desc:<25} {total:>11}"
        receipt.extend(line.encode('ascii', 'ignore') + LF)
        
    receipt.extend(b"-" * 42 + LF)
    
    # --- TOTALES ---
    receipt.extend(CMD_RIGHT)
    subtotal = format_currency(doc.get('subtotal', 0))
    impuesto = format_currency(doc.get('totalImpuestos', 0))
    total = format_currency(doc.get('total', 0))
    
    receipt.extend(f"SUBTOTAL: {subtotal:>15}".encode('ascii', 'ignore') + LF)
    receipt.extend(f"IMPUESTO: {impuesto:>15}".encode('ascii', 'ignore') + LF)
    
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(CMD_DOUBLE_HEIGHT)
    receipt.extend(f"TOTAL: {total:>15}".encode('ascii', 'ignore') + LF)
    receipt.extend(CMD_NORMAL)
    receipt.extend(CMD_BOLD_OFF)
    
    receipt.extend(LF)
    
    # --- PIE DE PAGINA ---
    receipt.extend(CMD_CENTER)
    receipt.extend(b"*** GRACIAS POR SU COMPRA ***" + LF)
    receipt.extend(b"Desarrollado por Vorttek POS" + LF)
    
    # Alimentar papel y cortar
    receipt.extend(LF * 4)
    receipt.extend(CMD_CUT)
    
    return bytes(receipt)

def imprimir_ticket_socket(data):
    """
    Se conecta directamente por Sockets TCP/IP a la impresora en el puerto 9100.
    Esto BYPASSEA a Windows completamente y elimina problemas de la cola.
    """
    try:
        raw_data = build_receipt(data)
        
        print(f"[*] Conectando a {PRINTER_IP}:{PRINTER_PORT}...")
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5.0)
        s.connect((PRINTER_IP, PRINTER_PORT))
        
        s.sendall(raw_data)
        s.close()
        
        print("[+] Ticket enviado a la impresora exitosamente.")
        return True
    except Exception as e:
        print(f"[-] Error enviando socket a la impresora: {e}")
        return False

def iniciar():
    print("=========================================================")
    print("  SERVIDOR DE TICKETS STAR BSC10 - PARAÍSO FLORAL POS    ")
    print(f" Servidor ERP    : {HOST}")
    print(f" Impresora IP    : {PRINTER_IP}:{PRINTER_PORT} (Direct Socket)")
    print(f" Protocolo       : ESC/POS (Raw)")
    print("=========================================================\n")

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
                        
                        # Usamos urlImagen para guardar el JSON stringificado sin modificar Prisma
                        raw_data = trabajo.get('urlImagen') or trabajo.get('url_imagen')
                        
                        print(f"\n[+] --> PROCESANDO TICKET ID #{id_trabajo}")
                        try:
                            datos = json.loads(raw_data)
                        except:
                            datos = {}
                            
                        if imprimir_ticket_socket(datos):
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
