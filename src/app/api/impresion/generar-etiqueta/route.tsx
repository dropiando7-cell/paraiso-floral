import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de flor / producto / activo para impresión térmica
// Dimensiones estándar:
// 50x25 mm (2" x 1" a 203 DPI) = 399px ancho x 198px alto
// 50x30 mm = 399px ancho x 240px alto
// 50x33 mm = 399px ancho x 245px alto
// 70x40 mm = 559px ancho x 310px alto

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const idQr = searchParams.get('idQr') || '000000';
    const descripcion = searchParams.get('descripcion') || 'Sin descripción';
    const codigoBarras = searchParams.get('codigoBarras') || '';

    const size = searchParams.get('size') || '50x25';
    const is70x40 = size === '70x40';
    const is50x30 = size === '50x30';
    const is50x33 = size === '50x33';

    // Si no hay código de barras explícito, utilizamos el id interno como código de barra 1D
    const barcodeData = codigoBarras ? codigoBarras : idQr;

    // Dimensiones según tamaño solicitado
    const W = is70x40 ? 559 : 399;
    const H = is70x40 ? 310 : (is50x30 ? 240 : (is50x33 ? 245 : 198));

    const descStr = descripcion.substring(0, 60).toUpperCase().trim();
    const len = descStr.length;

    // Tamaño de texto MÁXIMO GRANDE y DINÁMICO:
    // - Muy Corto (<= 13 chars, ej. ROSA FLORIDA, GIRASOL): 36px (en 1 línea de alto impacto)
    // - Mediano (14-22 chars, ej. MACENLLANA MIXTOS, ROJA FREEDOM CARTON): 32px (en 2 líneas llenando el espacio)
    // - Largo (23-35 chars, ej. ROSA EXPLORER ROJA ECUADOR): 26px
    // - Muy largo (> 35 chars): 20px
    let descSize = 32;
    if (len <= 13) {
        descSize = is70x40 ? 44 : 36;
    } else if (len <= 22) {
        descSize = is70x40 ? 40 : 32;
    } else if (len <= 35) {
        descSize = is70x40 ? 32 : 26;
    } else {
        descSize = is70x40 ? 26 : 20;
    }

    const cfg = {
        padding: is70x40 ? '12px 16px 12px 16px' : '8px 12px 6px 12px',
        idSize: is70x40 ? 36 : 28,
        descSize: descSize,
        qrBoxSize: is70x40 ? 100 : 85,
        qrImgSize: is70x40 ? 95 : 85,
        barcodeWidth: is70x40 ? 480 : 310,
        barcodeHeight: is70x40 ? 54 : 46,
        barcodeTextSize: is70x40 ? 16 : 14,
    };

    const qrText = encodeURIComponent(`${req.nextUrl.origin}/f/${idQr}`);
    // Usamos eclevel=L (menor densidad) para que los puntos del QR sean más grandes y definidos en impresoras térmicas
    const qrUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=4&eclevel=L&includetext=false`;

    const barcodeHeightAPI = is70x40 ? 14 : 12;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&height=${barcodeHeightAPI}&scale=3&includetext=false`;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: W,
                    height: H,
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'sans-serif',
                    padding: cfg.padding,
                    boxSizing: 'border-box',
                }}
            >
                {/* FILA SUPERIOR: ID + Nombre de la Flor (izquierda) + Código QR (derecha) */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                    
                    {/* COLUMNA IZQUIERDA: ID y Descripción Dinámica GIGANTE */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '8px', maxWidth: `${W - cfg.qrBoxSize - 46}px`, overflow: 'hidden' }}>
                        <span style={{ fontSize: cfg.idSize, fontWeight: 900, color: '#000', marginBottom: '1px', letterSpacing: '-0.5px' }}>
                            {idQr}
                        </span>
                        <span style={{ 
                            fontSize: cfg.descSize, 
                            fontWeight: 900, 
                            color: '#000', 
                            lineHeight: 1.05, 
                            overflow: 'hidden', 
                            wordBreak: 'break-word',
                        }}>
                            {descStr}
                        </span>
                    </div>

                    {/* COLUMNA DERECHA: QR Code */}
                    <div style={{ display: 'flex', width: cfg.qrBoxSize, height: cfg.qrBoxSize, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR" width={cfg.qrImgSize} height={cfg.qrImgSize} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>

                </div>

                {/* FILA INFERIOR: Código de Barras grande y texto bien centrado */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: 'auto' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodeUrl} alt="Barcode" width={cfg.barcodeWidth} height={cfg.barcodeHeight} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: cfg.barcodeTextSize, marginTop: '2px', letterSpacing: 2, fontWeight: 900, color: '#000' }}>
                        {barcodeData}
                    </span>
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
