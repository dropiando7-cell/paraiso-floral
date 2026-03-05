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
        // Etiqueta de prueba simple para verificar que el servidor Python recibe la impresión
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
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#000', textAlign: 'center' }}>
                        ✅ IMPRESION EXITOSA
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0500A3', marginTop: 6, textAlign: 'center' }}>
                        ELIM - Activos Fijos
                    </div>
                    <div style={{ fontSize: 9, color: '#888', marginTop: 6, textAlign: 'center' }}>
                        sistemaselim.app — Tally Dascom DL-210
                    </div>
                </div>
            ),
            { width: W, height: H }
        );
    }

    // Producción: QR del activo
    const qrData = encodeURIComponent(`${req.nextUrl.origin}/activo/${idQr}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&margin=0`;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: W,
                    height: H,
                    backgroundColor: '#FFFFFF',
                    padding: '8px',
                    fontFamily: 'sans-serif',
                    boxSizing: 'border-box',
                }}
            >
                {/* Columna izquierda - Texto */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        paddingRight: '6px',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 7, color: '#555' }}>Misión Cristiana Elim — HN</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 7, color: '#333', fontWeight: 600 }}>ID.</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#CC0000', lineHeight: 1 }}>
                            {idQr}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 7, fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
                            CTA. {cuenta.substring(0, 14)}
                        </div>
                        <div style={{ fontSize: 7, fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
                            AREA.{area}
                        </div>
                    </div>
                    <div style={{ fontSize: 7, color: '#555', lineHeight: 1.2 }}>
                        {descripcion.substring(0, 40)}
                    </div>
                </div>

                {/* QR */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 120,
                        flexShrink: 0,
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} width={115} height={115} alt="QR" style={{ display: 'block' }} />
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
