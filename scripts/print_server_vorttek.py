import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin, ImageDraw, ImageFont, ImageOps
import io
import os
import urllib.parse

# Intentar importar librerías de generación local para máxima calidad y cero delay
try:
    import qrcode
    import barcode
    from barcode.writer import ImageWriter
    GENERACION_LOCAL_DISPONIBLE = True
except ImportError:
    GENERACION_LOCAL_DISPONIBLE = False

# ─── Configuración del Servidor y la Impresora ──────────────────────────────
HOST = os.environ.get("SERVER_URL", "https://paraiso-floral.vercel.app")

API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

# Nombre exacto de la impresora configurada en Windows
IMPRESORA_PREDETERMINADA = os.environ.get("PRINTER_NAME", "ImpresoraEtiquetas")

# Tiempos de espera optimizados:
# 1 segundo cuando hay trabajos activos, 2 segundos cuando está en espera para respuesta inmediata
TIEMPO_ESPERA_ACTIVO = 1.0
TIEMPO_ESPERA_INACTIVO = 2.0

# Configuraciones de Lienzo
TAMANOS = {
    "50x25": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 198,
        "QR_SIZE": 85,
        "QR_X": 302,
        "QR_Y": 8,
        "TEXT_MAX_W": 284,
        "ID_SIZE": 28,
        "ID_X": 12,
        "ID_Y": 8,
        "DESC_Y": 40,
        "BC_WIDTH": 310,
        "BC_HEIGHT": 46,
        "BC_Y": 118,
        "BC_TEXT_SIZE": 14,
        "BC_TEXT_Y": 170,
    },
    "50x30": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 240,
        "QR_SIZE": 90,
        "QR_X": 298,
        "QR_Y": 10,
        "TEXT_MAX_W": 280,
        "ID_SIZE": 30,
        "ID_X": 14,
        "ID_Y": 10,
        "DESC_Y": 44,
        "BC_WIDTH": 310,
        "BC_HEIGHT": 50,
        "BC_Y": 155,
        "BC_TEXT_SIZE": 15,
        "BC_TEXT_Y": 210,
    },
    "50x33": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 245,
        "QR_SIZE": 90,
        "QR_X": 298,
        "QR_Y": 10,
        "TEXT_MAX_W": 280,
        "ID_SIZE": 30,
        "ID_X": 14,
        "ID_Y": 10,
        "DESC_Y": 44,
        "BC_WIDTH": 310,
        "BC_HEIGHT": 50,
        "BC_Y": 160,
        "BC_TEXT_SIZE": 15,
        "BC_TEXT_Y": 214,
    },
    "70x40": {
        "ANCHO_FIJO": 559,
        "ALTO_MAXIMO": 310,
        "QR_SIZE": 100,
        "QR_X": 440,
        "QR_Y": 12,
        "TEXT_MAX_W": 415,
        "ID_SIZE": 36,
        "ID_X": 16,
        "ID_Y": 12,
        "DESC_Y": 54,
        "BC_WIDTH": 480,
        "BC_HEIGHT": 54,
        "BC_Y": 218,
        "BC_TEXT_SIZE": 16,
        "BC_TEXT_Y": 276,
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


def wrap_texto(texto, font, max_px=284):
    """
    Divide el texto en hasta 2 líneas respetando palabras completas.
    Si cabe en 1 sola línea, retorna [texto].
    Si no cabe, hace salto de línea limpio.
    """
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
            
            # Truncar con '...' si excede 2 líneas
            while resto:
                c2 = " ".join(resto) + "..."
                if medir(c2) <= max_px:
                    return [linea1, c2]
                resto.pop()
            return [linea1, p[:12] + "..."]

    return [linea1]


def calcular_tamano_optimo(descripcion, max_w, is_70=False):
    """
    Calcula el tamaño de fuente MÁXIMO posible para que el nombre de la flor
    se vea enorme y llene el espacio disponible.
    """
    desc = descripcion.strip().upper()
    
    # Lista de tamaños candidatos de mayor a menor
    sizes = [44, 40, 36, 32, 28, 26, 22, 20] if is_70 else [36, 32, 28, 26, 22, 20]
    
    for sz in sizes:
        f = obtener_fuente(sz)
        lineas = wrap_texto(desc, f, max_px=max_w)
        
        # Si cabe en 1 línea con tamaño grande
        if len(lineas) == 1 and sz >= (36 if is_70 else 28):
            return sz, lineas
            
        # Si cabe en 2 líneas
        if len(lineas) <= 2 and sz <= (40 if is_70 else 32):
            return sz, lineas
            
    min_sz = 20 if is_70 else 18
    return min_sz, wrap_texto(desc, obtener_fuente(min_sz), max_px=max_w)


def generar_imagen_local(activo, cfg, size_name="50x25"):
    """
    Genera la imagen de la etiqueta localmente con diseño dinámico sincronizado al 100% con la vista previa web.
    """
    id_qr = str(activo.get('idQr') or '000000').strip()
    descripcion = str(activo.get('descripcionCorta') or activo.get('descripcion') or 'Sin descripción').strip().upper()
    codigo_barras = str(activo.get('codigoBarras') or id_qr).strip()

    W, H = cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)

    is_70 = (size_name == "70x40")
    
    # 1. ID - Arriba a la izquierda (Grande)
    fuente_id = obtener_fuente(cfg['ID_SIZE'])
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

    # 3. Nombre de la Flor - Tamaño Dinámico Máximo
    font_size_desc, lineas = calcular_tamano_optimo(descripcion, cfg['TEXT_MAX_W'], is_70=is_70)
    fuente_desc = obtener_fuente(font_size_desc)

    y_curr = cfg['DESC_Y']
    line_h = font_size_desc + 3
    for linea in lineas[:2]:
        draw.text((cfg['ID_X'], y_curr), linea, fill="black", font=fuente_desc)
        y_curr += line_h

    # 4. Código de Barras 1D (Code 128) posicionado abajo
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
    except Exception as ex_crop:
        pass

    ancho_bar = cfg['BC_WIDTH']
    alto_bar = cfg['BC_HEIGHT']
    img_barcode = img_barcode.resize((ancho_bar, alto_bar), Image.NEAREST)

    x_bar = (W - ancho_bar) // 2
    y_bar = cfg['BC_Y']
    img.paste(img_barcode, (x_bar, y_bar))

    # 5. Texto de código de barras abajo del código de barras
    fuente_bar = obtener_fuente(cfg['BC_TEXT_SIZE'])
    texto_bar = codigo_barras
    try:
        w_texto = draw.textlength(texto_bar, font=fuente_bar)
    except:
        try:
            w_texto = draw.textsize(texto_bar, font=fuente_bar)[0]
        except:
            w_texto = len(texto_bar) * 8.5

    x_texto = (W - w_texto) // 2
    y_texto = cfg['BC_TEXT_Y']
    draw.text((x_texto, y_texto), texto_bar, fill="black", font=fuente_bar)

    # 6. Binarización profunda para contraste perfecto en papel térmico
    img_gris = img.convert("L")
    img_final = img_gris.point(lambda x: 0 if x < 190 else 255, "1")
    return img_final


def imprimir_etiqueta(url_imagen, tamano_solicitado=None, datos_activo=None, impresora_solicitada=None):
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

        # 1. Renderizado ultrarrápido local si están las librerías
        if GENERACION_LOCAL_DISPONIBLE and datos_activo and datos_activo.get('idQr'):
            try:
                print(f"[*] Generando etiqueta localmente: {datos_activo.get('idQr')} - {datos_activo.get('descripcionCorta')} ({size_param})...")
                img_final = generar_imagen_local(datos_activo, cfg, size_name=size_param)
            except Exception as ex_local:
                print(f"[-] Falla en generación local ({ex_local}), recurriendo a descarga...")

        # 2. Descarga desde la nube como fallback
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

        # 3. Determinar impresora de destino en Windows
        impresora_win = IMPRESORA_PREDETERMINADA
        if impresora_solicitada and impresora_solicitada != "Predeterminada":
            if "niimbot" in impresora_solicitada.lower():
                impresora_win = "NIIMBOT K3"
            elif "tsc" in impresora_solicitada.lower():
                impresora_win = "TSC TE200"

        hDC = win32ui.CreateDC()
        try:
            hDC.CreatePrinterDC(impresora_win)
        except Exception as err:
            try:
                default_prn = win32print.GetDefaultPrinter()
                print(f"[!] No se pudo abrir '{impresora_win}', intentando con impresora predeterminada '{default_prn}'")
                hDC.CreatePrinterDC(default_prn)
                impresora_win = default_prn
            except Exception as err2:
                print(f"[-] Error fatal: No se puede conectar a ninguna impresora: {err2}")
                return False

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
        print(f"[-] Error general durante la impresión: {e}")
        return False


def iniciar():
    print("=========================================================")
    print("      SERVIDOR DE IMPRESIÓN VORTTEK - PARAÍSO FLORAL    ")
    print(f" Servidor ERP    : {HOST}")
    print(f" Impresora Target: {IMPRESORA_PREDETERMINADA}")
    print(f" Tamaño Default  : {DEFAULT_SIZE} (50x25 mm / 2x1 pulg)")
    print(f" Polling Rápido  : {TIEMPO_ESPERA_INACTIVO}s (Inactivo) / {TIEMPO_ESPERA_ACTIVO}s (Activo)")
    print(f" Generación Local: {'ACTIVADA (Sin latencia)' if GENERACION_LOCAL_DISPONIBLE else 'DESACTIVADA'}")
    print("=========================================================\n")

    org_id = os.environ.get("ORGANIZATION_ID", None)
    params = {}
    if org_id:
        params["orgId"] = org_id
        print(f"[*] Filtrando trabajos para la organización: {org_id}")

    print("Sondeando trabajos de impresión pendientes en la nube...\n")

    while True:
        tiempo_espera = TIEMPO_ESPERA_INACTIVO
        try:
            res = requests.get(API_PENDIENTES, params=params, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                if trabajos:
                    print(f"\n[+] Se encontraron {len(trabajos)} trabajos pendientes...")
                    for trabajo in trabajos:
                        id_trabajo = trabajo['id']
                        url_img = trabajo.get('urlImagen') or trabajo.get('url_imagen')
                        tam_req = trabajo.get('tamano') or trabajo.get('size')
                        imp_req = trabajo.get('impresora')
                        activo_data = trabajo.get('activo')

                        print(f"\n[+] --> PROCESANDO TRABAJO ID #{id_trabajo}")
                        if not url_img:
                            print("[-] Error: El trabajo no contiene una URL de imagen válida.")
                            continue

                        if imprimir_etiqueta(url_img, tam_req, activo_data, imp_req):
                            res_post = requests.post(API_COMPLETAR, json={"id": id_trabajo})
                            if res_post.status_code == 200:
                                print(f"[+] Trabajo #{id_trabajo} COMPLETADO exitosamente.")
                            else:
                                print(f"[-] Alerta: No se pudo marcar como completado en servidor ({res_post.status_code})")
                        else:
                            requests.post(API_COMPLETAR, json={"id": id_trabajo, "error": True})
                            print(f"[-] Trabajo #{id_trabajo} falló al imprimir.")

                    tiempo_espera = TIEMPO_ESPERA_ACTIVO

        except requests.exceptions.RequestException as e:
            pass
        except Exception as e:
            print(f"[-] Error en el bucle principal: {e}")

        time.sleep(tiempo_espera)


if __name__ == '__main__':
    iniciar()
