import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin, ImageDraw, ImageFont, ImageOps
import io
import os
import urllib.parse
import textwrap

# Intentar importar librerías de generación local para máxima calidad y cero delay
try:
    import qrcode
    import barcode
    from barcode.writer import ImageWriter
    GENERACION_LOCAL_DISPONIBLE = True
except ImportError:
    GENERACION_LOCAL_DISPONIBLE = False

# ─── Configuración del Servidor y la Impresora ──────────────────────────────
# URL base del ERP (se puede sobrescribir con la variable de entorno SERVER_URL)
HOST = os.environ.get("SERVER_URL", "https://paraiso-floral.vercel.app")

API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

# Nombre exacto de la impresora configurada en Windows
IMPRESORA_PREDETERMINADA = "ImpresoraEtiquetas"

# Tiempos de espera (Adaptive Polling) para ahorrar recursos
TIEMPO_ESPERA_ACTIVO = 2   # Espera rápida cuando hay trabajos en cola
TIEMPO_ESPERA_INACTIVO = 40 # Espera cuando la cola está vacía

# Configuración del lienzo para 2"x1" (50x25 mm) a 203 DPI
TAMANOS = {
    "50x25": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 198,
    },
    "50x30": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 240,
    },
    "50x33": {
        "ANCHO_FIJO": 399,
        "ALTO_MAXIMO": 245,
    },
    "70x40": {
        "ANCHO_FIJO": 559,
        "ALTO_MAXIMO": 310,
    }
}
DEFAULT_SIZE = "50x25"


def generar_imagen_local_50x25(activo, cfg):
    """
    Dibuja y genera la etiqueta localmente en la PC para obtener la máxima nitidez 
    y legibilidad del QR y código de barras, eliminando dependencias de la red.
    """
    id_qr = activo.get('idQr') or '000000'
    descripcion = activo.get('descripcionCorta') or 'Sin descripción'
    codigo_barras = activo.get('codigoBarras') or id_qr

    # Crear imagen en blanco a 203 DPI (399x198 px)
    W, H = cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)

    # Cargar Arial Bold si existe en Windows, de lo contrario la fuente por defecto
    def obtener_fuente(size):
        try:
            return ImageFont.truetype("arialbd.ttf", size)
        except:
            try:
                return ImageFont.truetype("arial.ttf", size)
            except:
                return ImageFont.load_default()

    # 1. Escribir ID del activo (Código numérico arriba a la izquierda)
    draw.text((14, 12), id_qr, fill="black", font=obtener_fuente(24))

    # 2. Escribir la descripción (Nombre del producto) con Word Wrap por palabra
    # Espacio útil horizontal: ~280px para no colisionar con el código QR
    fuente_desc = obtener_fuente(19 if len(descripcion) <= 18 else 15)
    
    # Envoltura inteligente: 14 caracteres por línea si es grande, 19 si es chica
    max_chars = 14 if len(descripcion) <= 18 else 19
    lineas = textwrap.wrap(descripcion, width=max_chars)
    
    y_offset = 42
    for linea in lineas[:2]:  # Pintar máximo 2 líneas para no desbordar verticalmente
        draw.text((14, y_offset), linea.upper(), fill="black", font=fuente_desc)
        y_offset += 22 if len(descripcion) <= 18 else 18

    # 3. Generar Código QR (Nivel L para baja densidad y fácil lectura térmica)
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
    
    # Pegar QR a la derecha
    img_qr = img_qr.resize((85, 85), Image.NEAREST)
    img.paste(img_qr, (300, 12))

    # 4. Generar Código de Barras (Code 128)
    rv = io.BytesIO()
    barcode.Code128(codigo_barras, writer=ImageWriter()).write(rv, options={"write_text": False})
    rv.seek(0)
    img_barcode = Image.open(rv).convert("RGB")
    
    # Recortar márgenes blancos sobrantes que genera python-barcode de forma nativa
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
        print(f"[-] No se pudo recortar el código de barras: {ex_crop}")

    # Redimensionar el código de barra de forma balanceada
    ancho_bar, alto_bar = 270, 42
    img_barcode = img_barcode.resize((ancho_bar, alto_bar), Image.NEAREST)
    
    # Pegar centrado horizontalmente
    x_bar = (W - ancho_bar) // 2
    img.paste(img_barcode, (x_bar, 108))

    # 5. Escribir el texto abajo del código de barras
    fuente_bar = obtener_fuente(12)
    texto_bar = codigo_barras
    
    w_texto = 50
    if hasattr(draw, 'textlength'):
        w_texto = draw.textlength(texto_bar, font=fuente_bar)
    elif hasattr(draw, 'textsize'):
        w_texto = draw.textsize(texto_bar, font=fuente_bar)[0]
        
    x_texto = (W - w_texto) // 2
    draw.text((x_texto, 154), texto_bar, fill="black", font=fuente_bar)

    # 6. Convertir a binarización profunda para papel térmico
    img_gris = img.convert("L")
    img_final = img_gris.point(lambda x: 0 if x < 190 else 255, "1")
    return img_final


def imprimir_etiqueta(url_imagen, tamano_solicitado=None, datos_activo=None):
    try:
        # Determinar el tamaño solicitado
        parsed_url = urllib.parse.urlparse(url_imagen)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        size_param = tamano_solicitado or query_params.get('size', [DEFAULT_SIZE])[0]
        if size_param not in TAMANOS:
            size_param = DEFAULT_SIZE
            
        cfg = TAMANOS[size_param]
        
        img_final = None
        
        # 1. Intentar renderizar localmente si tenemos los metadatos y las librerías
        if GENERACION_LOCAL_DISPONIBLE and datos_activo and size_param == "50x25":
            try:
                print("[*] Generando imagen de la etiqueta localmente...")
                img_final = generar_imagen_local_50x25(datos_activo, cfg)
            except Exception as ex_local:
                print(f"[-] Falla en generación local: {ex_local}. Intentando descarga...")
        
        # 2. Descarga tradicional como fallback
        if img_final is None:
            # Reemplazar dinámicamente el host de la URL por el HOST configurado
            parsed_host = urllib.parse.urlparse(HOST)
            new_url_parts = list(parsed_url)
            new_url_parts[0] = parsed_host.scheme
            new_url_parts[1] = parsed_host.netloc
            url_imagen = urllib.parse.urlunparse(new_url_parts)

            print(f"[*] Descargando etiqueta desde la nube: {url_imagen}")
            respuesta = requests.get(url_imagen, timeout=15)
            respuesta.raise_for_status()
            
            img = Image.open(io.BytesIO(respuesta.content))
            
            # Convertir a RGBA y asegurar fondo blanco
            img = img.convert("RGBA")
            fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
            fondo.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = fondo.convert("RGB")
            
            # Redimensionar la imagen al tamaño fijo lógico
            ratio = cfg['ANCHO_FIJO'] / float(img.width)
            nuevo_alto = int(min(img.height * ratio, cfg['ALTO_MAXIMO']))
            img_scaled = img.resize((cfg['ANCHO_FIJO'], nuevo_alto), Image.NEAREST)
            
            # Binarización profunda
            img_gris = img_scaled.convert("L")
            img_final = img_gris.point(lambda x: 0 if x < 190 else 255, "1")
        
        # 3. Enviar a la impresora en Windows
        hDC = win32ui.CreateDC()
        try:
            hDC.CreatePrinterDC(IMPRESORA_PREDETERMINADA)
        except Exception as err:
            print(f"[-] Error: No se puede conectar a la impresora '{IMPRESORA_PREDETERMINADA}'. ¿Está encendida y conectada?")
            print(f"[-] Detalle del error: {err}")
            return False
            
        ancho_driver = hDC.GetDeviceCaps(win32con.HORZRES)
        
        print(f"[*] Impresora: {IMPRESORA_PREDETERMINADA} (Ancho: {ancho_driver}px)")
        
        # Iniciar trabajo de impresión
        hDC.StartDoc("Etiqueta Paraiso Floral")
        hDC.StartPage()
        
        # Calcular alto proporcional en base al ancho que reporta el driver
        alto_dib = int(ancho_driver * (img_final.height / img_final.width))
        
        # Dibujar la imagen en el canvas del driver de Windows
        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ancho_driver, alto_dib))
        
        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        
        print("[+] ¡Enviado al spooler de Windows exitosamente!")
        return True
        
    except Exception as e:
        print(f"[-] Error general durante la impresión: {e}")
        return False


def iniciar():
    print("=========================================================")
    print("      SERVIDOR DE IMPRESIÓN VORTTEK - PARAIÍSO FLORAL    ")
    print(f" Servidor URL  : {HOST}")
    print(f" Impresora Target: {IMPRESORA_PREDETERMINADA}")
    print(f" Tamaño Default  : {DEFAULT_SIZE} (2x1 pulgadas)")
    print(f" Generación Local: {'DISPONIBLE' if GENERACION_LOCAL_DISPONIBLE else 'NO DISPONIBLE'}")
    if not GENERACION_LOCAL_DISPONIBLE:
        print(" [!] TIP: Ejecuta 'pip install qrcode python-barcode' para activar la generación local.")
    print("=========================================================\n")
    
    org_id = os.environ.get("ORGANIZATION_ID", None)
    params = {}
    if org_id:
        params["orgId"] = org_id
        print(f"[*] Filtrando trabajos para la organización: {org_id}")
        
    print("Sondeando trabajos pendientes en la nube...")
    
    while True:
        tiempo_espera = TIEMPO_ESPERA_INACTIVO
        try:
            res = requests.get(API_PENDIENTES, params=params, timeout=10)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                if trabajos:
                    print(f"\n[+] Se encontraron {len(trabajos)} trabajos pendientes.")
                    for trabajo in trabajos:
                        id_trabajo = trabajo['id']
                        url_img = trabajo.get('urlImagen') or trabajo.get('url_imagen')
                        tam_req = trabajo.get('tamano') or trabajo.get('size')
                        activo_data = trabajo.get('activo')
                        
                        print(f"\n[+] --> TRABAJO INTERCEPTADO: ID #{id_trabajo}")
                        if not url_img:
                            print("[-] Error: El trabajo no contiene una URL de imagen válida.")
                            continue
                            
                        # Intentar imprimir con datos de activo para procesamiento local
                        if imprimir_etiqueta(url_img, tam_req, activo_data):
                            res_post = requests.post(API_COMPLETAR, json={"id": id_trabajo})
                            if res_post.status_code == 200:
                                print(f"[+] Trabajo #{id_trabajo} marcado como COMPLETADO en el servidor.")
                            else:
                                print(f"[-] Alerta: No se pudo marcar como completado (Status: {res_post.status_code})")
                        else:
                            requests.post(API_COMPLETAR, json={"id": id_trabajo, "error": True})
                            print(f"[-] Trabajo #{id_trabajo} marcado con ERROR.")
                            
                    # Sondeo rápido si hubo trabajos
                    tiempo_espera = TIEMPO_ESPERA_ACTIVO
            else:
                print(f"[-] Código de respuesta inesperado: {res.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"[-] Error de conexión con el servidor ERP: {e}")
        except Exception as e:
            print(f"[-] Error inesperado en el bucle principal: {e}")
            
        time.sleep(tiempo_espera)


if __name__ == '__main__':
    iniciar()
