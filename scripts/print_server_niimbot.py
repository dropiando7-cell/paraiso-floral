import time
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageWin
import io
import os

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
        respuesta = requests.get(url_imagen, timeout=15)
        respuesta.raise_for_status()

        # 1. Abrir imagen web
        img = Image.open(io.BytesIO(respuesta.content))
        
        # 2. Convertir y asegurar fondo solido (Blanco)
        img = img.convert("RGBA")
        fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
        fondo.paste(img, mask=img.split()[3])
        img = fondo.convert("RGB")

        # 3. Conectar al Driver de la NIIMBOT K3
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(IMPRESORA)

        # 4. Obtener RESOLUCIÓN REAL CONFIGURADA EN WINDOWS (Crucial)
        ancho_printer = hDC.GetDeviceCaps(win32con.HORZRES)
        alto_printer  = hDC.GetDeviceCaps(win32con.VERTRES)
        
        print(f"[*] Margen Lógico Windows: Ancho {ancho_printer}px, Alto {alto_printer}px")

        # 5. Escalar imagen al ancho reportado MANTENIENDO PROPORCIÓN
        ratio = ancho_printer / float(img.width)
        nuevo_alto = int(img.height * ratio)
        img_scaled = img.resize((ancho_printer, nuevo_alto), Image.LANCZOS)

        # 6. Binarización profunda para papel térmico (Todo o nada)
        img_gris = img_scaled.convert("L")
        img_final = img_gris.point(lambda x: 0 if x < 200 else 255, "1")

        # Iniciar Print Job
        hDC.StartDoc("Etiqueta NIIMBOT Bioelectronica")
        hDC.StartPage()

        # Dibujar imagen ocupando el ancho completo, permitiendo alto proporcional
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
