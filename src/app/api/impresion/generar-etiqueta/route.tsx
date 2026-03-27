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
    const fechaFabUrl = searchParams.get('fechaFab') || '';
    const fechaVencUrl = searchParams.get('fechaVenc') || '';
    const serieUrl = searchParams.get('serie') || '';
    
    // Si no hay codigo de barras explícito, utilizamos el id interno como codigo de barra 1D también.
    const barcodeData = codigoBarras ? codigoBarras : idQr;

    // 2" x 1.3" a 203 DPI (50.8mm x 33mm) - NIIMBOT K3 standard
    const W = 406;
    const H = 264;

    const qrText = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${idQr}`);
    // Usamos el motor puro de bwipjs en lugar de qrserver para prevenir interpolación de grises
    const qrUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=5&eclevel=L&includetext=false`;

    // Escalamos a 5 (alta resolución) y usamos altura 10mm (aproximadamente 55 pixels nativos) para ser súper nítido
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&height=10&scale=5&includetext=false`;

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
                    padding: '16px 16px 16px 16px', // Padding inferior ajustado
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    
                    {/* LEFT COLUMN: Data */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#000', marginBottom: '8px' }}>{idQr}</span>
                        <span style={{ fontSize: isLongName ? 16 : 20, fontWeight: 900, color: '#000', lineHeight: 1.1, maxHeight: 60, overflow: 'hidden' }}>
                            {descStr}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                            <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>Adq: {fechaAdqDisplay}</span>
                            <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>Mod: {modeloDisplay}</span>
                            {serieUrl && <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>SN: {serieUrl}</span>}
                            {fechaFabUrl && <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>Fab: {fechaFabUrl}</span>}
                            {fechaVencUrl && <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>Venc: {fechaVencUrl}</span>}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: QR Code */}
                    <div style={{ display: 'flex', width: 95, height: 95, flexShrink: 0, padding: '4px', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Al no forzar 100% de width Satori respeta el tamaño sin anti-aliasing */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR" width={87} height={87} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>

                </div>

                {/* BOTTOM ROW: Barcode */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', marginBottom: '0px', width: '100%' }}>
                    {/* Al forzar width=360 (par) y la etiqueta width=406 (par), el centrado es X=23 px (preciso a 1 entero) lo cual evita desenfoque decimal */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodeUrl} alt="Barcode" width={360} height={50} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: 13, marginTop: '4px', letterSpacing: 4, fontWeight: 900, color: '#000' }}>{barcodeData}</span>
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
