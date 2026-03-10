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
    const area = searchParams.get('area') || '';
    const rawCuenta = searchParams.get('cuenta') || '';
    const cuenta = ACCOUNT_ABBR_MAP[rawCuenta] || rawCuenta;
    const debug = searchParams.get('debug') === '1';

    let finalIdQr = idQr;
    let finalDescripcion = descripcion;
    let finalArea = area;
    let finalCuenta = cuenta;

    if (debug) {
        // En modo debug sobreescribimos con datos de prueba extendidos
        finalIdQr = 'ELIM-PB-A09-EB-0001';
        finalDescripcion = 'ESTA ES UNA DESCRIPCION LARGA DE PRUEBA';
        finalArea = 'PA-A6-EB'; // Para forzar calculo y render de area
        finalCuenta = 'MOB.TEMPLO';
    }

    // 2" x 1" a 203 DPI (50.8mm x 25.4mm)
    // Ancho = 2" * 203 = 406px, Alto = 1" * 203 = 203px
    const W = 406;
    const H = 203;

    // Producción: QR del activo (Apunta a la ficha técnica)
    const qrData = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${finalIdQr}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&margin=0&color=000000&bgcolor=FFFFFF`;

    const dateStr = new Date().toISOString().split('T')[0];

    // Cálculos dinámicos de tamaño de fuente
    // SOPORTE EXTENDIDO: Para IDs Grupo de 24 caracteres (ej ELIM-PB-A01-TMP-001-0001) reducimos la fuente a 18
    const idFontSize = finalIdQr.length >= 22 ? 18 : finalIdQr.length > 18 ? 22 : finalIdQr.length > 14 ? 28 : finalIdQr.length > 10 ? 34 : 40;

    const cuentaStr = finalCuenta.toUpperCase() || 'N/A';
    const cuentaFontSize = cuentaStr.length > 24 ? 11 : cuentaStr.length > 18 ? 13 : 16;

    const areaStr = finalArea.toUpperCase() || 'N/A';
    const areaFontSize = areaStr.length > 24 ? 11 : areaStr.length > 18 ? 13 : 16;

    const descStr = finalDescripcion.toUpperCase() || 'SIN DESCRIPCIÓN';
    const descFontSize = descStr.length > 24 ? 11 : descStr.length > 18 ? 13 : 14;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: W,
                    height: H,
                    backgroundColor: '#000000', // Borde negro total entre columnas
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Columna Izquierda - Estilo Stacked Clean */}
                <div style={{ display: 'flex', flexDirection: 'column', width: 270, flexShrink: 0, height: H, backgroundColor: '#FFFFFF' }}>

                    {/* Header - Fondo Blanco (Logo completo) */}
                    <div style={{ display: 'flex', flexDirection: 'row', height: 54, padding: '16px 4px 2px', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blue-vineta.png"
                            width={180}
                            height={42}
                            alt="Logo Elim"
                            style={{ objectFit: 'contain', filter: 'grayscale(100%)' }}
                        />
                    </div>

                    {/* ID Row - Fondo Blanco */}
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#000000', padding: '4px 8px', height: 52, justifyContent: 'center', overflow: 'hidden', borderBottom: '2.5px solid #000', width: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#333333', letterSpacing: 1, fontFamily: 'sans-serif' }}>ID DEL ACTIVO</span>
                        {/* NOTA: weight en 900 es el maximo standard, podemos simular más stroke si fuera web, pero en ImageResponse 900 es lo más denso */}
                        <span style={{ fontSize: idFontSize, fontWeight: 900, lineHeight: 1.1, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#000000', width: '100%', fontFamily: 'sans-serif', letterSpacing: -0.5 }}>
                            {finalIdQr}
                        </span>
                    </div>

                    {/* Meta Rows (3 rows) - Fondo Blanco. 
                        Aprovecharemos el espacio liberado por el Footer */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FFFFFF' }}>

                        {/* Cuenta */}
                        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'center', borderBottom: '2.5px solid #000' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 62, paddingLeft: 10, height: '100%' }}>
                                <span style={{ fontSize: 11, fontWeight: 900, color: '#000', fontFamily: 'sans-serif' }}>CUENTA</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '2px solid #000', height: '100%', marginRight: 10 }} />
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', paddingRight: '4px' }}>
                                <span style={{ fontSize: cuentaFontSize + 1, fontWeight: 900, color: '#000', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'sans-serif', letterSpacing: -0.2 }}>
                                    {cuentaStr}
                                </span>
                            </div>
                        </div>

                        {/* Área */}
                        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'center', borderBottom: '2.5px solid #000' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 62, paddingLeft: 10, height: '100%' }}>
                                <span style={{ fontSize: 11, fontWeight: 900, color: '#000', fontFamily: 'sans-serif' }}>ÁREA</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '2px solid #000', height: '100%', marginRight: 10 }} />
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', paddingRight: '4px' }}>
                                <span style={{ fontSize: areaFontSize + 1, fontWeight: 900, color: '#000', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'sans-serif', letterSpacing: -0.2 }}>
                                    {areaStr}
                                </span>
                            </div>
                        </div>

                        {/* Descripción (Antes Tipo) */}
                        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 62, paddingLeft: 10, height: '100%' }}>
                                <span style={{ fontSize: 11, fontWeight: 900, color: '#000', fontFamily: 'sans-serif' }}>DESC</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '2px solid #000', height: '100%', marginRight: 10 }} />
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', paddingRight: '4px' }}>
                                <span style={{ fontSize: descFontSize + 1, fontWeight: 900, color: '#000', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'sans-serif', letterSpacing: -0.2 }}>
                                    {descStr}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* LÍNEA DIVISORIA */}
                <div style={{ width: 4, flexShrink: 0, backgroundColor: '#000000', height: H }} />

                {/* Columna Derecha - QR */}
                <div style={{ display: 'flex', flexDirection: 'column', width: 132, flexShrink: 0, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', height: H }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} width={118} height={118} alt="QR" style={{ backgroundColor: '#fff' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#000', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>sistemaselim.app</span>
                    </div>
                </div>

            </div>
        ),
        { width: W, height: H }
    );
}
