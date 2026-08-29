import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin, ImageDraw, ImageFont, ImageOps
import io
import os
import urllib.parse

try:
    import qrcode
    import barcode
    from barcode.writer import ImageWriter
    GENERACION_LOCAL_DISPONIBLE = True
except ImportError:
    GENERACION_LOCAL_DISPONIBLE = False

# ─── Configuración Base ───────────────────────────────────────────────────────
HOST = os.environ.get("SERVER_URL", "https://paraiso-floral.vercel.app")

API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

IMPRESORAS_SOPORTADAS = {
    "Niimbot": "NIIMBOT K3",
    "TSC TE200": "TSC TE200",
    "Vorttek": "ImpresoraEtiquetas"
}

TIEMPO_ESPERA_ACTIVO = 1.0
TIEMPO_ESPERA_INACTIVO = 2.0

TAMANOS = {
    "50x25": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 198,
        "QR_SIZE": 80,
        "QR_X": 305,
        "QR_Y": 10,
        "TEXT_MAX_W": 280,
        "ID_SIZE": 24,
        "ID_X": 14,
        "ID_Y": 10,
        "DESC_Y": 40,
        "BC_WIDTH": 280,
        "BC_HEIGHT": 38,
        "BC_Y": 130,
        "BC_TEXT_SIZE": 12,
        "BC_TEXT_Y": 174,
    },
    "50x30": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 240,
        "QR_SIZE": 85,
        "QR_X": 300,
        "QR_Y": 12,
        "TEXT_MAX_W": 275,
        "ID_SIZE": 26,
        "ID_X": 14,
        "ID_Y": 12,
        "DESC_Y": 44,
        "BC_WIDTH": 290,
        "BC_HEIGHT": 42,
        "BC_Y": 165,
        "BC_TEXT_SIZE": 13,
        "BC_TEXT_Y": 214,
    },
    "50x33": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 245,
        "QR_SIZE": 85,
        "QR_X": 300,
        "QR_Y": 12,
        "TEXT_MAX_W": 275,
        "ID_SIZE": 26,
        "ID_X": 14,
        "ID_Y": 12,
        "DESC_Y": 44,
        "BC_WIDTH": 290,
        "BC_HEIGHT": 42,
        "BC_Y": 170,
        "BC_TEXT_SIZE": 13,
        "BC_TEXT_Y": 218,
    },
    "70x40": {
        "ANCHO_FIJO": 559,
        "ALTO_MAXIMO": 310,
        "QR_SIZE": 100,
        "QR_X": 440,
        "QR_Y": 16,
        "TEXT_MAX_W": 410,
        "ID_SIZE": 32,
        "ID_X": 18,
        "ID_Y": 16,
        "DESC_Y": 56,
        "BC_WIDTH": 460,
        "BC_HEIGHT": 46,
        "BC_Y": 225,
        "BC_TEXT_SIZE": 15,
        "BC_TEXT_Y": 278,
    }
}
DEFAULT_SIZE = "50x25"


def obtener_fuente(size):
    try:
        return ImageFont.truetype("arialbd.ttf", size)
    except:
        try:
            return ImageFont.truetype("arial.ttf", size)
        except:
            return ImageFont.load_default()


def wrap_texto(texto, font, max_px=280):
    if not texto:
        return []
    
    def medir(t):
        try:
            return font.getlength(t)
        except AttributeError:
            try:
                return font.getsize(t)[0]
            except:
                return len(t) * 10

    if medir(texto) <= max_px:
        return [texto]

    palabras = texto.split()
    linea1 = ""

    for i, p in enumerate(palabras):
        candidato = (linea1 + " " + p).strip() if linea1 else p
        if medir(candidato) <= max_px:
            linea1 = candidato
        else:
            resto = palabras[i:]
            linea2 = " ".join(resto)
            if medir(linea2) <= max_px:
                return [linea1, linea2]
            
            while resto:
                c2 = " ".join(resto) + "..."
                if medir(c2) <= max_px:
                    return [linea1, c2]
                resto.pop()
            return [linea1, p[:12] + "..."]

    return [linea1]


def generar_imagen_local(activo, cfg, size_name="50x25"):
    id_qr = str(activo.get('idQr') or '000000').strip()
    descripcion = str(activo.get('descripcionCorta') or activo.get('descripcion') or 'Sin descripción').strip().upper()
    codigo_barras = str(activo.get('codigoBarras') or id_qr).strip()

    W, H = cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)

    is_70 = (size_name == "70x40")
    len_desc = len(descripcion)
    if len_desc <= 14:
        font_size_desc = 34 if is_70 else 25
    elif len_desc <= 22:
        font_size_desc = 28 if is_70 else 19
    elif len_desc <= 35:
        font_size_desc = 24 if is_70 else 16
    else:
        font_size_desc = 20 if is_70 else 14

    fuente_id = obtener_fuente(cfg['ID_SIZE'])
    fuente_desc = obtener_fuente(font_size_desc)
    fuente_bar = obtener_fuente(cfg['BC_TEXT_SIZE'])

    # 1. ID Arriba a la izquierda
    draw.text((cfg['ID_X'], cfg['ID_Y']), id_qr, fill="black", font=fuente_id)

    # 2. QR Code Arriba a la derecha
    qr_url = f"{HOST}/f/{id_qr}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=3,
        border=1
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    img_qr = img_qr.resize((cfg['QR_SIZE'], cfg['QR_SIZE']), Image.NEAREST)
    img.paste(img_qr, (cfg['QR_X'], cfg['QR_Y']))

    # 3. Descripción / Nombre de la flor
    lineas = wrap_texto(descripcion, fuente_desc, max_px=cfg['TEXT_MAX_W'])
    y_curr = cfg['DESC_Y']
    line_h = font_size_desc + 4
    for linea in lineas[:2]:
        draw.text((cfg['ID_X'], y_curr), linea, fill="black", font=fuente_desc)
        y_curr += line_h

    # 4. Código de Barras 1D
    rv = io.BytesIO()
    barcode.Code128(codigo_barras, writer=ImageWriter()).write(rv, options={"write_text": False})
    rv.seek(0)
    img_barcode = Image.open(rv).convert("RGB")

    try:
        img_gray_bar = img_barcode.convert("L")
        inv_bar = ImageOps.invert(img_gray_bar)
        bbox = inv_bar.getbbox()
        if bbox:
            left = max(0, bbox[0] - 4)
            top = max(0, bbox[1] - 2)
            right = min(img_barcode.width, bbox[2] + 4)
            bottom = min(img_barcode.height, bbox[3] + 2)
            img_barcode = img_barcode.crop((left, top, right, bottom))
    except Exception:
        pass

    ancho_bar = cfg['BC_WIDTH']
    alto_bar = cfg['BC_HEIGHT']
    img_barcode = img_barcode.resize((ancho_bar, alto_bar), Image.NEAREST)

    x_bar = (W - ancho_bar) // 2
    y_bar = cfg['BC_Y']
    img.paste(img_barcode, (x_bar, y_bar))

    # 5. Texto del código de barras
    texto_bar = codigo_barras
    try:
        w_texto = draw.textlength(texto_bar, font=fuente_bar)
    except:
        w_texto = len(texto_bar) * 8

    x_texto = (W - w_texto) // 2
    y_texto = cfg['BC_TEXT_Y']
    draw.text((x_texto, y_texto), texto_bar, fill="black", font=fuente_bar)

    # 6. Binarización profunda
    img_gris = img.convert("L")
    img_final = img_gris.point(lambda x: 0 if x < 190 else 255, "1")
    return img_final


def imprimir_etiqueta(url_imagen, impresora_solicitada=None, tamano_solicitado=None, datos_activo=None):
    try:
        parsed_url = urllib.parse.urlparse(url_imagen)
        query_params = urllib.parse.parse_qs(parsed_url.query)

        size_param = tamano_solicitado or query_params.get('size', [DEFAULT_SIZE])[0]
        if size_param not in TAMANOS:
            size_param = DEFAULT_SIZE
        cfg = TAMANOS[size_param]

        img_final = None

        if not datos_activo and 'idQr' in query_params:
            datos_activo = {
                'idQr': query_params.get('idQr', [''])[0],
                'descripcionCorta': query_params.get('descripcion', [''])[0],
                'codigoBarras': query_params.get('codigoBarras', [''])[0]
            }

        if GENERACION_LOCAL_DISPONIBLE and datos_activo and datos_activo.get('idQr'):
            try:
                print(f"[*] Generando etiqueta localmente: {datos_activo.get('idQr')} - {datos_activo.get('descripcionCorta')} ({size_param})...")
                img_final = generar_imagen_local(datos_activo, cfg, size_name=size_param)
            except Exception as ex:
                print(f"[-] Falla local ({ex}), recurriendo a descarga...")

        if img_final is None:
            parsed_host = urllib.parse.urlparse(HOST)
            new_url_parts = list(parsed_url)
            new_url_parts[0] = parsed_host.scheme
            new_url_parts[1] = parsed_host.netloc
            url_descarga = urllib.parse.urlunparse(new_url_parts)

            print(f"[*] Descargando etiqueta desde la nube: {url_descarga}")
            respuesta = requests.get(url_descarga, timeout=10)
            respuesta.raise_for_status()

            img = Image.open(io.BytesIO(respuesta.content)).convert("RGBA")
            fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
            fondo.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = fondo.convert("RGB")

            ratio = cfg['ANCHO_FIJO'] / float(img.width)
            nuevo_alto = int(min(img.height * ratio, cfg['ALTO_MAXIMO']))
            img_scaled = img.resize((cfg['ANCHO_FIJO'], nuevo_alto), Image.NEAREST)

            img_gris = img_scaled.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 190 else 255, "1")

        impresora_win = IMPRESORAS_SOPORTADAS.get(impresora_solicitada, "NIIMBOT K3")
        hDC = win32ui.CreateDC()
        try:
            hDC.CreatePrinterDC(impresora_win)
        except Exception:
            default_prn = win32print.GetDefaultPrinter()
            print(f"[!] Intentando con impresora predeterminada '{default_prn}'")
            hDC.CreatePrinterDC(default_prn)
            impresora_win = default_prn

        ancho_driver = hDC.GetDeviceCaps(win32con.HORZRES)

        hDC.StartDoc("Etiqueta Paraiso Floral")
        hDC.StartPage()

        alto_dib = int(ancho_driver * (img_final.height / img_final.width))
        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ancho_driver, alto_dib))

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()

        print(f"[+] ¡Impresión enviada exitosamente a '{impresora_win}'!")
        return True

    except Exception as e:
        print(f"[-] Error al imprimir: {e}")
        return False


def iniciar():
    print("=================================================")
    print(" SERVIDOR DE IMPRESION UNIFICADO - Paraíso Floral ")
    print(f" Servidor URL : {HOST}")
    print(f" Impresoras   : {list(IMPRESORAS_SOPORTADAS.values())}")
    print(f" Polling Rápido: {TIEMPO_ESPERA_INACTIVO}s (Inactivo) / {TIEMPO_ESPERA_ACTIVO}s (Activo)")
    print(f" Generación Local: {'ACTIVADA' if GENERACION_LOCAL_DISPONIBLE else 'DESACTIVADA'}")
    print("=================================================\n")

    while True:
        tiempo_espera = TIEMPO_ESPERA_INACTIVO
        try:
            res = requests.get(API_PENDIENTES, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                if trabajos:
                    print(f"\n[+] Se encontraron {len(trabajos)} trabajos pendientes...")
                    for trabajo in trabajos:
                        id_trabajo = trabajo['id']
                        url_img = trabajo.get('urlImagen')
                        imp_req = trabajo.get('impresora')
                        tam_req = trabajo.get('tamano')
                        activo_data = trabajo.get('activo')

                        if not url_img:
                            continue

                        if imprimir_etiqueta(url_img, imp_req, tam_req, activo_data):
                            requests.post(API_COMPLETAR, json={"id": id_trabajo})
                            print(f"[+] Trabajo #{id_trabajo} COMPLETADO exitosamente.")
                        else:
                            requests.post(API_COMPLETAR, json={"id": id_trabajo, "error": True})
                            print(f"[-] Trabajo #{id_trabajo} falló.")

                    tiempo_espera = TIEMPO_ESPERA_ACTIVO

        except requests.exceptions.RequestException:
            pass
        except Exception as e:
            print(f"[-] Error en el bucle: {e}")

        time.sleep(tiempo_espera)


if __name__ == '__main__':
    iniciar()
