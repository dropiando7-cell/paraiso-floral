import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageDraw, ImageFont, ImageWin, ImageOps
import qrcode
import io
from datetime import datetime

API_PENDIENTES = "https://sistemaselim.app/api/checkin/pendientes"
API_COMPLETAR  = "https://sistemaselim.app/api/checkin/completar"
IMPRESORA      = "TSC TE200"
TIEMPO_ESPERA  = 3

ancho_etiqueta = 609
alto_etiqueta = 406

LOGO_IMG = None

def inicializar_logo():
    global LOGO_IMG
    try:
        url = "https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blanco-1.png"
        res = requests.get(url, timeout=3)
        img = Image.open(io.BytesIO(res.content)).convert("RGBA")
        
        r, g, b, a = img.split()
        rgb_img = Image.merge('RGB', (r,g,b))
        rgb_img = ImageOps.invert(rgb_img)
        
        final_img = Image.new("RGBA", img.size)
        data = []
        for c, alpha in zip(rgb_img.getdata(), a.getdata()):
            data.append((0, 0, 0, alpha))
        final_img.putdata(data)
        LOGO_IMG = final_img.resize((45, 45), Image.Resampling.LANCZOS)
    except Exception as e:
        pass

def get_font(size, bold=False):
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

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + word + " "
        bbox = draw.textbbox((0,0), test_line, font=font)
        if bbox[2] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line.strip())
            current_line = word + " "
    if current_line:
        lines.append(current_line.strip())
    return "\n".join(lines)

def draw_header(draw, img, is_padre=False):
    # Logo
    if LOGO_IMG:
        img.paste(LOGO_IMG, (15, 10), LOGO_IMG)
        draw.text((65, 23), "Elim Honduras", fill="black", font=get_font(24, True))
    else:
        draw.text((20, 20), "Elim Honduras", fill="black", font=get_font(26, True))

    title = "ETIQUETA DE PADRES" if is_padre else "ETIQUETA DE NIÑOS"
    # Make parent title bigger or have a background to stand out
    if is_padre:
        t_font = get_font(22, True)
        bbox = draw.textbbox((0,0), title, font=t_font)
        draw.rectangle([15, 60, 25+bbox[2], 65+bbox[3]+10], fill="black")
        draw.text((20, 65), title, fill="white", font=t_font)
    else:
        draw.text((20, 65), title, fill="black", font=get_font(18, True))


def draw_footer(draw):
    footer_text = "NO PIERDAS ESTE PASE · REQUERIDO A LA SALIDA"
    font = get_font(14, True)
    bbox = draw.textbbox((0,0), footer_text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((ancho_etiqueta - w)/2, 375), footer_text, fill="black", font=font)
    draw.line([(0, 365), (ancho_etiqueta, 365)], fill="gray", width=1)

def crear_imagen_nino(ticket, family_data):
    img = Image.new("RGB", (ancho_etiqueta, alto_etiqueta), "white")
    draw = ImageDraw.Draw(img)

    padre = family_data.get('parentName', '')
    tel = family_data.get('parentPhone', '') or ticket.get('parentPhone', '')
    hora = family_data.get('checkInTime', '')
    codigo = family_data.get('code', ticket.get('code', ''))
    
    # Division Line
    draw.line([(400, 15), (400, 350)], fill="black", width=2)
    
    draw_header(draw, img, False)
    
    # Nombre Nino (Wrapped and Huge)
    nombre = ticket.get('name', '')
    font_name = get_font(56, True)
    if len(nombre) > 14: font_name = get_font(48, True)
    if len(nombre) > 19: font_name = get_font(40, True)
    wrapped_name = wrap_text(nombre, font_name, 370, draw)
    draw.text((20, 95), wrapped_name, fill="black", font=font_name)
    
    # Determine Y offset based on name lines
    lines = len(wrapped_name.split('\n'))
    y_offset = 95 + (lines * font_name.size) + 20

    fecha_str = datetime.now().strftime("%d/%m/%Y")
    draw.text((20, y_offset), f"{fecha_str} {hora}", fill="black", font=get_font(20, True))
    
    cel_str = tel.replace("+504", "").strip() if tel else ""
    draw.text((20, y_offset + 30), f"NO. CEL: {cel_str}", fill="black", font=get_font(26, True))
    draw.text((20, y_offset + 65), f"Padre: {padre[:35]}", fill="black", font=get_font(20, True))

    alergias = ticket.get('allergies', '')
    if alergias and alergias.lower() not in ['ninguna', '']:
        text_alergia = f"⚠ Alergias: {alergias[:40]}"
        al_font = get_font(18, True)
        bbox = draw.textbbox((0,0), text_alergia, font=al_font)
        draw.rectangle([20, y_offset + 95, 30+bbox[2], y_offset + 122], fill="#eeeeee", outline="#cccccc")
        draw.text((25, y_offset + 98), text_alergia, fill="black", font=al_font)

    # Right side: Code & QR
    code_font = get_font(30, True)
    c_bbox = draw.textbbox((0,0), codigo, font=code_font)
    cw = c_bbox[2]
    cx = 410 + (190 - cw) / 2
    draw.rounded_rectangle([cx - 15, 30, cx + cw + 15, 75], radius=10, outline="black", width=3)
    draw.text((cx, 37), codigo, fill="black", font=code_font)
    
    qr_img = generar_qr(ticket.get('qrValue', ''), 160)
    img.paste(qr_img, (410 + (190-160)//2, 90))
    
    draw_footer(draw)
    return img

def crear_imagen_padre(family_data):
    img = Image.new("RGB", (ancho_etiqueta, alto_etiqueta), "white")
    draw = ImageDraw.Draw(img)

    padre = family_data.get('parentName', '')
    tel = family_data.get('parentPhone', '')
    hora = family_data.get('checkInTime', '')
    codigo = family_data.get('code', '')
    ninos_count = len(family_data.get('tickets', []))
    
    draw.line([(400, 15), (400, 350)], fill="black", width=2)
    draw_header(draw, img, True)
    
    font_name = get_font(48, True)
    wrapped_name = wrap_text(padre, font_name, 370, draw)
    draw.text((20, 105), wrapped_name, fill="black", font=font_name)
    
    lines = len(wrapped_name.split('\n'))
    y_offset = 105 + (lines * font_name.size) + 40
    
    fecha_str = datetime.now().strftime("%d/%m/%Y")
    draw.text((20, y_offset), f"{fecha_str} {hora}", fill="black", font=get_font(20, True))
    
    cel_str = tel.replace("+504", "").strip() if tel else ""
    draw.text((20, y_offset + 30), f"NO. CEL: {cel_str}", fill="black", font=get_font(26, True))
    draw.text((20, y_offset + 70), f"Niños ingresados: {ninos_count}", fill="black", font=get_font(20, True))

    # Right side: Code & QR Code
    code_font = get_font(30, True)
    c_bbox = draw.textbbox((0,0), codigo, font=code_font)
    cw = c_bbox[2]
    cx = 410 + (190 - cw) / 2
    draw.rounded_rectangle([cx - 15, 30, cx + cw + 15, 75], radius=10, outline="black", width=3)
    draw.text((cx, 37), codigo, fill="black", font=code_font)

    # QR Code
    qr_val = family_data.get('qrValue', '')
    if not qr_val and family_data.get('tickets'):
        qr_val = family_data['tickets'][0].get('qrValue', '')
    
    if qr_val:
        qr_img = generar_qr(qr_val, 160)
        img.paste(qr_img, (410 + (190-160)//2, 90))
    
    draw_footer(draw)
    
    # Draw THICK black border around the entire label for parents to make it hyper-distinct
    draw.rectangle([0, 0, ancho_etiqueta-1, alto_etiqueta-1], outline="black", width=12)
    
    return img

def imprimir_imagen(img_pil):
    try:
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(IMPRESORA)

        ancho_printer = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_printer  = hDC.GetDeviceCaps(win32con.VERTRES)
        
        # Rotar la imagen 180 grados puede ser necesario en las TSC termicas para top-to-bottom
        # Si la web la imprimia bien rotada o no, PIL se encarga de estirarla
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
    inicializar_logo() # Fetch the logo on startup
    print("=========================================")
    print(" SERVIDOR CHECK-IN ELIM (Python PIL v2)")
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
