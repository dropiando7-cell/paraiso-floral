import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin, ImageDraw, ImageFont, ImageChops
import io
import os
import urllib.parse

# Configuración Base
# Para probar local o desde otra red usa el URL correcto (ej. http://localhost:3000 o producción)
HOST = os.environ.get("SERVER_URL", "https://bioelectronicahn.vercel.app")

API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

# Nombre EXACTO de la impresora configurada en 'Dispositivos e Impresoras' de Windows
IMPRESORA = "NIIMBOT K3" 
TIEMPO_ESPERA = 3 # Segundos a sondear la BD

def imprimir_etiqueta(url_imagen):
    try:
        print(f"\n[*] Recibiendo: {url_imagen}")
        
        parsed_url = urllib.parse.urlparse(url_imagen)
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # 1. Conectar al Driver de la NIIMBOT K3
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(IMPRESORA)

        # 2. Obtener RESOLUCIÓN REAL CONFIGURADA EN WINDOWS (Crucial)
        ancho_printer = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_printer  = hDC.GetDeviceCaps(win32con.VERTRES)
        
        if ancho_printer <= 0 or alto_printer <= 0:
            ancho_printer, alto_printer = 406, 264

        # Reducir margen en 8 px (aprox 1mm) para asegurar que NUNCA 
        # se sobrepase la etiqueta física previniendo el salto a una 2da etiqueta negra.
        alto_seguro = max(alto_printer - 8, 100)

        print(f"[*] Margen Lógico Windows: Ancho {ancho_printer}px, Alto {alto_printer}px (Usando: {alto_seguro}px)")

        # 3. Decidir si dibujamos nativamente o usamos modo legacy
        if 'idQr' in query_params:
            print("[*] Generando etiqueta de forma NATIVA en Python para máxima nitidez...")
            id_qr = query_params.get('idQr', [''])[0]
            descripcion = query_params.get('descripcion', [''])[0].upper()[:60]
            fecha_adq = query_params.get('fechaAdq', [''])[0]
            if fecha_adq:
                fecha_adq = fecha_adq.split('T')[0]
            modelo = query_params.get('modelo', [''])[0]
            marca = query_params.get('marca', [''])[0]
            modelo_display = modelo if modelo else (marca if marca else "N/A")
            
            codigo_barras = query_params.get('codigoBarras', [''])[0]
            if not codigo_barras:
                codigo_barras = id_qr

            # Crear lienzo en blanco (modo RGB evita problemas de paleta negra en Windows)
            img_canvas = Image.new("RGB", (ancho_printer, alto_seguro), (255, 255, 255))
            draw = ImageDraw.Draw(img_canvas)
            
            # Intentar cargar fuente Arial, sino fallback a fuente por defecto
            try:
                font_id = ImageFont.truetype("arialbd.ttf", 24)
                font_desc = ImageFont.truetype("arialbd.ttf", 20 if len(descripcion) <= 22 else 17)
                font_small = ImageFont.truetype("arialbd.ttf", 16)
                font_barcode = ImageFont.truetype("arialbd.ttf", 15)
            except IOError:
                font_id = ImageFont.load_default()
                font_desc = ImageFont.load_default()
                font_small = ImageFont.load_default()
                font_barcode = ImageFont.load_default()

            # Dibujar textos (columna izquierda)
            x_text = 16
            y_text = 16
            draw.text((x_text, y_text), id_qr, font=font_id, fill=(0,0,0))
            
            # Wrap de descripción
            if len(descripcion) > 22:
                draw.text((x_text, y_text + 32), descripcion[:22], font=font_desc, fill=(0,0,0))
                draw.text((x_text, y_text + 54), descripcion[22:44], font=font_desc, fill=(0,0,0))
                y_offset = 80
            else:
                draw.text((x_text, y_text + 32), descripcion, font=font_desc, fill=(0,0,0))
                y_offset = 64
                
            draw.text((x_text, y_text + y_offset), f"Adq: {fecha_adq}", font=font_small, fill=(0,0,0))
            draw.text((x_text, y_text + y_offset + 22), f"Mod: {modelo_display}", font=font_small, fill=(0,0,0))

            # Obtener el QR mediante la API de bwipjs a la medida exacta
            qr_text = urllib.parse.quote(f"{HOST}/ficha-tecnica/{id_qr}")
            qr_url = f"https://bwipjs-api.metafloor.com/?bcid=qrcode&text={qr_text}&scale=2&eclevel=L&includetext=false"
            try:
                req_qr = requests.get(qr_url, timeout=5)
                if req_qr.status_code == 200:
                    qr_img = Image.open(io.BytesIO(req_qr.content)).convert("RGBA")
                    fondo_qr = Image.new("RGBA", qr_img.size, (255, 255, 255, 255))
                    try:
                        fondo_qr.paste(qr_img, mask=qr_img.split()[3])
                    except Exception:
                        fondo_qr.paste(qr_img)
                    qr_rgb = fondo_qr.convert("RGB")
                    
                    # Hacer el QR un poco más pequeño cortando el borde en blanco ("quiet zone") extra
                    diff = ImageChops.difference(qr_rgb, Image.new("RGB", qr_rgb.size, (255, 255, 255)))
                    bbox = diff.getbbox()
                    if bbox:
                        qr_rgb = qr_rgb.crop(bbox)
                        
                    qr_w, qr_h = qr_rgb.size
                    img_canvas.paste(qr_rgb, (ancho_printer - qr_w - 16, 16))
            except Exception as e:
                print(f"[-] Error obteniendo QR: {e}")

            # Obtener el código de barras 1D de bwipjs (más corto, height=6)
            bc_text = urllib.parse.quote(codigo_barras)
            bc_url = f"https://bwipjs-api.metafloor.com/?bcid=code128&text={bc_text}&height=6&scale=2&includetext=false"
            try:
                req_bc = requests.get(bc_url, timeout=5)
                if req_bc.status_code == 200:
                    bc_img = Image.open(io.BytesIO(req_bc.content)).convert("RGBA")
                    fondo_bc = Image.new("RGBA", bc_img.size, (255, 255, 255, 255))
                    try:
                        fondo_bc.paste(bc_img, mask=bc_img.split()[3])
                    except Exception:
                        fondo_bc.paste(bc_img)
                    bc_rgb = fondo_bc.convert("RGB")
                    
                    bc_w, bc_h = bc_rgb.size
                    # Si es muy ancho, escalar SÓLO a lo ancho con NEAREST
                    if bc_w > ancho_printer - 32:
                        bc_rgb = bc_rgb.resize((ancho_printer - 32, bc_h), Image.NEAREST)
                        bc_w = ancho_printer - 32
                    
                    x_bc = (ancho_printer - bc_w) // 2
                    y_bc = alto_seguro - bc_h - 22 # Margen inferior
                    img_canvas.paste(bc_rgb, (x_bc, y_bc))
                    
                    # Centrar texto abajo del CB
                    try:
                        bbox = font_barcode.getbbox(codigo_barras)
                        text_w = bbox[2] - bbox[0]
                    except AttributeError:
                        text_w = len(codigo_barras) * 10
                    x_t = (ancho_printer - text_w) // 2
                    draw.text((x_t, y_bc + bc_h + 2), codigo_barras, font=font_barcode, fill=(0,0,0))
            except Exception as e:
                print(f"[-] Error obteniendo Código de Barras: {e}")

            # Convertir a monocromático profundo (1 bit) EXACTAMENTE ANTES DE IMPRIMIR
            img_gris = img_canvas.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 200 else 255, "1")
            nuevo_alto = alto_seguro

        else:
            print("[*] Descargando imagen web completa (modo pre-renderizado)...")
            respuesta = requests.get(url_imagen, timeout=15)
            respuesta.raise_for_status()

            img = Image.open(io.BytesIO(respuesta.content))
            img = img.convert("RGBA")
            fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
            fondo.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = fondo.convert("RGB")

            # MANTENER PROPORCIÓN pero usando NEAREST para no difuminar bordes
            ratio = ancho_printer / float(img.width)
            nuevo_alto = int(min(img.height * ratio, alto_seguro))
            img_scaled = img.resize((ancho_printer, nuevo_alto), Image.NEAREST)

            # Binarización
            img_gris = img_scaled.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 200 else 255, "1")

        # Iniciar Print Job
        hDC.StartDoc("Etiqueta NIIMBOT Bioelectronica")
        hDC.StartPage()

        # Dibujar imagen ocupando el ancho completo
        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ancho_printer, nuevo_alto))

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()

        print("[+] Impresion NIIMBOT enviada exitosamente al spooler!")
        return True

    except Exception as e:
        print(f"[-] Error al imprimir: {e}")
        return False

def iniciar():
    print("=================================================")
    print(" SERVIDOR DE IMPRESION NIIMBOT K3 - Bioelectrónica ")
    print(f" Servidor URL: {HOST}")
    print(f" Impresora:    {IMPRESORA}")
    print("=================================================\n")
    print("Sondeando trabajos pendientes en la nube...")
    
    while True:
        try:
            res = requests.get(API_PENDIENTES, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                for trabajo in trabajos:
                    print(f"\n[+] --> TRABAJO INTERCEPTADO: ID #{trabajo['id']}")
                    
                    # La base de datos Prisma usa camelCase: urlImagen
                    url_img = trabajo.get('urlImagen') 
                    if not url_img:
                        print("[-] Error: Trabajo no contenía una URL de imagen válida.")
                        continue
                        
                    if imprimir_etiqueta(url_img):
                        requests.post(API_COMPLETAR, json={"id": trabajo['id']})
                        
        except requests.exceptions.RequestException:
            pass
        except Exception as e:
            print(f"[-] Error en el bucle principal: {e}")
            pass
            
        time.sleep(TIEMPO_ESPERA)

if __name__ == '__main__':
    iniciar()
