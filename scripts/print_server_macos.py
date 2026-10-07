#!/usr/bin/env python3
"""
===================================================================
      SERVIDOR DE IMPRESIÓN PARA MACOS - PARAÍSO FLORAL
===================================================================
Script de impresión local optimizado para macOS (CUPS / lpr).
Detecta trabajos pendientes desde el ERP web y los envía
automáticamente a la impresora térmica de etiquetas instalada en Mac.
===================================================================
"""

import time
import requests
import subprocess
import tempfile
import io
import os
import urllib.parse
from PIL import Image, ImageDraw, ImageFont, ImageOps

try:
    import qrcode
    import barcode
    from barcode.writer import ImageWriter
    GENERACION_LOCAL_DISPONIBLE = True
except ImportError:
    GENERACION_LOCAL_DISPONIBLE = False

# Configuración del ERP
HOST = os.environ.get("SERVER_URL", "https://paraiso-floral.vercel.app")
API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

# Nombre predeterminado de la impresora en macOS CUPS (ej: ImpresoraEtiquetas, Tally_Dascom_DL_210Z, etc.)
IMPRESORA_PREDETERMINADA = os.environ.get("PRINTER_NAME", "ImpresoraEtiquetas")

# Tiempos de espera inteligentes (Adaptive Polling)
TIEMPO_ESPERA_ACTIVO = 1.0    # 1s cuando hay impresiones pendientes
TIEMPO_ESPERA_INACTIVO = 3.0  # 3s cuando la cola está vacía

# Dimensiones y coordenadas de lienzo (en px)
TAMANOS = {
    "50x25": {
        "ANCHO_FIJO": 400,
        "ALTO_MAXIMO": 198,
        "QR_SIZE": 85,
        "QR_X": 302,
        "QR_Y": 8,
        "TEXT_MAX_W": 265,
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
        "ANCHO_FIJO": 400,
        "ALTO_MAXIMO": 240,
        "QR_SIZE": 90,
        "QR_X": 298,
        "QR_Y": 10,
        "TEXT_MAX_W": 265,
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
        "ANCHO_FIJO": 400,
        "ALTO_MAXIMO": 245,
        "QR_SIZE": 90,
        "QR_X": 298,
        "QR_Y": 10,
        "TEXT_MAX_W": 265,
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
        "ANCHO_FIJO": 560,
        "ALTO_MAXIMO": 310,
        "QR_SIZE": 100,
        "QR_X": 440,
        "QR_Y": 12,
        "TEXT_MAX_W": 395,
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

def obtener_impresoras_macos_detalles():
    """Obtiene impresoras de macOS devolviendo [(queue_name, description), ...]"""
    try:
        res = subprocess.run(["lpstat", "-l", "-p"], capture_output=True, text=True, check=True)
        impresoras = []
        curr_queue = None
        curr_desc = ""
        for line in res.stdout.split("\n"):
            if line.startswith("printer "):
                if curr_queue:
                    impresoras.append((curr_queue, curr_desc.strip()))
                parts = line.split()
                curr_queue = parts[1] if len(parts) > 1 else ""
                curr_desc = ""
            elif line.strip().startswith("Description:"):
                curr_desc = line.split("Description:", 1)[1].strip()
        if curr_queue:
            impresoras.append((curr_queue, curr_desc.strip()))
        return impresoras
    except Exception:
        return []

def obtener_impresoras_macos():
    """Obtiene la lista de nombres de cola de impresoras disponibles en macOS."""
    detalles = obtener_impresoras_macos_detalles()
    return [q for q, desc in detalles]

def obtener_fuente(size):
    try:
        return ImageFont.truetype("Arial.ttf", size)
    except:
        try:
            return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
        except:
            return ImageFont.load_default()

def wrap_texto(texto, font, max_px=265):
    if not texto:
        return []
    
    def medir(t):
        try:
            return font.getlength(t)
        except AttributeError:
            try:
                return font.getsize(t)[0]
            except:
                return len(t) * 12

    palabras = texto.split()
    if len(palabras) == 1:
        return [texto] if medir(texto) <= max_px else [texto[:12] + "..."]

    if len(palabras) == 2:
        return [palabras[0], palabras[1]]

    linea1 = ""
    for i, p in enumerate(palabras):
        candidato = (linea1 + " " + p).strip() if linea1 else p
        if len(candidato) <= 14 and medir(candidato) <= max_px:
            linea1 = candidato
        else:
            resto = palabras[i:]
            linea2 = " ".join(resto)
            if medir(linea2) <= max_px:
                return [linea1, linea2]
            return [linea1, " ".join(resto)]
    return [linea1]

def calcular_tamano_optimo(descripcion, max_w=265, is_70=False):
    desc = descripcion.strip().upper()
    length = len(desc)
    
    if length <= 13:
        target_sz = 44 if is_70 else 36
    elif length <= 22:
        target_sz = 40 if is_70 else 32
    elif length <= 35:
        target_sz = 32 if is_70 else 26
    else:
        target_sz = 26 if is_70 else 20
        
    sizes = [44, 40, 36, 32, 28, 26, 22, 20, 18] if is_70 else [36, 32, 28, 26, 22, 20, 18]
    sizes = [s for s in sizes if s <= target_sz]

    for sz in sizes:
        f = obtener_fuente(sz)
        lineas = wrap_texto(desc, f, max_px=max_w)
        if len(lineas) <= 2:
            return sz, lineas

    min_sz = 18 if is_70 else 16
    return min_sz, wrap_texto(desc, obtener_fuente(min_sz), max_px=max_w)

def generar_imagen_local(activo, cfg, size_name="50x25"):
    id_qr = str(activo.get('idQr') or '000000').strip()
    descripcion = str(activo.get('descripcionCorta') or activo.get('descripcion') or 'Sin descripción').strip().upper()
    codigo_barras_raw = str(activo.get('codigoBarras') or id_qr).strip()
    
    codigo_barras = codigo_barras_raw[3:] if codigo_barras_raw.upper().startswith('PF-') else codigo_barras_raw

    W, H = cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)

    is_70 = (size_name == "70x40")

    # --- DESPLAZAMIENTO GLOBAL ---
    OFFSET_X = 12

    # 1. ID QR
    fuente_id = obtener_fuente(cfg['ID_SIZE'])
    draw.text((cfg['ID_X'] + OFFSET_X, cfg['ID_Y']), id_qr, fill="black", font=fuente_id)
    draw.text((cfg['ID_X'] + OFFSET_X + 1, cfg['ID_Y']), id_qr, fill="black", font=fuente_id) # Bold

    # 2. QR Code
    qr_url = f"{HOST}/f/{id_qr}"
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=3, border=1)
    qr.add_data(qr_url)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    img_qr = img_qr.resize((cfg['QR_SIZE'], cfg['QR_SIZE']), Image.NEAREST)
    img.paste(img_qr, (cfg['QR_X'] + OFFSET_X, cfg['QR_Y']))

    # 3. Descripción de la flor
    font_size_desc, lineas = calcular_tamano_optimo(descripcion, cfg['TEXT_MAX_W'], is_70=is_70)
    fuente_desc = obtener_fuente(font_size_desc)

    y_curr = cfg['DESC_Y']
    line_h = font_size_desc + 3
    for linea in lineas[:2]:
        draw.text((cfg['ID_X'] + OFFSET_X, y_curr), linea, fill="black", font=fuente_desc)
        draw.text((cfg['ID_X'] + OFFSET_X + 1, y_curr), linea, fill="black", font=fuente_desc) # Bold
        y_curr += line_h

    # 4. Código de Barras 1D Code128
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

    x_bar = (W - ancho_bar) // 2 + OFFSET_X
    y_bar = cfg['BC_Y']
    img.paste(img_barcode, (x_bar, y_bar))

    # 5. Texto de código de barras
    fuente_bar = obtener_fuente(cfg['BC_TEXT_SIZE'])
    texto_bar = codigo_barras
    try:
        w_texto = draw.textlength(texto_bar, font=fuente_bar)
    except:
        w_texto = len(texto_bar) * 8.5

    x_texto = int((W - w_texto) // 2) + OFFSET_X
    y_texto = cfg['BC_TEXT_Y']
    draw.text((x_texto, y_texto), texto_bar, fill="black", font=fuente_bar)
    draw.text((x_texto + 1, y_texto), texto_bar, fill="black", font=fuente_bar) # Bold

    # Convertir a Blanco y Negro de alto contraste para térmica
    img_gris = img.convert("L")
    img_final = img_gris.point(lambda x: 0 if x < 190 else 255, "1")
    return img_final

def generar_tspl_raw(img, size_name="50x25", copias=1):
    """
    Convierte la imagen procesada de la etiqueta en comandos nativos binarios TSPL
    para impresoras térmicas (Vorttek, Niimbot, TSC, Xprinter, etc.)
    """
    try:
        parts = size_name.split("x")
        w_mm = int(parts[0])
        h_mm = int(parts[1])
    except Exception:
        w_mm, h_mm = 50, 25

    img_mono = img.convert("1")
    w_px, h_px = img_mono.size
    w_bytes = (w_px + 7) // 8

    # Generar bitmap. Si la impresora saca el fondo negro y letras blancas, no se deben invertir los bits (o viceversa).
    # Como estaba imprimiendo en negativo con b ^ 0xFF, ahora pasamos los bytes directos.
    tspl_bitmap = bytearray(img_mono.tobytes())

    tspl = bytearray()
    tspl.extend(f"SIZE {w_mm} mm, {h_mm} mm\r\n".encode("latin1"))
    tspl.extend(b"GAP 2 mm, 0 mm\r\n")
    tspl.extend(b"CLS\r\n")
    tspl.extend(f"BITMAP 0,0,{w_bytes},{h_px},0,".encode("latin1"))
    tspl.extend(tspl_bitmap)
    tspl.extend(f"\r\nPRINT 1,{copias}\r\n".encode("latin1"))
    return tspl

def generar_datos_impresion_macos(url_imagen, tamano_solicitado=None, datos_activo=None, impresora_solicitada=None, copias=1):
    """Retorna (tspl_data, matched_printer) o (None, None) en caso de error"""
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

        # 1. Generación Local
        if GENERACION_LOCAL_DISPONIBLE and datos_activo and datos_activo.get('idQr'):
            try:
                print(f"[*] Generando etiqueta localmente: {datos_activo.get('idQr')} - {datos_activo.get('descripcionCorta')} ({size_param})...")
                img_final = generar_imagen_local(datos_activo, cfg, size_name=size_param)
            except Exception as ex:
                print(f"[-] Falla en generación local ({ex}), intentando descarga...")

        # 2. Fallback descarga Nube
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

        # 3. Guardar comando TSPL binario
        # Rotar la imagen 180 grados para que salga orientada hacia arriba y sea fácil de leer sin rotar la cabeza
        img_final = img_final.rotate(180)
        tspl_data = generar_tspl_raw(img_final, size_name=size_param, copias=copias)

        # 4. Determinar impresora de destino en macOS CUPS
        detalles = obtener_impresoras_macos_detalles()
        
        target_printer = impresora_solicitada or IMPRESORA_PREDETERMINADA
        matched_printer = None

        if target_printer:
            clean_target = target_printer.lower().replace("_", "").replace("-", "").replace(" ", "")
            for q_name, q_desc in detalles:
                clean_q = q_name.lower().replace("_", "").replace("-", "").replace(" ", "")
                clean_d = q_desc.lower().replace("_", "").replace("-", "").replace(" ", "")
                if clean_target in clean_q or clean_target in clean_d or clean_q in clean_target or clean_d in clean_target:
                    matched_printer = q_name
                    break

        if not matched_printer:
            for q_name, q_desc in detalles:
                comb = (q_name + " " + q_desc).lower()
                if any(k in comb for k in ["etiqueta", "tally", "dascom", "dl_210", "vorttek", "niimbot", "tsc"]):
                    matched_printer = q_name
                    break
        
        if not matched_printer and detalles:
            matched_printer = detalles[0][0]

        return tspl_data, matched_printer

    except Exception as e:
        print(f"[-] Error durante generación de etiqueta: {e}")
        return None, None

def enviar_tspl_lpr(tspl_data, printer_name):
    try:
        with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as tmp:
            tmp_filename = tmp.name
            tmp.write(tspl_data)

        cmd = ["lpr", "-o", "raw"]
        if printer_name:
            cmd.extend(["-P", printer_name])
            print(f"[*] Enviando lote binario TSPL a la impresora macOS: '{printer_name}'")
        else:
            print(f"[*] Enviando lote binario TSPL a impresora predeterminada de macOS...")

        cmd.append(tmp_filename)
        res = subprocess.run(cmd, capture_output=True, text=True)

        try:
            os.remove(tmp_filename)
        except:
            pass

        if res.returncode == 0:
            print(f"[+] ¡Lote de impresión enviado con éxito a CUPS!")
            return True
        else:
            print(f"[-] Error enviando impresión vía lpr: {res.stderr}")
            return False
    except Exception as e:
        print(f"[-] Error crítico en lpr: {e}")
        return False

def iniciar():
    print("\n========================================================")
    print("      SERVIDOR DE IMPRESIÓN MACOS - PARAÍSO FLORAL      ")
    print("                 (Lotes Ultrarrápidos)                  ")
    print(f" ERP URL          : {HOST}")
    print(f" Impresora Target : {IMPRESORA_PREDETERMINADA or 'Auto-detectar / Sistema Predeterminada'}")
    print(f" Impresoras macOS : {', '.join(obtener_impresoras_macos()) or 'Ninguna detectada'}")
    print(f" Generación Local : {'ACTIVADA (Sin latencia)' if GENERACION_LOCAL_DISPONIBLE else 'DESACTIVADA'}")
    print("========================================================\n")

    org_id = os.environ.get("ORGANIZATION_ID", None)
    params = {}
    if org_id:
        params["orgId"] = org_id
        print(f"[*] Filtrando trabajos para la organización: {org_id}")

    print("🚀 Sondeando trabajos de impresión pendientes en la nube...\n")

    while True:
        tiempo_espera = TIEMPO_ESPERA_INACTIVO
        try:
            res = requests.get(API_PENDIENTES, params=params, timeout=5)
            if res.status_code == 200:
                trabajos = res.json().get('trabajos', [])
                if trabajos:
                    print(f"\n[+] Se encontraron {len(trabajos)} trabajos pendientes...")
                    
                    # Agrupar trabajos por urlImagen para procesarlos juntos (PRINT 1, copias)
                    grupos_por_url = {}
                    for t in trabajos:
                        url_img = t.get('urlImagen') or t.get('url_imagen')
                        if not url_img: continue
                        if url_img not in grupos_por_url:
                            grupos_por_url[url_img] = []
                        grupos_por_url[url_img].append(t)
                    
                    # Agrupar datos TSPL generados por impresora destino
                    lotes_por_impresora = {}

                    for url_img, jobs in grupos_por_url.items():
                        primer = jobs[0]
                        copias = len(jobs)
                        id_trabajo = primer['id']
                        tam_req = primer.get('tamano') or primer.get('size')
                        imp_req = primer.get('impresora')
                        activo_data = primer.get('activo')
                        
                        print(f"[*] Procesando imagen para lote de {copias} copias (Ref: #{id_trabajo})...")
                        tspl_data, matched_printer = generar_datos_impresion_macos(url_img, tam_req, activo_data, imp_req, copias)
                        
                        if tspl_data:
                            prn = matched_printer or "default"
                            if prn not in lotes_por_impresora:
                                lotes_por_impresora[prn] = {"tspl": bytearray(), "jobs": []}
                            lotes_por_impresora[prn]["tspl"].extend(tspl_data)
                            lotes_por_impresora[prn]["jobs"].extend(jobs)
                        else:
                            # Marcar como error si falló la generación
                            for j in jobs:
                                requests.post(API_COMPLETAR, json={"id": j['id'], "error": True})
                            print(f"[-] Error al procesar imagen para {copias} copias.")

                    # Enviar cada lote consolidado a su impresora correspondiente (Un solo lpr call por impresora!)
                    for prn, lote in lotes_por_impresora.items():
                        printer_name = None if prn == "default" else prn
                        success = enviar_tspl_lpr(lote["tspl"], printer_name)
                        
                        if success:
                            for j in lote["jobs"]:
                                requests.post(API_COMPLETAR, json={"id": j['id']})
                            print(f"[+] Lote enviado a la impresora y {len(lote['jobs'])} trabajos marcados como completados.")
                        else:
                            for j in lote["jobs"]:
                                requests.post(API_COMPLETAR, json={"id": j['id'], "error": True})
                            print(f"[-] Error enviando lote a la impresora. {len(lote['jobs'])} trabajos marcados con error.")

                    tiempo_espera = TIEMPO_ESPERA_ACTIVO

        except requests.exceptions.RequestException:
            pass
        except Exception as e:
            print(f"[-] Error en bucle principal: {e}")

        time.sleep(tiempo_espera)

if __name__ == '__main__':
    iniciar()
