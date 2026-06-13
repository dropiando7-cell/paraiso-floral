import urllib.parse
import requests
from PIL import Image, ImageDraw, ImageFont, ImageChops
import io
import os

# 70x40 configuration from print_server_unified.py
cfg = {
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

HOST = "https://bioelectronicahn.vercel.app"
id_qr = "BEA-001-000525"
descripcion = "UPS MUST MONOFÁSICA 10KVA".upper()
marca = "MUST"
modelo_display = "EH5 TLV-10K"
serie = "EH55102405100002"
codigo_barras = id_qr

def wrap_descripcion(texto, font, max_px=250):
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
    if medir(texto) <= max_px:
        return [texto]
    palabras = texto.split()
    linea1 = ""
    for i, palabra in enumerate(palabras):
        candidato = (linea1 + " " + palabra).strip() if linea1 else palabra
        if medir(candidato) <= max_px:
            linea1 = candidato
        else:
            palabras_l2 = palabras[i:]
            linea2 = " ".join(palabras_l2)
            if medir(linea2) <= max_px:
                return [linea1, linea2]
            while palabras_l2:
                candidato_l2 = " ".join(palabras_l2) + "..."
                if medir(candidato_l2) <= max_px:
                    return [linea1, candidato_l2]
                palabras_l2.pop()
            linea2_raw = " ".join(palabras[i:])
            while linea2_raw and medir(linea2_raw + "...") > max_px:
                linea2_raw = linea2_raw[:-1]
            return [linea1, linea2_raw + "..."]
    return [linea1]

# Canvas blanco
img_canvas = Image.new("RGB", (cfg['ANCHO_FIJO'], cfg['ALTO_MAXIMO']), (255, 255, 255))
draw = ImageDraw.Draw(img_canvas)

# Fonts fallback to default
font_id = font_desc = font_small = font_barcode = ImageFont.load_default()

# ── QR ──
qr_text = urllib.parse.quote(f"{HOST}/ficha-tecnica/{id_qr}")
qr_scale = cfg.get('QR_SCALE', 3)
qr_url  = (
    f"https://bwipjs-api.metafloor.com/?bcid=qrcode"
    f"&text={qr_text}&scale={qr_scale}&eclevel=M&includetext=false"
)
try:
    print(f"Fetching QR from: {qr_url}")
    req_qr = requests.get(qr_url, timeout=5)
    if req_qr.status_code == 200:
        qr_img   = Image.open(io.BytesIO(req_qr.content)).convert("RGBA")
        fondo_qr = Image.new("RGBA", qr_img.size, (255, 255, 255, 255))
        fondo_qr.paste(qr_img, mask=qr_img.split()[3] if len(qr_img.split()) == 4 else None)
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
        print(f"QR pasted at {x_qr}, {y_qr} with size {qr_w}x{qr_h}")
except Exception as e:
    print(f"Error QR: {e}")

# ── Textos ──
x_text = cfg['X_TEXT']
y_text = cfg['Y_TEXT']
draw.text((x_text, y_text), id_qr, font=font_id, fill=(0, 0, 0))

lineas_desc = wrap_descripcion(descripcion, font=font_desc, max_px=cfg['WRAP_MAX_PX'])
if len(lineas_desc) >= 2:
    draw.text((x_text, y_text + 30), lineas_desc[0], font=font_desc, fill=(0, 0, 0))
    draw.text((x_text, y_text + 50), lineas_desc[1], font=font_desc, fill=(0, 0, 0))
    y_offset = cfg['Y_OFFSET_2_LINES']
else:
    draw.text((x_text, y_text + 30), lineas_desc[0], font=font_desc, fill=(0, 0, 0))
    y_offset = cfg['Y_OFFSET_1_LINE']

if marca:
    draw.text((x_text, y_text + y_offset), f"Marca: {marca}", font=font_small, fill=(0, 0, 0))
    y_marca = cfg['MARCA_Y_OFFSET']
else:
    y_marca = 0
draw.text((x_text, y_text + y_offset + y_marca), f"Mod: {modelo_display}", font=font_small, fill=(0, 0, 0))

if serie:
    draw.text((x_text, y_text + y_offset + y_marca + cfg['SERIE_Y_OFFSET']), f"SN: {serie}", font=font_small, fill=(0, 0, 0))

bio_y = y_text + y_offset + y_marca + (cfg['BIO_Y_OFFSET_SERIE'] if serie else cfg['BIO_Y_OFFSET_NO_SERIE'])
font_bio = font_barcode
draw.text((x_text, bio_y), "BIOELECTRONICA", font=font_bio, fill=(0, 0, 0))

# ── Barcode ──
bc_text = urllib.parse.quote(codigo_barras)
cb_height = cfg.get("CB_HEIGHT", 6)
cb_scale = cfg.get("CB_SCALE", 2)
bc_url  = f"https://bwipjs-api.metafloor.com/?bcid=code128&text={bc_text}&height={cb_height}&scale={cb_scale}&includetext=false"
try:
    print(f"Fetching Barcode from: {bc_url}")
    req_bc = requests.get(bc_url, timeout=5)
    if req_bc.status_code == 200:
        bc_img   = Image.open(io.BytesIO(req_bc.content)).convert("RGBA")
        fondo_bc = Image.new("RGBA", bc_img.size, (255, 255, 255, 255))
        fondo_bc.paste(bc_img, mask=bc_img.split()[3] if len(bc_img.split()) == 4 else None)
        bc_rgb = fondo_bc.convert("RGB")

        bc_w, bc_h = bc_rgb.size
        if bc_w > cfg['ANCHO_FIJO'] - 32:
            bc_rgb = bc_rgb.resize((cfg['ANCHO_FIJO'] - 32, bc_h), Image.NEAREST)
            bc_w, bc_h = bc_rgb.size

        text_w = len(codigo_barras) * 10
        text_h = 16
        gap_texto  = 3
        
        bio_h = cfg['FONT_BIO']
        bottom_of_bio = bio_y + bio_h

        y_texto_cb = cfg['ALTO_MAXIMO'] - cfg['CB_MARGEN_INF'] - text_h
        y_bc       = y_texto_cb - gap_texto - bc_h

        margen_seguridad = 4
        if y_bc < bottom_of_bio + margen_seguridad:
            y_bc = bottom_of_bio + margen_seguridad
            y_texto_cb = y_bc + bc_h + gap_texto

        if y_bc < 0:
            y_bc = 2

        x_bc = (cfg['ANCHO_FIJO'] - bc_w) // 2
        img_canvas.paste(bc_rgb, (x_bc, y_bc))

        x_t = (cfg['ANCHO_FIJO'] - text_w) // 2
        draw.text((x_t, y_texto_cb), codigo_barras, font=font_barcode, fill=(0, 0, 0))
        print(f"Barcode pasted at {x_bc}, {y_bc} with size {bc_w}x{bc_h}")
except Exception as e:
    print(f"Error Barcode: {e}")

# Save image
img_canvas.save("test_label_native.png")
print("Saved test_label_native.png")
