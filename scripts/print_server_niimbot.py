import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin, ImageDraw, ImageFont, ImageChops
import io
import os
import urllib.parse

# ─── Configuración Base ───────────────────────────────────────────────────────
HOST = os.environ.get("SERVER_URL", "https://bioelectronicahn.vercel.app")

API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

IMPRESORA     = "NIIMBOT K3"
TIEMPO_ESPERA = 3

# ─── Dimensiones — Etiqueta 50mm × 33mm @ 203 DPI ────────────────────────────
#   REQUISITO PREVIO: El driver Windows debe tener configurado 50mm × 33mm.
#   (Preferencias de impresión → Formulario en papel → Editar → Altura =  33.0mm)
#
#   50mm / 25.4 × 203 = ~399 px  (ancho)
#   33mm / 25.4 × 203 = ~263 px  (alto físico)
#   Alto seguro (93%)  = 245 px  ← techo duro para no quemar etiqueta extra
ANCHO_FIJO  = 399
ALTO_MAXIMO = 245   # ← NO subir este valor

# ─── Parámetros de layout ─────────────────────────────────────────────────────
QR_MARGEN     = 22   # px — margen del QR con borde derecho y superior
QR_ESCALA     = 1.2 # factor de reducción del QR (1.0 = tamaño natural de bwipjs)
CB_MARGEN_INF = 18   # px — espacio entre texto del CB y borde inferior (aumentado para evitar corte)
# ─────────────────────────────────────────────────────────────────────────────


def wrap_descripcion(texto, font, max_px=250):
    """Divide el texto en hasta 2 líneas midiendo píxeles reales con PIL.
    - Línea 1: llena con palabras completas hasta max_px.
    - Línea 2: el resto. Si es demasiado larga, trunca con '...' por palabras.
    Nunca corta una palabra a la mitad.
    """
    if not texto:
        return [texto]

    def medir(t):
        try:
            return font.getlength(t)
        except AttributeError:
            try:
                return font.getsize(t)[0]
            except Exception:
                return len(t) * 10

    # Todo cabe en una línea
    if medir(texto) <= max_px:
        return [texto]

    palabras = texto.split()
    linea1 = ""

    for i, palabra in enumerate(palabras):
        candidato = (linea1 + " " + palabra).strip() if linea1 else palabra
        if medir(candidato) <= max_px:
            linea1 = candidato
        else:
            # Resto va a línea 2
            palabras_l2 = palabras[i:]
            linea2 = " ".join(palabras_l2)

            # Si línea 2 cabe, perfecto
            if medir(linea2) <= max_px:
                return [linea1, linea2]

            # Si no cabe, truncar por palabras hasta que quede con "..."
            while palabras_l2:
                candidato_l2 = " ".join(palabras_l2) + "..."
                if medir(candidato_l2) <= max_px:
                    return [linea1, candidato_l2]
                palabras_l2.pop()

            # Caso extremo: una sola palabra muy larga — truncar por caracteres
            linea2_raw = " ".join(palabras[i:])
            while linea2_raw and medir(linea2_raw + "...") > max_px:
                linea2_raw = linea2_raw[:-1]
            return [linea1, linea2_raw + "..."]

    return [linea1]


def imprimir_etiqueta(url_imagen):
    try:
        print(f"\n[*] Recibiendo: {url_imagen}")

        parsed_url   = urllib.parse.urlparse(url_imagen)
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # Conectar al driver
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(IMPRESORA)

        # Log diagnóstico — solo informativo
        ancho_driver = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_driver  = hDC.GetDeviceCaps(win32con.VERTRES)
        print(f"[*] Driver reporta: {ancho_driver}×{alto_driver}px | Canvas fijo: {ANCHO_FIJO}×{ALTO_MAXIMO}px")

        if 'idQr' in query_params:
            print("[*] Generando etiqueta NATIVA...")

            id_qr         = query_params.get('idQr',        [''])[0]
            descripcion   = query_params.get('descripcion', [''])[0].upper()[:60]
            fecha_adq     = query_params.get('fechaAdq',    [''])[0]
            if fecha_adq:
                fecha_adq = fecha_adq.split('T')[0]
            modelo        = query_params.get('modelo', [''])[0]
            marca         = query_params.get('marca',  [''])[0]
            modelo_display = modelo if modelo else (marca if marca else "N/A")

            codigo_barras = query_params.get('codigoBarras', [''])[0]
            if not codigo_barras:
                codigo_barras = id_qr
                
            serie = query_params.get('serie', [''])[0] # <-- SERIE INTERCEPTADA

            # Canvas blanco
            img_canvas = Image.new("RGB", (ANCHO_FIJO, ALTO_MAXIMO), (255, 255, 255))
            draw = ImageDraw.Draw(img_canvas)

            # Fuentes
            try:
                font_id      = ImageFont.truetype("arialbd.ttf", 24)
                font_desc    = ImageFont.truetype("arialbd.ttf", 20 if len(descripcion) <= 22 else 17)
                font_small   = ImageFont.truetype("arialbd.ttf", 16)
                font_barcode = ImageFont.truetype("arialbd.ttf", 15)
            except IOError:
                font_id = font_desc = font_small = font_barcode = ImageFont.load_default()

            # ── QR (scale=1, tamaño natural sin resize forzado) ────────────
            qr_text = urllib.parse.quote(f"{HOST}/ficha-tecnica/{id_qr}")
            qr_url  = (
                f"https://bwipjs-api.metafloor.com/?bcid=qrcode"
                f"&text={qr_text}&scale=1&eclevel=L&includetext=false"
            )
            try:
                req_qr = requests.get(qr_url, timeout=5)
                if req_qr.status_code == 200:
                    qr_img   = Image.open(io.BytesIO(req_qr.content)).convert("RGBA")
                    fondo_qr = Image.new("RGBA", qr_img.size, (255, 255, 255, 255))
                    try:
                        fondo_qr.paste(qr_img, mask=qr_img.split()[3])
                    except Exception:
                        fondo_qr.paste(qr_img)
                    qr_rgb = fondo_qr.convert("RGB")

                    # Recortar quiet-zone sobrante
                    diff = ImageChops.difference(qr_rgb, Image.new("RGB", qr_rgb.size, (255, 255, 255)))
                    bbox = diff.getbbox()
                    if bbox:
                        qr_rgb = qr_rgb.crop(bbox)

                    qr_w, qr_h = qr_rgb.size

                    # Reducir QR con factor de escala + límite de área útil
                    area_util_h = ALTO_MAXIMO - QR_MARGEN * 2
                    factor = QR_ESCALA
                    if int(qr_h * factor) > area_util_h:
                        factor = area_util_h / qr_h
                    qr_rgb = qr_rgb.resize((max(1, int(qr_w * factor)), max(1, int(qr_h * factor))), Image.NEAREST)
                    qr_w, qr_h = qr_rgb.size

                    x_qr = ANCHO_FIJO - qr_w - QR_MARGEN
                    y_qr = QR_MARGEN
                    img_canvas.paste(qr_rgb, (x_qr, y_qr))
                    print(f"[*] QR: {qr_w}×{qr_h}px en ({x_qr}, {y_qr})")
            except Exception as e:
                print(f"[-] Error obteniendo QR: {e}")

            # ── Textos columna izquierda ───────────────────────────────────
            x_text = 14
            y_text = 12

            draw.text((x_text, y_text), id_qr, font=font_id, fill=(0, 0, 0))

            # Descripción con salto de linea por palabra (sin cortar palabras)
            lineas_desc = wrap_descripcion(descripcion, font=font_desc, max_px=250)
            if len(lineas_desc) >= 2:
                draw.text((x_text, y_text + 30), lineas_desc[0], font=font_desc, fill=(0, 0, 0))
                draw.text((x_text, y_text + 50), lineas_desc[1], font=font_desc, fill=(0, 0, 0))
                y_offset = 74
            else:
                draw.text((x_text, y_text + 30), lineas_desc[0], font=font_desc, fill=(0, 0, 0))
                y_offset = 56

            # Marca (más útil que fecha de adquisición que suele estar vacía)
            if marca:
                draw.text((x_text, y_text + y_offset), f"Marca: {marca}", font=font_small, fill=(0, 0, 0))
                y_marca = 20
            else:
                y_marca = 0
            draw.text((x_text, y_text + y_offset + y_marca), f"Mod: {modelo_display}", font=font_small, fill=(0, 0, 0))
            
            # Serie (SN) — posición relativa a Mod, que ya considera y_marca
            if serie:
                draw.text((x_text, y_text + y_offset + y_marca + 20), f"SN: {serie}", font=font_small, fill=(0, 0, 0))

            # BIOELECTRONICA — siempre visible, debajo del último campo
            bio_y = y_text + y_offset + y_marca + (40 if serie else 20)
            try:
                font_bio = ImageFont.truetype("arialbd.ttf", 15)
            except IOError:
                font_bio = font_barcode
            draw.text((x_text, bio_y), "BIOELECTRONICA", font=font_bio, fill=(0, 0, 0))

            # ── Código de barras 1D (layout desde abajo hacia arriba) ──────
            bc_text = urllib.parse.quote(codigo_barras)
            bc_url  = (
                f"https://bwipjs-api.metafloor.com/?bcid=code128"
                f"&text={bc_text}&height=6&scale=2&includetext=false"
            )
            try:
                req_bc = requests.get(bc_url, timeout=5)
                if req_bc.status_code == 200:
                    bc_img   = Image.open(io.BytesIO(req_bc.content)).convert("RGBA")
                    fondo_bc = Image.new("RGBA", bc_img.size, (255, 255, 255, 255))
                    try:
                        fondo_bc.paste(bc_img, mask=bc_img.split()[3])
                    except Exception:
                        fondo_bc.paste(bc_img)
                    bc_rgb = fondo_bc.convert("RGB")

                    bc_w, bc_h = bc_rgb.size
                    if bc_w > ANCHO_FIJO - 32:
                        bc_rgb = bc_rgb.resize((ANCHO_FIJO - 32, bc_h), Image.NEAREST)
                        bc_w, bc_h = bc_rgb.size

                    # Medir texto del CB
                    try:
                        t_bbox = font_barcode.getbbox(codigo_barras)
                        text_w = t_bbox[2] - t_bbox[0]
                        text_h = t_bbox[3] - t_bbox[1]
                    except AttributeError:
                        text_w = len(codigo_barras) * 10
                        text_h = 16

                    gap_texto  = 3
                    # Posiciones desde abajo
                    y_texto_cb = ALTO_MAXIMO - CB_MARGEN_INF - text_h
                    y_bc       = y_texto_cb - gap_texto - bc_h

                    if y_bc < 0:
                        y_bc = 2

                    x_bc = (ANCHO_FIJO - bc_w) // 2
                    img_canvas.paste(bc_rgb, (x_bc, y_bc))

                    x_t = (ANCHO_FIJO - text_w) // 2
                    draw.text((x_t, y_texto_cb), codigo_barras, font=font_barcode, fill=(0, 0, 0))

                    print(f"[*] CB: y={y_bc}  texto: y={y_texto_cb}  fin={y_texto_cb + text_h}  max={ALTO_MAXIMO}")
            except Exception as e:
                print(f"[-] Error obteniendo Código de Barras: {e}")

            # Binarizar — umbral 128: grises oscuros (#333, L≈80) → negro; blanco → blanco
            img_gris  = img_canvas.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")
            nuevo_alto = ALTO_MAXIMO

        else:
            print("[*] Modo legacy: imagen pre-renderizada...")
            respuesta = requests.get(url_imagen, timeout=15)
            respuesta.raise_for_status()

            img = Image.open(io.BytesIO(respuesta.content))
            img = img.convert("RGBA")
            fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
            fondo.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = fondo.convert("RGB")

            ratio      = ANCHO_FIJO / float(img.width)
            nuevo_alto = int(min(img.height * ratio, ALTO_MAXIMO))
            img_scaled = img.resize((ANCHO_FIJO, nuevo_alto), Image.NEAREST)

            img_gris  = img_scaled.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")

        # ── Enviar al spooler ──────────────────────────────────────────────
        hDC.StartDoc("Etiqueta NIIMBOT Bioelectronica")
        hDC.StartPage()

        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ANCHO_FIJO, nuevo_alto))

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()

        print(f"[+] Enviado al spooler — {ANCHO_FIJO}×{nuevo_alto}px")
        return True

    except Exception as e:
        print(f"[-] Error al imprimir: {e}")
        return False


def iniciar():
    print("=================================================")
    print(" SERVIDOR DE IMPRESION NIIMBOT K3 - Bioelectrónica  [V2]")
    print(f" Servidor URL : {HOST}")
    print(f" Impresora    : {IMPRESORA}")
    print(f" Canvas fijo  : {ANCHO_FIJO}×{ALTO_MAXIMO}px  (50mm×33mm @ 203 DPI, 93%)")
    print(f" Binarización : umbral 128 | Margen barcode: {CB_MARGEN_INF}px")
    print("=================================================\n")
    print("Sondeando trabajos pendientes en la nube...")

    while True:
        try:
            res = requests.get(API_PENDIENTES, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                for trabajo in trabajos:
                    print(f"\n[+] --> TRABAJO INTERCEPTADO: ID #{trabajo['id']}")
                    url_img = trabajo.get('urlImagen')
                    if not url_img:
                        print("[-] Error: Trabajo sin URL de imagen válida.")
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
