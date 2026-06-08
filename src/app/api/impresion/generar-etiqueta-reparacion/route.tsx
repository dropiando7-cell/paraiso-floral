import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Genera un PNG de la etiqueta de trazabilidad para reparaciones
// Soporta los 3 tamaños: 50x25, 50x30 y 70x40

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ordenId = searchParams.get('ordenId') || 'SIN-ORDEN';
    const serie = searchParams.get('serie') || 'N/A';
    const cliente = searchParams.get('cliente') || 'Sin cliente';
    const equipo = searchParams.get('equipo') || 'Sin especificar';
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    const marcaModelo = searchParams.get('marcaModelo') || '';
    const kanbanCodigo = searchParams.get('kanbanCodigo') || '';

    const size = searchParams.get('size') || '50x30';
    const is70x40 = size === '70x40';
    const is50x25 = size === '50x25';

    // Dimensiones según tamaño (203 DPI)
    const W = is70x40 ? 559 : 406;
    const H = is70x40 ? 320 : (is50x25 ? 203 : 264);
    
    // Configuraciones de estilo dinámicas para encajar todo
    const cfg = {
        padding: is70x40 ? '22px 20px 22px 20px' : (is50x25 ? '16px 12px 16px 12px' : '20px 14px 20px 14px'),
        titleSize: is70x40 ? 16 : (is50x25 ? 11 : 14),
        idSize: is70x40 ? 24 : (is50x25 ? 15 : 20),
        descSize: is70x40 ? 20 : (is50x25 ? 13 : 16),
        metaSize: is70x40 ? 15 : (is50x25 ? 10 : 12),
        qrSize: is70x40 ? 110 : (is50x25 ? 75 : 90),
        qrImgSize: is70x40 ? 105 : (is50x25 ? 70 : 85),
        bioSize: is70x40 ? 16 : (is50x25 ? 10 : 13),
        barcodeWidth: is70x40 ? 500 : (is50x25 ? 350 : 370),
        barcodeHeight: is70x40 ? 40 : (is50x25 ? 18 : 26),
        barcodeTextSize: is70x40 ? 14 : (is50x25 ? 10 : 11),
    };

    const host = req.headers.get('host') || 'bioelectronicahn.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const qrText = encodeURIComponent(`${protocol}://${host}/trazabilidad/${ordenId}`);
    const qrUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=5&eclevel=M&includetext=false`;

    const barcodeHeightAPI = is50x25 ? 6 : 8;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(ordenId)}&height=${barcodeHeightAPI}&scale=4&includetext=false`;

    const equipoStr = equipo.substring(0, 40).toUpperCase();
    const clienteStr = cliente.substring(0, 30).toUpperCase();
    const marcaModeloStr = marcaModelo.substring(0, 30).toUpperCase();

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

                    {/* LEFT COLUMN: Data */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '10px' }}>
                        <span style={{ fontSize: cfg.titleSize + 1, fontWeight: 900, color: '#000', marginBottom: '6px' }}>
                            ORDEN REP.: {ordenId} {kanbanCodigo ? `(${kanbanCodigo})` : ''}
                        </span>
                        
                        <span style={{ fontSize: cfg.descSize, fontWeight: 900, color: '#000', lineHeight: 1.1, overflow: 'hidden' }}>
                            {equipoStr}
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '6px' }}>
                            <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Cli: {clienteStr}</span>
                            {marcaModeloStr && (
                                <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Mod: {marcaModeloStr}</span>
                            )}
                            <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>S/N: {serie}</span>
                            <span style={{ fontSize: cfg.metaSize, color: '#333', fontWeight: 600 }}>Fec: {fecha}</span>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: QR Code */}
                    <div style={{ display: 'flex', width: cfg.qrSize, height: cfg.qrSize, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR" width={cfg.qrImgSize} height={cfg.qrImgSize} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>

                </div>

                {/* EMPRESA ROW */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: '4px', marginBottom: '2px', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: cfg.bioSize, color: '#000', fontWeight: 900, letterSpacing: 1 }}>BIOELECTRONICA HONDURAS</span>
                </div>

                {/* BARCODE ROW */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodeUrl} alt="Barcode" width={cfg.barcodeWidth} height={cfg.barcodeHeight} style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: cfg.barcodeTextSize, marginTop: '2px', letterSpacing: 3, fontWeight: 900, color: '#000' }}>{ordenId}</span>
                </div>
            </div>
        ),
        { width: W, height: H }
    );
}
