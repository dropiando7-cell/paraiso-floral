import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin
import io

API_PENDIENTES = "https://bioelectronicahn.vercel.app/api/impresion/pendientes"
API_COMPLETAR  = "https://bioelectronicahn.vercel.app/api/impresion/completar"
IMPRESORA      = "Tally Dascom DL-210Z (Copy 1)"
TIEMPO_ESPERA  = 3

# Dimensiones exactas del canvas generado por el endpoint (2"x1.3" @ 203 DPI)
LABEL_W = 406
LABEL_H = 264

def imprimir_etiqueta(url_imagen):
    try:
        print(f"\n[*] Recibiendo: {url_imagen}")
        respuesta = requests.get(url_imagen, timeout=15)
        respuesta.raise_for_status()

        # 1. Abrir imagen web
        img = Image.open(io.BytesIO(respuesta.content))
        
        # 2. Convertir y asegurar fondo solido (Blanco)
        img = img.convert("RGBA")
        fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
        fondo.paste(img, mask=img.split()[3])
        img = fondo.convert("RGB")

        # 3. Conectar al Driver de la Tally DL-210Z
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(IMPRESORA)

        # 4. Log dimensiones reportadas por Windows (informativo)
        ancho_printer = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_printer  = hDC.GetDeviceCaps(win32con.VERTRES)
        print(f"[*] Margen Lógico Windows: Ancho {ancho_printer}px, Alto {alto_printer}px")

        # 5. Redimensionar a las dimensiones EXACTAS del canvas (406x264)
        # NO escalar proporcionalmente — el canvas ya tiene las proporciones correctas.
        # Si Windows reporta distinto, usamos las coords del canvas directamente.
        img_scaled = img.resize((LABEL_W, LABEL_H), Image.LANCZOS)

        # 6. Binarización profunda para papel térmico.
        # Umbral 128: convierte grises oscuros (#333 = 51) en negro.
        # Umbral anterior 200 convertía texto gris a BLANCO incorrectamente.
        img_gris = img_scaled.convert("L")
        img_final = img_gris.point(lambda x: 0 if x < 128 else 255, "1")

        # Iniciar Print Job
        hDC.StartDoc("Etiqueta Activo ELIM")
        hDC.StartPage()

        # Dibujar imagen en coordenadas fijas del canvas — sin desborde
        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, LABEL_W, LABEL_H))

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()

        print("[+] Impresion encajada exitosamente!")
        return True

    except Exception as e:
        print(f"[-] Error: {e}")
        return False

def iniciar():
    print("=========================================")
    print(" SERVIDOR DE IMPRESION ELIM - V7 (Canvas Fijo 406x264, Umbral 128)")
    print(f" Impresora: {IMPRESORA}")
    print(f" Canvas: {LABEL_W}x{LABEL_H}px | Umbral binarización: 128")
    print("=========================================\n")
    while True:
        try:
            res = requests.get(API_PENDIENTES, timeout=5)
            if res.status_code == 200:
                for trabajo in res.json().get('trabajos', []):
                    print(f"\n[+] --> TRABAJO INTERCEPTADO: #{trabajo['id']}")
                    if imprimir_etiqueta(trabajo['url_imagen']):
                        requests.post(API_COMPLETAR, json={"id": trabajo['id']})
        except requests.exceptions.RequestException:
            pass
        time.sleep(TIEMPO_ESPERA)

if __name__ == '__main__':
    iniciar()
