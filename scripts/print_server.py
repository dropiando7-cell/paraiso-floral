import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin
import io

API_PENDIENTES = "https://sistemaselim.app/api/impresion/pendientes"
API_COMPLETAR  = "https://sistemaselim.app/api/impresion/completar"
IMPRESORA      = "Tally Dascom DL-210Z (Copy 1)"
TIEMPO_ESPERA  = 3

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

        # 4. Obtener RESOLUCIÓN REAL CONFIGURADA EN WINDOWS (Crucial)
        ancho_printer = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_printer  = hDC.GetDeviceCaps(win32con.VERTRES)
        
        # SI LA IMPRESORA ESTÁ BIEN CONFIGURADA EN WINDOWS A 2x1", AQUI VEREMOS 406x203 (a 203dpi)
        print(f"[*] Margen Lógico Windows: Ancho {ancho_printer}px, Alto {alto_printer}px")

        # 5. Forzar la imagen web a encajar EXACTAMENTE en el canvas reportado.
        # Esto soluciona que la imagen no quepa y fuerce la máquina a saltar otra etiqueta
        img_scaled = img.resize((ancho_printer, alto_printer), Image.LANCZOS)

        # 6. Binarización profunda para papel térmico (Todo o nada)
        img_gris = img_scaled.convert("L")
        img_final = img_gris.point(lambda x: 0 if x < 200 else 255, "1")

        # Iniciar Print Job
        hDC.StartDoc("Etiqueta Activo ELIM")
        hDC.StartPage()

        # Dibujar imagen ocupando el 100% (0,0 hasta ancho,alto)
        dib = ImageWin.Dib(img_final)
        dib.draw(hDC.GetHandleOutput(), (0, 0, ancho_printer, alto_printer))

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
    print(" SERVIDOR DE IMPRESION ELIM - V5 (Escala Exacta)")
    print(f" Impresora: {IMPRESORA}")
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
