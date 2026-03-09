import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de ÁREA para impresión con la Tally Dascom DL-210
// Dimensiones: 1" x 2" a 203 DPI = 203px ancho x 406px alto (2" width, 1" height = 406x203)
// Layout optimizado para legibilidad a distancia

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const idQr = searchParams.get('idQr') || 'ELIM-QR-AREA-TEST';
    const areaName = searchParams.get('areaName') || 'ÁREA DESCONOCIDA';
    const areaPrefix = searchParams.get('areaPrefix') || 'ELIM-TEST';
    const debug = searchParams.get('debug') === '1';

    let finalIdQr = idQr;
    let finalAreaName = areaName;
    let finalAreaPrefix = areaPrefix;

    if (debug) {
        // En modo debug sobreescribimos con datos de prueba
        finalIdQr = 'ELIM-QR-PB-A01-OFI';
        finalAreaName = 'Planta Alta - Salón Multiusos 2';
        finalAreaPrefix = 'PA-A1-SAL.MUL';
    }

    // 2" x 1" a 203 DPI (50.8mm x 25.4mm)
    // Ancho = 2" * 203 = 406px, Alto = 1" * 203 = 203px
    const W = 406;
    const H = 203;

    // Obtener host de los headers para construir la URL absoluta (Deep Link)
    const host = req.headers.get('host') || 'sistemaselim.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const fullUrl = `${protocol}://${host}/inventario?areaQr=${finalIdQr}`;

    // Producción: QR Code con el URL completo hacia la pantalla de inventario
    const qrData = encodeURIComponent(fullUrl);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}&margin=0&color=000000&bgcolor=FFFFFF`;

    // Calcular tamaño de fuente dinámico para el nombre para que quepa bien
    const nameStr = finalAreaName.toUpperCase();
    const nameFontSize = nameStr.length > 35 ? 16 : nameStr.length > 25 ? 18 : nameStr.length > 15 ? 22 : 26;

    const prefixFontSize = Math.min(26, Math.max(10, Math.floor(330 / Math.max(1, finalIdQr.length))));

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: W,
                    height: H,
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'sans-serif',
                    boxSizing: 'border-box',
                    border: '4px solid #000' // Borde grueso visible
                }}
            >
                {/* Columna Izquierda - Data */}
                <div style={{ display: 'flex', flexDirection: 'column', width: 230, flexShrink: 0, height: '100%', backgroundColor: '#FFFFFF', borderRight: '4px solid #000', padding: '6px' }}>

                    {/* Logo/Header */}
                    <div style={{ display: 'flex', flexDirection: 'row', height: 40, alignItems: 'center', justifyContent: 'center', borderBottom: '2px dashed #000', paddingBottom: '4px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blue-vineta.png"
                            width={140}
                            height={32}
                            alt="Logo Elim"
                            style={{ objectFit: 'contain', filter: 'grayscale(100%)' }}
                        />
                    </div>

                    {/* Titulo */}
                    <div style={{ display: 'flex', padding: '6px 0 2px 0', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#000', letterSpacing: 1, fontFamily: 'sans-serif' }}>CÓDIGO DE ÁREA</span>
                    </div>

                    {/* Area Name Completo */}
                    <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden', padding: '0 4px' }}>
                        <span style={{
                            fontSize: nameFontSize, fontWeight: 900, color: '#000', lineHeight: 1.1, fontFamily: 'sans-serif', letterSpacing: -0.5,
                            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden'
                        }}>
                            {nameStr}
                        </span>
                    </div>

                    {/* Prefix Area Bottom (ahora usando el Código QR o full ID completo, a petición del usuario) */}
                    <div style={{ display: 'flex', height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderTop: '2px solid #000', paddingTop: '4px' }}>
                        <span style={{ fontSize: prefixFontSize, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap', color: '#000', fontFamily: 'sans-serif', letterSpacing: -0.5 }}>
                            {finalIdQr}
                        </span>
                    </div>
                </div>

                {/* Columna Derecha - QR Grande al centro */}
                <div style={{ display: 'flex', flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                    <div style={{ display: 'flex', padding: '4px', border: '2px solid #000', borderRadius: '4px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} width={150} height={150} alt="QR de Área" style={{ display: 'flex' }} />
                    </div>
                </div>
            </div>
        ),
        {
            width: W,
            height: H,
        }
    );
}
