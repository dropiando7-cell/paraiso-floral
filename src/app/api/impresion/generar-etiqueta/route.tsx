import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de activo para impresión con la Tally Dascom DL-210
// Dimensiones: 1" x 2" a 203 DPI = 203px ancho x 406px alto
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const idQr = searchParams.get('idQr') || 'ACTPB000000';
    const descripcion = searchParams.get('descripcion') || 'Sin descripción';
    const area = searchParams.get('area') || '';
    const cuenta = searchParams.get('cuenta') || '';
    const debug = searchParams.get('debug') === '1';

    // 1" x 2" a 203 DPI
    // Ancho = 2" * 203 = 406px, Alto = 1" * 203 = 203px  
    // (orientación horizontal: 2" de ancho, 1" de alto)
    const W = 406;
    const H = 203;

    if (debug) {
        // Etiqueta de prueba bien grande y en NEGRO PURO para impresoras térmicas
        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: W,
                        height: H,
                        backgroundColor: '#FFFFFF',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#000000', textAlign: 'center', letterSpacing: '-1px' }}>
                        God Bless You
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#000000', marginTop: 10, textAlign: 'center' }}>
                        Prueba de Impresión
                    </div>
                </div>
            ),
            { width: W, height: H }
        );
    }

    // Producción: QR del activo (Apunta a la ficha técnica)
    const qrData = encodeURIComponent(`${req.nextUrl.origin}/ficha-tecnica/${idQr}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&margin=0&color=000000&bgcolor=FFFFFF`;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: W,
                    height: H,
                    backgroundColor: '#FFFFFF',
                    padding: '12px 14px',
                    fontFamily: 'sans-serif',
                    boxSizing: 'border-box',
                    position: 'relative',
                }}
            >
                {/* Columna Izquierda - Datos */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        paddingRight: '10px',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* Header con Logo */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '4px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blue-vineta.png"
                            width={45}
                            height={45}
                            alt="Logo Elim"
                            style={{ objectFit: 'contain', marginRight: '8px' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, color: '#000', lineHeight: 1 }}>Iglesia de Cristo</span>
                            <span style={{ fontSize: 13, fontWeight: 900, color: '#000', lineHeight: 1.1 }}>Misión Cristiana Elim</span>
                            <span style={{ fontSize: 9, color: '#000', lineHeight: 1 }}>Honduras</span>
                        </div>
                    </div>

                    {/* Fila ID */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', marginBottom: '4px' }}>
                        <span style={{ fontSize: 24, fontWeight: 500, color: '#000', marginRight: '6px' }}>ID.</span>
                        <span style={{ fontSize: 32, fontWeight: 800, color: '#CC0000', letterSpacing: '-1px' }}>
                            {idQr}
                        </span>
                    </div>

                    {/* Fila CTA y MOB */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>
                            CTA. {cuenta.substring(0, 18).toUpperCase()}
                        </span>
                    </div>

                    {/* Fila AREA */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>
                            AREA. {area.substring(0, 25).toUpperCase()}
                        </span>
                    </div>

                    {/* Footer - Nombre del Activo y Serie */}
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#000', lineHeight: 1.1, textTransform: 'uppercase' }}>
                            {descripcion.substring(0, 30)}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#000', marginTop: '2px', textTransform: 'uppercase' }}>
                            SISTEMAS ELIM - GESTIÓN DE ACTIVOS
                        </span>
                    </div>
                </div>

                {/* Columna Derecha - Código QR grande */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        width: 150,
                        height: '100%',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} width={150} height={150} alt="QR Ficha Tecnica" style={{ backgroundColor: '#fff' }} />
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
