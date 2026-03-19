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
    
    // Si no hay codigo de barras explícito, utilizamos el id interno como codigo de barra 1D también.
    const barcodeData = codigoBarras ? codigoBarras : idQr;

    // 2" x 1.3" a 203 DPI (50.8mm x 33mm)
    // Ancho = 2" * 203 = 406px, Alto = 1.3" * 203 = 264px
    const W = 406;
    const H = 264;

    // QR Codes
    const qrText = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${idQr}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrText}&margin=0&color=000000&bgcolor=FFFFFF`;

    // 1D Barcode (Code128) API
    // Usamos bwipjs-api o incrustar directamente. bcid=code128 es robusto.
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&height=12&scale=2&includetext=false`;

    const descStr = descripcion.toUpperCase() || 'SIN DESCRIPCIÓN';
    const descFontSize = descStr.length > 25 ? 16 : 20;

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
                    padding: '8px',
                    border: '2px solid #000' // Borde guía
                }}
            >
                {/* Cabecera / Marca */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#000', letterSpacing: -0.5 }}>BIOELECTRÓNICA HONDURAS</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#444' }}>SKU interno: {idQr}</span>
                    </div>
                </div>

                {/* Producto */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingBottom: '6px' }}>
                    <span style={{ fontSize: descFontSize, fontWeight: 800, color: '#000', lineHeight: 1.1 }}>
                        {descStr}
                    </span>
                </div>

                {/* Códigos Split */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 }}>
                    
                    {/* Izquierda: Codigo barra 1D */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60%' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={barcodeUrl} style={{ width: '100%', height: 75, objectFit: 'contain' }} alt="Barcode" />
                        <span style={{ fontSize: 18, fontWeight: 900, marginTop: '4px', letterSpacing: 1 }}>{barcodeData}</span>
                    </div>

                    {/* Derecha: QR Code para movil/tecnicos */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} style={{ width: 90, height: 90, objectFit: 'contain' }} alt="QR" />
                        <span style={{ fontSize: 10, fontWeight: 900, marginTop: '2px' }}>FICHA TÉCNICA</span>
                    </div>
                    
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
