import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de activo para impresión con la Tally Dascom DL-210
// Dimensiones: 1" x 2" a 203 DPI = 203px ancho x 406px alto

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
    
    // Si no hay codigo de barras explícito, utilizamos el id interno como codigo de barra 1D también.
    const barcodeData = codigoBarras ? codigoBarras : idQr;

    // 2" x 1.3" a 203 DPI (50.8mm x 33mm) - NIIMBOT K3 standard
    const W = 406;
    const H = 264;

    const qrText = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${idQr}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrText}&margin=0&color=000000&bgcolor=FFFFFF`;

    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&height=12&scale=2&includetext=false`;

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
                    padding: '12px',
                    borderRadius: '8px', 
                    border: '1px solid #eee' // Soft edge just for preview visualization
                }}
            >
                {/* Top Row */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '4px' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#111', marginTop: '4px' }}>{idQr}</span>
                    <div style={{ display: 'flex', width: 44, height: 44 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} style={{ width: '100%', height: '100%' }} alt="QR" />
                    </div>
                </div>

                {/* Item Name */}
                <div style={{ display: 'flex', flexDirection: 'row', marginTop: '-12px', marginBottom: '6px', height: 50, overflow: 'hidden', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: isLongName ? 16 : 24, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>
                        {descStr}
                    </span>
                </div>

                {/* Meta Data */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>Received Date: {fechaAdqDisplay}</span>
                    <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>Model / Brand: {modeloDisplay}</span>
                </div>

                {/* Barcode section */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginTop: 'auto' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#444', marginRight: '8px', marginTop: '6px' }}>Lot No:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={barcodeUrl} style={{ width: '100%', height: 45, objectFit: 'fill' }} alt="Barcode" />
                        <span style={{ fontSize: 10, marginTop: '2px', letterSpacing: 1.5, fontWeight: 600, color: '#000' }}>{barcodeData}</span>
                    </div>
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
