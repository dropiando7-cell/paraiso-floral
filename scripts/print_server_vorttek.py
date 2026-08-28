import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin
import io
import os
import urllib.parse

# ─── Configuración del Servidor y la Impresora ──────────────────────────────
# URL base del ERP (se puede sobrescribir con la variable de entorno SERVER_URL)
HOST = os.environ.get("SERVER_URL", "https://bioelectronicahn.vercel.app")

API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

# Nombre exacto de la impresora configurada en Windows
IMPRESORA_PREDETERMINADA = "ImpresoraEtiquetas"

# Tiempos de espera (Adaptive Polling) para ahorrar recursos de Supabase/Vercel
TIEMPO_ESPERA_ACTIVO = 3   # Espera cuando hay trabajos impresos
TIEMPO_ESPERA_INACTIVO = 40 # Espera cuando la cola está vacía

# Configuración del lienzo para 2"x1" (50x25 mm) a 203 DPI
# 50.8 mm = 2 pulgadas -> 2 * 203 DPI = ~406 px (usamos 399/400 de ancho seguro)
# 25.4 mm = 1 pulgada  -> 1 * 203 DPI = ~203 px (usamos 198 de alto seguro)
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


def imprimir_etiqueta(url_imagen, tamano_solicitado=None):
    try:
        print(f"\n[*] Descargando etiqueta desde: {url_imagen}")
        
        # 1. Obtener los parámetros de la URL para determinar el tamaño
        parsed_url = urllib.parse.urlparse(url_imagen)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        size_param = tamano_solicitado or query_params.get('size', [DEFAULT_SIZE])[0]
        if size_param not in TAMANOS:
            size_param = DEFAULT_SIZE
            
        cfg = TAMANOS[size_param]
        
        # 2. Descargar la imagen
        respuesta = requests.get(url_imagen, timeout=15)
        respuesta.raise_for_status()
        
        # 3. Procesar imagen con Pillow
        img = Image.open(io.BytesIO(respuesta.content))
        
        # Convertir a RGBA y asegurar fondo blanco (para transparencias)
        img = img.convert("RGBA")
        fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
        fondo.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
        img = fondo.convert("RGB")
        
        # Redimensionar la imagen al tamaño fijo lógico
        ratio = cfg['ANCHO_FIJO'] / float(img.width)
        nuevo_alto = int(min(img.height * ratio, cfg['ALTO_MAXIMO']))
        img_scaled = img.resize((cfg['ANCHO_FIJO'], nuevo_alto), Image.NEAREST)
        
        # Binarización profunda para papel térmico (escala de grises -> Blanco y Negro puro)
        img_gris = img_scaled.convert("L")
        img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")
        
        # 4. Enviar a la impresora en Windows
        hDC = win32ui.CreateDC()
        try:
            hDC.CreatePrinterDC(IMPRESORA_PREDETERMINADA)
        except Exception as err:
            print(f"[-] Error: No se puede conectar a la impresora '{IMPRESORA_PREDETERMINADA}'. ¿Está encendida y conectada?")
            print(f"[-] Detalle del error: {err}")
            return False
            
        # Obtener dimensiones físicas del área imprimible reportada por el driver de Windows
        ancho_driver = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_driver  = hDC.GetDeviceCaps(win32con.VERTRES)
        
        print(f"[*] Impresora: {IMPRESORA_PREDETERMINADA} (Ancho de impresión: {ancho_driver}px)")
        print(f"[*] Escalandola a {cfg['ANCHO_FIJO']}x{nuevo_alto}px para etiqueta {size_param}")
        
        # Iniciar trabajo de impresión
        hDC.StartDoc("Etiqueta Paraiso Floral")
        hDC.StartPage()
        
        # Calcular alto proporcional en base al ancho que reporta el driver
        alto_dib = int(ancho_driver * (nuevo_alto / cfg['ANCHO_FIJO']))
        
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
    print("=========================================================\n")
    
    # Obtener el ID de la organización desde el entorno para filtrado (opcional)
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
                        
                        print(f"\n[+] --> TRABAJO INTERCEPTADO: ID #{id_trabajo}")
                        if not url_img:
                            print("[-] Error: El trabajo no contiene una URL de imagen válida.")
                            continue
                            
                        # Intentar imprimir
                        if imprimir_etiqueta(url_img, tam_req):
                            # Notificar al servidor que se completó
                            res_post = requests.post(API_COMPLETAR, json={"id": id_trabajo})
                            if res_post.status_code == 200:
                                print(f"[+] Trabajo #{id_trabajo} marcado como COMPLETADO en el servidor.")
                            else:
                                print(f"[-] Alerta: No se pudo marcar como completado en el servidor (Status: {res_post.status_code})")
                        else:
                            # Notificar error al servidor para no reintentar infinitamente
                            requests.post(API_COMPLETAR, json={"id": id_trabajo, "error": True})
                            print(f"[-] Trabajo #{id_trabajo} marcado con ERROR en el servidor.")
                            
                    # Si procesó trabajos, hace un sondeo rápido por si entraron nuevos
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
