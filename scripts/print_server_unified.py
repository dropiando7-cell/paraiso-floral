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

IMPRESORAS_SOPORTADAS = {
    "Niimbot": "NIIMBOT K3",  # Nombre en Windows para Niimbot
    "TSC TE200": "TSC TE200"  # Nombre en Windows para TSC
}
TIEMPO_ESPERA = 15

# ─── Tamaños de Etiqueta ──────────────────────────────────────────────────────
# Se define un diccionario con las configuraciones según el tamaño deseado.
# 70x40mm: Ancho = 559px, Alto = 320px -> Alto seguro = 310px
# 50x33mm: Ancho = 399px, Alto = 263px -> Alto seguro = 245px
# 50x25mm: Ancho = 399px, Alto = 200px -> Alto seguro = 185px
TAMANOS = {
    "50x25": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 198,
        "QR_MARGEN": 16,
        "QR_SCALE": 1,
        "CB_MARGEN_INF": 16,
        "CB_HEIGHT": 6,
        "CB_SCALE": 2,
        "FONT_ID": 20,
        "FONT_DESC_LONG": 14,
        "FONT_DESC_SHORT": 16,
        "FONT_SMALL": 13,
        "FONT_BARCODE": 12,
        "FONT_BIO": 13,
        "WRAP_MAX_PX": 260,
        "X_TEXT": 12,
        "Y_TEXT": 14,
        "Y_OFFSET_2_LINES": 68,
        "Y_OFFSET_1_LINE": 50,
        "MARCA_Y_OFFSET": 14,
        "SERIE_Y_OFFSET": 14,
        "BIO_Y_OFFSET_SERIE": 28,
        "BIO_Y_OFFSET_NO_SERIE": 14,
    },
    "50x30": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 240,
        "QR_MARGEN": 20,
        "QR_SCALE": 1,
        "CB_MARGEN_INF": 24,
        "CB_HEIGHT": 8,
        "CB_SCALE": 2,
        "FONT_ID": 24,
        "FONT_DESC_LONG": 16,
        "FONT_DESC_SHORT": 18,
        "FONT_SMALL": 15,
        "FONT_BARCODE": 14,
        "FONT_BIO": 14,
        "WRAP_MAX_PX": 250,
        "X_TEXT": 14,
        "Y_TEXT": 18,
        "Y_OFFSET_2_LINES": 72,
        "Y_OFFSET_1_LINE": 54,
        "MARCA_Y_OFFSET": 18,
        "SERIE_Y_OFFSET": 18,
        "BIO_Y_OFFSET_SERIE": 36,
        "BIO_Y_OFFSET_NO_SERIE": 18,
    },
    "50x33": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 245,
        "QR_MARGEN": 22,
        "QR_SCALE": 1,
        "CB_MARGEN_INF": 26,
        "CB_HEIGHT": 8,
        "CB_SCALE": 2,
        "FONT_ID": 24,
        "FONT_DESC_LONG": 17,
        "FONT_DESC_SHORT": 20,
        "FONT_SMALL": 16,
        "FONT_BARCODE": 15,
        "FONT_BIO": 15,
        "WRAP_MAX_PX": 250,
        "X_TEXT": 14,
        "Y_TEXT": 20,
        "Y_OFFSET_2_LINES": 74,
        "Y_OFFSET_1_LINE": 56,
        "MARCA_Y_OFFSET": 20,
        "SERIE_Y_OFFSET": 20,
        "BIO_Y_OFFSET_SERIE": 40,
        "BIO_Y_OFFSET_NO_SERIE": 20,
    },
    "70x40": {
        "ANCHO_FIJO": 559,
        "ALTO_MAXIMO": 310,
        "QR_MARGEN": 16,
        "QR_SCALE": 2,
        "CB_MARGEN_INF": 18,
        "CB_HEIGHT": 10,
        "CB_SCALE": 2,
        "FONT_ID": 34,
        "FONT_DESC_LONG": 22,
        "FONT_DESC_SHORT": 26,
        "FONT_SMALL": 20,
        "FONT_BARCODE": 18,
        "FONT_BIO": 18,
        "WRAP_MAX_PX": 390,
        "X_TEXT": 16,
        "Y_TEXT": 16,
        "Y_OFFSET_2_LINES": 105,
        "Y_OFFSET_1_LINE": 80,
        "MARCA_Y_OFFSET": 26,
        "SERIE_Y_OFFSET": 26,
        "BIO_Y_OFFSET_SERIE": 52,
        "BIO_Y_OFFSET_NO_SERIE": 26,
    }
}
DEFAULT_SIZE = "50x25"
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


def imprimir_etiqueta(url_imagen, impresora_solicitada, tamano_solicitado):
    try:
        print(f"\n[*] Recibiendo: {url_imagen}")

        impresora_win = IMPRESORAS_SOPORTADAS.get(impresora_solicitada, IMPRESORAS_SOPORTADAS["Niimbot"])

        parsed_url   = urllib.parse.urlparse(url_imagen)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        # Determinar configuración de tamaño
        size_param = tamano_solicitado or query_params.get('size', [DEFAULT_SIZE])[0]
        if size_param not in TAMANOS:
            size_param = DEFAULT_SIZE
        cfg = TAMANOS[size_param]

        # Conectar al driver
        hDC = win32ui.CreateDC()
        try:
            hDC.CreatePrinterDC(impresora_win)
        except Exception as e:
            print(f"[-] Error conectando a la impresora {impresora_win}: {e}")
            return False

        # Log diagnóstico — solo informativo
        ancho_driver = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_driver  = hDC.GetDeviceCaps(win32con.VERTRES)
        print(f"[*] Impresora: {impresora_win} | Driver reporta: {ancho_driver}×{alto_driver}px | Canvas fijo: {cfg['ANCHO_FIJO']}×{cfg['ALTO_MAXIMO']}px | Tamaño: {size_param}")

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
            img_canvas = Image.new("RGB", (cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']), (255, 255, 255))
            draw = ImageDraw.Draw(img_canvas)

            # Fuentes
            try:
                font_id      = ImageFont.truetype("arialbd.ttf", cfg['FONT_ID'])
                font_desc    = ImageFont.truetype("arialbd.ttf", cfg['FONT_DESC_SHORT'] if len(descripcion) <= 22 else cfg['FONT_DESC_LONG'])
                font_small   = ImageFont.truetype("arialbd.ttf", cfg['FONT_SMALL'])
                font_barcode = ImageFont.truetype("arialbd.ttf", cfg['FONT_BARCODE'])
            except IOError:
                font_id = font_desc = font_small = font_barcode = ImageFont.load_default()

            # ── QR (con escala entera nativa sin distorsión por resize) ────
            qr_text = urllib.parse.quote(f"{HOST}/ficha-tecnica/{id_qr}")
            qr_scale = cfg.get('QR_SCALE', 3)
            qr_url  = (
                f"https://bwipjs-api.metafloor.com/?bcid=qrcode"
                f"&text={qr_text}&scale={qr_scale}&eclevel=M&includetext=false"
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

                    x_qr = cfg['ANCHO_FIJO'] - qr_w - cfg['QR_MARGEN']
                    y_qr = cfg['QR_MARGEN']
                    img_canvas.paste(qr_rgb, (x_qr, y_qr))
                    print(f"[*] QR: {qr_w}×{qr_h}px en ({x_qr}, {y_qr})")
            except Exception as e:
                print(f"[-] Error obteniendo QR: {e}")

            # ── Textos columna izquierda ───────────────────────────────────
            x_text = cfg['X_TEXT']
            y_text = cfg['Y_TEXT']

            draw.text((x_text, y_text), id_qr, font=font_id, fill=(0, 0, 0))

            # Descripción con salto de linea por palabra (sin cortar palabras)
            lineas_desc = wrap_descripcion(descripcion, font=font_desc, max_px=cfg['WRAP_MAX_PX'])
            if len(lineas_desc) >= 2:
                draw.text((x_text, y_text + 30), lineas_desc[0], font=font_desc, fill=(0, 0, 0))
                draw.text((x_text, y_text + 50), lineas_desc[1], font=font_desc, fill=(0, 0, 0))
                y_offset = cfg['Y_OFFSET_2_LINES']
            else:
                draw.text((x_text, y_text + 30), lineas_desc[0], font=font_desc, fill=(0, 0, 0))
                y_offset = cfg['Y_OFFSET_1_LINE']

            # Marca (más útil que fecha de adquisición que suele estar vacía)
            if marca:
                draw.text((x_text, y_text + y_offset), f"Marca: {marca}", font=font_small, fill=(0, 0, 0))
                y_marca = cfg['MARCA_Y_OFFSET']
            else:
                y_marca = 0
            draw.text((x_text, y_text + y_offset + y_marca), f"Mod: {modelo_display}", font=font_small, fill=(0, 0, 0))
            
            # Serie (SN) — posición relativa a Mod, que ya considera y_marca
            if serie:
                draw.text((x_text, y_text + y_offset + y_marca + cfg['SERIE_Y_OFFSET']), f"SN: {serie}", font=font_small, fill=(0, 0, 0))

            # BIOELECTRONICA — siempre visible, debajo del último campo
            bio_y = y_text + y_offset + y_marca + (cfg['BIO_Y_OFFSET_SERIE'] if serie else cfg['BIO_Y_OFFSET_NO_SERIE'])
            try:
                font_bio = ImageFont.truetype("arialbd.ttf", cfg['FONT_BIO'])
            except IOError:
                font_bio = font_barcode
            draw.text((x_text, bio_y), "BIOELECTRONICA", font=font_bio, fill=(0, 0, 0))

            # ── Código de barras 1D (layout desde abajo hacia arriba) ──────
            bc_text = urllib.parse.quote(codigo_barras)
            cb_height = cfg.get("CB_HEIGHT", 6)
            cb_scale = cfg.get("CB_SCALE", 2)
            bc_url  = f"https://bwipjs-api.metafloor.com/?bcid=code128&text={bc_text}&height={cb_height}&scale={cb_scale}&includetext=false"
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
                    if bc_w > cfg['ANCHO_FIJO'] - 32:
                        bc_rgb = bc_rgb.resize((cfg['ANCHO_FIJO'] - 32, bc_h), Image.NEAREST)
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
                    
                    # Calcular el borde inferior de BIOELECTRONICA (aproximando altura de fuente si getbbox falla)
                    try:
                        bio_bbox = font_bio.getbbox("BIOELECTRONICA")
                        bio_h = bio_bbox[3] - bio_bbox[1]
                    except AttributeError:
                        bio_h = cfg['FONT_BIO']
                    
                    bottom_of_bio = bio_y + bio_h

                    # Posiciones predeterminadas desde abajo
                    y_texto_cb = cfg['ALTO_MAXIMO'] - cfg['CB_MARGEN_INF'] - text_h
                    y_bc       = y_texto_cb - gap_texto - bc_h

                    # Lógica de colisión dinámica
                    margen_seguridad = 4
                    if y_bc < bottom_of_bio + margen_seguridad:
                        # Si chocan, empujamos el código de barras hacia abajo justo después del margen
                        y_bc = bottom_of_bio + margen_seguridad
                        y_texto_cb = y_bc + bc_h + gap_texto

                    if y_bc < 0:
                        y_bc = 2

                    x_bc = (cfg['ANCHO_FIJO'] - bc_w) // 2
                    img_canvas.paste(bc_rgb, (x_bc, y_bc))

                    x_t = (cfg['ANCHO_FIJO'] - text_w) // 2
                    draw.text((x_t, y_texto_cb), codigo_barras, font=font_barcode, fill=(0, 0, 0))

                    print(f"[*] CB: y={y_bc}  texto: y={y_texto_cb}  fin={y_texto_cb + text_h}  max={cfg['ALTO_MAXIMO']}")
            except Exception as e:
                print(f"[-] Error obteniendo Código de Barras: {e}")

            # Binarizar — umbral 128: grises oscuros (#333, L≈80) → negro; blanco → blanco
            img_gris  = img_canvas.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")
            nuevo_alto = cfg['ALTO_MAXIMO']

        elif 'ordenId' in query_params:
            print("[*] Generando etiqueta de Reparación NATIVA...")

            orden_id      = query_params.get('ordenId',     [''])[0]
            cliente       = query_params.get('cliente',     [''])[0].upper()[:30]
            equipo        = query_params.get('equipo',      [''])[0].upper()[:40]
            fecha         = query_params.get('fecha',       [''])[0]
            marca_modelo  = query_params.get('marcaModelo', [''])[0].upper()[:30]
            serie         = query_params.get('serie',       [''])[0]

            # Canvas blanco
            img_canvas = Image.new("RGB", (cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']), (255, 255, 255))
            draw = ImageDraw.Draw(img_canvas)

            # Fuentes
            try:
                font_title   = ImageFont.truetype("arialbd.ttf", max(11, cfg['FONT_SMALL'] - 1)) # Ajustado para ORDEN REP.: DA2DC663
                font_id      = ImageFont.truetype("arialbd.ttf", max(14, cfg['FONT_ID'] - 2))
                
                font_desc_sz = cfg['FONT_DESC_LONG'] if len(equipo) > 22 else cfg['FONT_DESC_SHORT']
                font_desc    = ImageFont.truetype("arialbd.ttf", max(12, font_desc_sz - 1))
                
                font_small   = ImageFont.truetype("arialbd.ttf", max(11, cfg['FONT_SMALL'] - 1))
                font_barcode = ImageFont.truetype("arialbd.ttf", cfg['FONT_BARCODE'])
                font_bio     = ImageFont.truetype("arialbd.ttf", max(11, cfg['FONT_BIO'] - 2))
            except IOError:
                font_title = font_id = font_desc = font_small = font_barcode = font_bio = ImageFont.load_default()

            # ── QR (con escala entera nativa sin distorsión por resize) ────
            qr_text = urllib.parse.quote(f"{HOST}/trazabilidad/{orden_id}")
            qr_scale = cfg.get('QR_SCALE', 3)
            qr_url  = (
                f"https://bwipjs-api.metafloor.com/?bcid=qrcode"
                f"&text={qr_text}&scale={qr_scale}&eclevel=M&includetext=false"
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

                    # Recortar quiet-zone
                    diff = ImageChops.difference(qr_rgb, Image.new("RGB", qr_rgb.size, (255, 255, 255)))
                    bbox = diff.getbbox()
                    if bbox:
                        qr_rgb = qr_rgb.crop(bbox)

                    qr_w, qr_h = qr_rgb.size

                    x_qr = cfg['ANCHO_FIJO'] - qr_w - cfg['QR_MARGEN']
                    y_qr = cfg['QR_MARGEN']
                    img_canvas.paste(qr_rgb, (x_qr, y_qr))
            except Exception as e:
                print(f"[-] Error obteniendo QR: {e}")

            # ── Textos columna izquierda ───────────────────────────────────
            x_text = cfg['X_TEXT']
            y_text = cfg['Y_TEXT']

            y_title = y_text
            title_h = max(11, cfg['FONT_SMALL'] - 1)
            desc_h = cfg['FONT_DESC_LONG'] - 1 if len(equipo) > 22 else cfg['FONT_DESC_SHORT'] - 1
            desc_h = max(12, desc_h)
            small_h = max(11, cfg['FONT_SMALL'] - 1)

            # Dibujamos el título y el número de orden en una sola línea
            draw.text((x_text, y_title), f"ORDEN REP.: {orden_id}", font=font_title, fill=(0, 0, 0))
            y_desc = y_title + title_h + 4

            # Envoltura de descripción del equipo para evitar solapamientos con el QR
            lineas_equipo = wrap_descripcion(equipo, font=font_desc, max_px=cfg['WRAP_MAX_PX'])
            y_curr = y_desc
            for linea in lineas_equipo[:2]:  # Máximo 2 líneas
                draw.text((x_text, y_curr), linea, font=font_desc, fill=(0, 0, 0))
                y_curr += desc_h + 2

            y_curr += 2

            draw.text((x_text, y_curr), f"Cli: {cliente}", font=font_small, fill=(0, 0, 0))
            y_curr += small_h + 1
            
            if marca_modelo:
                draw.text((x_text, y_curr), f"Mod: {marca_modelo}", font=font_small, fill=(0, 0, 0))
                y_curr += small_h + 1
            
            draw.text((x_text, y_curr), f"S/N: {serie}", font=font_small, fill=(0, 0, 0))
            y_curr += small_h + 1
            
            draw.text((x_text, y_curr), f"Fec: {fecha}", font=font_small, fill=(0, 0, 0))
            y_curr += small_h + 3

            # BIOELECTRONICA HONDURAS
            draw.text((x_text, y_curr), "BIOELECTRONICA HONDURAS", font=font_bio, fill=(0, 0, 0))
            bio_y = y_curr

            # ── Código de barras 1D ────────────────────────────────────────
            bc_text = urllib.parse.quote(orden_id)
            cb_height = cfg.get("CB_HEIGHT", 6)
            cb_scale = cfg.get("CB_SCALE", 2)
            bc_url  = f"https://bwipjs-api.metafloor.com/?bcid=code128&text={bc_text}&height={cb_height}&scale={cb_scale}&includetext=false"
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
                    if bc_w > cfg['ANCHO_FIJO'] - 32:
                        bc_rgb = bc_rgb.resize((cfg['ANCHO_FIJO'] - 32, bc_h), Image.NEAREST)
                        bc_w, bc_h = bc_rgb.size

                    # Medir texto del CB
                    try:
                        t_bbox = font_barcode.getbbox(orden_id)
                        text_w = t_bbox[2] - t_bbox[0]
                        text_h = t_bbox[3] - t_bbox[1]
                    except AttributeError:
                        text_w = len(orden_id) * 10
                        text_h = 16

                    gap_texto  = 3
                    
                    # Calcular el borde inferior de BIOELECTRONICA HONDURAS
                    try:
                        bio_bbox = font_bio.getbbox("BIOELECTRONICA HONDURAS")
                        bio_h = bio_bbox[3] - bio_bbox[1]
                    except AttributeError:
                        bio_h = cfg['FONT_BIO']
                    
                    bottom_of_bio = bio_y + bio_h

                    # Posiciones desde abajo
                    y_texto_cb = cfg['ALTO_MAXIMO'] - cfg['CB_MARGEN_INF'] - text_h
                    y_bc       = y_texto_cb - gap_texto - bc_h

                    # Lógica de colisión dinámica
                    margen_seguridad = 4
                    if y_bc < bottom_of_bio + margen_seguridad:
                        y_bc = bottom_of_bio + margen_seguridad
                        y_texto_cb = y_bc + bc_h + gap_texto

                    if y_bc < 0:
                        y_bc = 2

                    x_bc = (cfg['ANCHO_FIJO'] - bc_w) // 2
                    img_canvas.paste(bc_rgb, (x_bc, y_bc))

                    x_t = (cfg['ANCHO_FIJO'] - text_w) // 2
                    draw.text((x_t, y_texto_cb), orden_id, font=font_barcode, fill=(0, 0, 0))

                    print(f"[*] CB: y={y_bc}  texto: y={y_texto_cb}  fin={y_texto_cb + text_h}  max={cfg['ALTO_MAXIMO']}")
            except Exception as e:
                print(f"[-] Error obteniendo Código de Barras: {e}")

            # Binarizar — umbral 128
            img_gris  = img_canvas.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")
            nuevo_alto = cfg['ALTO_MAXIMO']

        else:
            print("[*] Modo legacy: imagen pre-renderizada...")
            respuesta = requests.get(url_imagen, timeout=15)
            respuesta.raise_for_status()

            img = Image.open(io.BytesIO(respuesta.content))
            img = img.convert("RGBA")
            fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
            fondo.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = fondo.convert("RGB")

            ratio      = cfg['ANCHO_FIJO'] / float(img.width)
            nuevo_alto = int(min(img.height * ratio, cfg['ALTO_MAXIMO']))
            img_scaled = img.resize((cfg['ANCHO_FIJO'], nuevo_alto), Image.NEAREST)

            img_gris  = img_scaled.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")

        # ── Enviar al spooler ──────────────────────────────────────────────
        hDC.StartDoc("Etiqueta NIIMBOT Bioelectronica")
        hDC.StartPage()

        # Calcular dimensiones destino en el DC del driver para evitar distorsiones
        alto_dib = int(ancho_driver * (nuevo_alto / cfg['ANCHO_FIJO']))

        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ancho_driver, alto_dib))

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()

        print(f"[+] Enviado al spooler — {cfg['ANCHO_FIJO']}×{nuevo_alto}px")
        return True

    except Exception as e:
        print(f"[-] Error al imprimir: {e}")
        return False


def iniciar():
    print("=================================================")
    print(" SERVIDOR DE IMPRESION UNIFICADO - Bioelectrónica ")
    print(f" Servidor URL : {HOST}")
    print(f" Impresoras   : {list(IMPRESORAS_SOPORTADAS.values())}")
    print(f" Tamaños Soportados: 70x40mm, 50x33mm, 50x25mm")
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
                    imp_req = trabajo.get('impresora')
                    tam_req = trabajo.get('tamano')

                    if not url_img:
                        print("[-] Error: Trabajo sin URL de imagen válida.")
                        continue
                        
                    if imprimir_etiqueta(url_img, imp_req, tam_req):
                        requests.post(API_COMPLETAR, json={"id": trabajo['id']})

        except requests.exceptions.RequestException:
            pass
        except Exception as e:
            print(f"[-] Error en el bucle principal: {e}")
            pass

        time.sleep(TIEMPO_ESPERA)


if __name__ == '__main__':
    iniciar()
