import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de activo para impresión con la Tally Dascom DL-210 o similar
// Dimensiones: 2" x 1" a 203 DPI = 406px ancho x 203px alto (50x25)
// Solo incluye Código, Nombre, QR a la derecha y Código de barras abajo.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const idQr = searchParams.get('idQr') || 'ACTPB000000';
    const descripcion = searchParams.get('descripcion') || 'Sin descripción';
    const codigoBarras = searchParams.get('codigoBarras') || '';

    const size = searchParams.get('size') || '50x25';
    const is70x40 = size === '70x40';
    const is50x25 = size === '50x25';

    // Si no hay codigo de barras explícito, utilizamos el id interno como codigo de barra 1D también.
    const barcodeData = codigoBarras ? codigoBarras : idQr;

    // Dimensiones según tamaño
    const W = is70x40 ? 559 : 406;
    const H = is70x40 ? 320 : (is50x25 ? 203 : 264);
    
    // Configuraciones de estilo dinámicas
    const cfg = {
        padding: is70x40 ? '22px 20px 22px 20px' : (is50x25 ? '10px 10px 10px 10px' : '20px 14px 20px 14px'),
        idSize: is70x40 ? 22 : (is50x25 ? 18 : 17),
        descSizeLong: is70x40 ? 18 : (is50x25 ? 13 : 14),
        descSizeShort: is70x40 ? 22 : (is50x25 ? 16 : 18),
        qrSize: is70x40 ? 110 : (is50x25 ? 85 : 90),
        qrImgSize: is70x40 ? 105 : (is50x25 ? 80 : 85),
        barcodeWidth: is70x40 ? 500 : (is50x25 ? 386 : 370),
        barcodeHeight: is70x40 ? 40 : (is50x25 ? 35 : 26),
        barcodeTextSize: is70x40 ? 14 : (is50x25 ? 12 : 11),
    };

    const qrText = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${idQr}`);
    const qrUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=5&eclevel=M&includetext=false`;

    // Barcode height=12 para 50x25 para que tenga suficiente resolución y altura
    const barcodeHeightAPI = is50x25 ? 12 : 8;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&height=${barcodeHeightAPI}&scale=4&includetext=false`;

    const descStr = descripcion.substring(0, 60).toUpperCase();
    const isLongName = descStr.length > 22;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: W,
                    height: H,
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'sans-serif',
                    padding: cfg.padding,
                    boxSizing: 'border-box',
                }}
            >
                {/* TOP ROW: Data (left) + QR (right) */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', flex: 1, overflow: 'hidden' }}>

                    {/* LEFT COLUMN: ID + Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '10px', overflow: 'hidden' }}>
                        <span style={{ fontSize: cfg.idSize, fontWeight: 900, color: '#000', marginBottom: '2px' }}>{idQr}</span>
                        <span style={{ fontSize: isLongName ? cfg.descSizeLong : cfg.descSizeShort, fontWeight: 900, color: '#000', lineHeight: 1.1, overflow: 'hidden', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                            {descStr}
                        </span>
                    </div>

                    {/* RIGHT COLUMN: QR Code */}
                    <div style={{ display: 'flex', width: cfg.qrSize, height: cfg.qrSize, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR" width={cfg.qrImgSize} height={cfg.qrImgSize} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>

                </div>

                {/* BARCODE ROW: altura y texto controlados para no desbordarse */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '8px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodeUrl} alt="Barcode" width={cfg.barcodeWidth} height={cfg.barcodeHeight} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: cfg.barcodeTextSize, marginTop: '2px', letterSpacing: 3, fontWeight: 900, color: '#000' }}>{barcodeData}</span>
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
