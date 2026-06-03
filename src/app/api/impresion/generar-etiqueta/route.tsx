import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de activo para impresión con la Tally Dascom DL-210
// Dimensiones: 2" x 1.3" a 203 DPI = 406px ancho x 264px alto

// Mapa basado en cuentas contables de activos.csv
const ACCOUNT_ABBR_MAP: Record<string, string> = {
    'Terrenos': 'TERRENOS',
    'Edificios': 'EDIFICIOS',
    'Vehículos': 'VEHICULOS',
    'Equipo de Cómputo': 'EQ. COMPUTO',
    'Mobiliario y Equipo de Oficina': 'MOB. OFICINA',
    'Mobiliario y Equipo de Templo': 'MOB.TEMPLO',
    'Equipo de Audio e Instrumentos': 'EQ. AUD/INST',
    'Mejoras a Edificios': 'MEJ. EDIFICIO',
    'Equipos Diversos': 'EQ. DIVERSOS',
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const idQr = searchParams.get('idQr') || 'ACTPB000000';
    const descripcion = searchParams.get('descripcion') || 'Sin descripción';
    const rawCuenta = searchParams.get('cuenta') || '';
    const cuenta = ACCOUNT_ABBR_MAP[rawCuenta] || rawCuenta;
    const codigoBarras = searchParams.get('codigoBarras') || '';

    const fechaAdqUrl = searchParams.get('fechaAdq') || '';
    const modeloUrl = searchParams.get('modelo') || '';
    const marcaUrl = searchParams.get('marca') || '';
    const fechaFabUrl = searchParams.get('fechaFab') || '';
    const fechaVencUrl = searchParams.get('fechaVenc') || '';
    const serieUrl = searchParams.get('serie') || '';

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
        padding: is70x40 ? '22px 20px 22px 20px' : (is50x25 ? '16px 12px 16px 12px' : '20px 14px 20px 14px'),
        idSize: is70x40 ? 22 : (is50x25 ? 14 : 17),
        descSizeLong: is70x40 ? 18 : (is50x25 ? 11 : 14),
        descSizeShort: is70x40 ? 22 : (is50x25 ? 14 : 18),
        metaSize: is70x40 ? 15 : (is50x25 ? 10 : 12),
        qrSize: is70x40 ? 110 : (is50x25 ? 75 : 90),
        qrImgSize: is70x40 ? 105 : (is50x25 ? 70 : 85),
        bioSize: is70x40 ? 16 : (is50x25 ? 10 : 13),
        barcodeWidth: is70x40 ? 500 : (is50x25 ? 350 : 370),
        barcodeHeight: is70x40 ? 40 : (is50x25 ? 18 : 26),
        barcodeTextSize: is70x40 ? 14 : (is50x25 ? 10 : 11),
    };

    const qrText = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${idQr}`);
    const qrUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=5&eclevel=M&includetext=false`;

    // Barcode height=8 para que quepa sin desbordarse fuera de los 264px de alto
    const barcodeHeightAPI = is50x25 ? 6 : 8;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&height=${barcodeHeightAPI}&scale=4&includetext=false`;

    const descStr = descripcion.substring(0, 60).toUpperCase();
    const isLongName = descStr.length > 22;
    const fechaAdqDisplay = fechaAdqUrl ? new Date(fechaAdqUrl).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const modeloDisplay = modeloUrl || marcaUrl || 'N/A';

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
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', flex: 1 }}>

                    {/* LEFT COLUMN: ID + Description + Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '10px' }}>
                        <span style={{ fontSize: cfg.idSize, fontWeight: 900, color: '#000', marginBottom: '5px' }}>{idQr}</span>
                        <span style={{ fontSize: isLongName ? cfg.descSizeLong : cfg.descSizeShort, fontWeight: 900, color: '#000', lineHeight: 1.1, overflow: 'hidden', wordBreak: 'keep-all', overflowWrap: 'normal' }}>
                            {descStr}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '8px' }}>
                            {marcaUrl ? (
                                <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Marca: {marcaUrl}</span>
                            ) : (
                                <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Adq: {fechaAdqDisplay}</span>
                            )}
                            <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Mod: {modeloDisplay}</span>
                            {serieUrl && <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>SN: {serieUrl}</span>}
                            {fechaFabUrl && <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Fab: {fechaFabUrl}</span>}
                            {fechaVencUrl && <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Venc: {fechaVencUrl}</span>}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: QR Code */}
                    <div style={{ display: 'flex', width: cfg.qrSize, height: cfg.qrSize, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR" width={cfg.qrImgSize} height={cfg.qrImgSize} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>

                </div>

                {/* EMPRESA ROW: separado del barcode para que siempre sea visible */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: '4px', marginBottom: '2px' }}>
                    <span style={{ fontSize: cfg.bioSize, color: '#000', fontWeight: 900, letterSpacing: 1 }}>BIOELECTRONICA</span>
                </div>

                {/* BARCODE ROW: altura y texto controlados para no desbordarse de los 264px */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodeUrl} alt="Barcode" width={cfg.barcodeWidth} height={cfg.barcodeHeight} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: cfg.barcodeTextSize, marginTop: '2px', letterSpacing: 3, fontWeight: 900, color: '#000' }}>{barcodeData}</span>
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
