import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageDraw, ImageFont, ImageWin
import qrcode
import io
from datetime import datetime

API_PENDIENTES = "https://sistemaselim.app/api/checkin/pendientes"
API_COMPLETAR  = "https://sistemaselim.app/api/checkin/completar"
IMPRESORA      = "TSC TE200"
TIEMPO_ESPERA  = 3

# Configuracion base para etiqueta 3x2 pulgadas
ancho_etiqueta = 600
alto_etiqueta = 400

def get_font(size, bold=False):
    # Intentar cargar fuente Arial, si no usar default
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except:
        return ImageFont.load_default()

def generar_qr(datos, size=150):
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(datos)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    return img_qr.resize((size, size))

def crear_imagen_nino(ticket, family_data):
    img = Image.new("RGB", (ancho_etiqueta, alto_etiqueta), "white")
    draw = ImageDraw.Draw(img)

    padre = family_data.get('parentName', '')
    tel = family_data.get('parentPhone', '') or ticket.get('parentPhone', '')
    hora = family_data.get('checkInTime', '')
    codigo = family_data.get('code', ticket.get('code', ''))

    # Titulo "Elim Honduras"
    draw.text((20, 20), "ELIM HONDURAS", fill="black", font=get_font(24, True))
    
    # "INGRESO NIÑO(A)"
    draw.text((20, 60), "INGRESO NIÑO(A)", fill="gray", font=get_font(18, True))
    
    # Nombre Nino
    nombre_nino = ticket.get('name', '')
    draw.text((20, 90), nombre_nino[:25], fill="black", font=get_font(42, True))
    
    # Fecha y Hora
    fecha_str = datetime.now().strftime("%d/%m/%Y") + " " + hora
    draw.text((20, 150), fecha_str, fill="black", font=get_font(20))
    
    # Celular
    celular_limpio = tel.replace("+504", "").strip()
    draw.text((20, 180), f"NO. CEL: {celular_limpio}", fill="black", font=get_font(24, True))
    
    # Nombre Padre
    draw.text((20, 220), f"Padre: {padre[:30]}", fill="black", font=get_font(20, True))
    
    # Alergias
    alergias = ticket.get('allergies', 'Ninguna')
    if alergias and alergias.lower() != 'ninguna':
        draw.rectangle([20, 260, 580, 310], fill="#eeeeee")
        draw.text((30, 275), f"Alergias: {alergias[:40]}", fill="black", font=get_font(20, True))

    # Generar QR
    img_qr = generar_qr(ticket.get('qrValue', ''), 140)
    img.paste(img_qr, (420, 80))
    
    # Codigo Ticket arriba del QR
    draw.text((450, 40), codigo, fill="black", font=get_font(28, True))
    
    # Pie de pagina
    draw.text((90, 360), "NO PIERDAS ESTE PASE - REQUERIDO A LA SALIDA", fill="black", font=get_font(16, True))

    return img

def crear_imagen_padre(family_data):
    img = Image.new("RGB", (ancho_etiqueta, alto_etiqueta), "white")
    draw = ImageDraw.Draw(img)

    padre = family_data.get('parentName', '')
    tel = family_data.get('parentPhone', '')
    hora = family_data.get('checkInTime', '')
    codigo = family_data.get('code', '')
    ninos_count = len(family_data.get('tickets', []))

    draw.text((20, 20), "ELIM HONDURAS", fill="black", font=get_font(24, True))
    draw.text((20, 60), "INGRESO PADRE/TUTOR", fill="gray", font=get_font(18, True))
    
    draw.text((20, 90), padre[:25], fill="black", font=get_font(36, True))
    
    fecha_str = datetime.now().strftime("%d/%m/%Y") + " " + hora
    draw.text((20, 160), fecha_str, fill="black", font=get_font(20))
    
    celular_limpio = tel.replace("+504", "").strip() if tel else ""
    draw.text((20, 190), f"NO. CEL: {celular_limpio}", fill="black", font=get_font(24, True))
    
    draw.text((20, 230), f"Niños ingresados: {ninos_count}", fill="black", font=get_font(20, True))
    
    # Bloque de "PASE PADRES" en la derecha
    draw.rectangle([400, 100, 560, 260], outline="black", width=3)
    draw.text((425, 150), "PASE\nPADRES", fill="gray", font=get_font(26, True), align="center")
    draw.text((425, 50), codigo, fill="black", font=get_font(32, True))

    draw.text((90, 360), "NO PIERDAS ESTE PASE - REQUERIDO A LA SALIDA", fill="black", font=get_font(16, True))

    return img

def imprimir_imagen(img_pil):
    try:
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(IMPRESORA)

        ancho_printer = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_printer  = hDC.GetDeviceCaps(win32con.VERTRES)
        
        # Binarizacion rapida y escalado simple adaptativo a la impresora
        img_scaled = img_pil.resize((ancho_printer, alto_printer), Image.LANCZOS).convert("1")
        
        hDC.StartDoc("Etiqueta Checkin")
        hDC.StartPage()
        
        dib = ImageWin.Dib(img_scaled)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ancho_printer, alto_printer))
        
        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        return True
    except Exception as e:
        print(f"[-] Error Imprimiendo: {e}")
        return False

def procesar_impresion(datos_json):
    is_family = datos_json.get('type') == 'FAMILY'
    tickets = datos_json.get('tickets', [])
    if not isinstance(tickets, list) or len(tickets) == 0:
        tickets = [datos_json]

    # Imprimir Ninios
    for tk in tickets:
        img = crear_imagen_nino(tk, datos_json)
        if not imprimir_imagen(img): return False
    
    # Imprimir Padre
    if is_family:
        img = crear_imagen_padre(datos_json)
        if not imprimir_imagen(img): return False

    return True

def iniciar():
    print("=========================================")
    print(" SERVIDOR CHECK-IN ELIM (Python PIL)")
    print(f" Impresora Configurada: {IMPRESORA}")
    print("=========================================\n")
    print("[*] Esperando trabajos... (Ctrl+C para salir)")
    while True:
        try:
            res = requests.get(API_PENDIENTES, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                for trab in trabajos:
                    print(f"\n[+] --> TRABAJO CHECKIN: #{trab['id']}")
                    datos = trab.get('datosObjeto', {})
                    if procesar_impresion(datos):
                        requests.post(API_COMPLETAR, json={"id": trab['id']})
                        print(f"[+] Completado: {trab['id']}")
                    else:
                        requests.post(API_COMPLETAR, json={"id": trab['id'], "error": "Fallo impresion win32"})
                        print(f"[-] Marcado con Error: {trab['id']}")
        except Exception as e:
            pass
        time.sleep(TIEMPO_ESPERA)

if __name__ == '__main__':
    iniciar()
