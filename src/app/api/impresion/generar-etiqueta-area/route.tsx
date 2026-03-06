import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de ÁREA para impresión con la Tally Dascom DL-210
// Dimensiones: 1" x 2" a 203 DPI = 203px ancho x 406px alto (2" width, 1" height = 406x203)

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const codigoQr = searchParams.get('codigoQr') || 'ELIM-QR-TEST-001';
    const nombreArea = searchParams.get('nombreArea') || 'Área de Prueba';

    // 2" x 1" a 203 DPI (50.8mm x 25.4mm)
    // Ancho = 2" * 203 = 406px, Alto = 1" * 203 = 203px
    const W = 406;
    const H = 203;

    // Producción: QR del área (Apunta directamente al texto del código para ser leído por el escáner)
    const qrData = encodeURIComponent(codigoQr);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&margin=0&color=000000&bgcolor=FFFFFF`;

    // Cálculos dinámicos de tamaño de fuente
    const nombreFontSize = nombreArea.length > 40 ? 14 : nombreArea.length > 25 ? 16 : 22;

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
                    boxSizing: 'border-box',
                }}
            >
                {/* Columna Izquierda */}
                <div style={{ display: 'flex', flexDirection: 'column', width: 284, flexShrink: 0, height: H, backgroundColor: '#FFFFFF' }}>

                    {/* Header - Fondo Blanco (Logo completo) */}
                    <div style={{ display: 'flex', flexDirection: 'row', height: 50, padding: '10px 4px 2px', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blue-vineta.png"
                            width={160}
                            height={38}
                            alt="Logo Elim"
                            style={{ objectFit: 'contain', filter: 'grayscale(100%)' }}
                        />
                    </div>

                    {/* Título - Ahora es el Código */}
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#000000', padding: '4px 8px', height: 40, justifyContent: 'center', alignItems: 'center', borderBottom: '2.5px solid #000', width: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: codigoQr.length > 18 ? 16 : 18, fontWeight: 900, color: '#333333', letterSpacing: 1 }}>{codigoQr}</span>
                    </div>

                    {/* Nombre del Área */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FFFFFF', padding: '8px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <span style={{ fontSize: nombreFontSize, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>
                            {nombreArea.toUpperCase()}
                        </span>
                    </div>

                </div>

                {/* LÍNEA DIVISORIA */}
                <div style={{ width: 4, flexShrink: 0, backgroundColor: '#000000', height: '100%' }} />

                {/* Columna Derecha - QR más grande */}
                <div style={{ display: 'flex', flexDirection: 'column', width: 118, flexShrink: 0, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', height: H, padding: '4px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} width={108} height={108} alt="QR" style={{ backgroundColor: '#fff' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: 8, fontWeight: 900, color: '#000', textAlign: 'center', lineHeight: 1 }}>ESCANEAR PARA<br />INVENTARIAR</span>
                    </div>
                </div>

            </div>
        ),
        { width: W, height: H }
    );
}
