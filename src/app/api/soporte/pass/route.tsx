import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract parameters
        const code = searchParams.get('code') || '000000';
        const equipo = searchParams.get('equipo') || 'Equipo Médico';

        // Pre-fetch images to avoid Twilio timeouts
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`;

        const [qrRes] = await Promise.all([
            fetch(qrUrl)
        ]);

        const qrArrayBuffer = await qrRes.arrayBuffer();

        const qrBase64 = `data:${qrRes.headers.get('content-type') || 'image/png'};base64,${Buffer.from(qrArrayBuffer).toString('base64')}`;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                        fontFamily: 'system-ui, sans-serif',
                        padding: '40px',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Brand Header Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: '#4f46e5', // indigo-600
                            borderRadius: '32px',
                            padding: '30px',
                            width: '100%',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px', color: '#ffffff' }}>
                            BIOELECTRÓNICA HONDURAS
                        </span>
                        
                        <span style={{ fontSize: '20px', fontWeight: 500, opacity: 0.9, marginBottom: '20px' }}>
                            Soporte y Reparaciones
                        </span>

                        <span style={{ fontSize: '36px', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '16px' }}>
                            {equipo}
                        </span>
                        
                        <span style={{ fontSize: '22px', fontWeight: 600, marginTop: '20px', letterSpacing: '2px' }}>
                            ORDEN: {code}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: '40px', width: '100%' }}>
                        {/* QR Code Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ padding: '20px', backgroundColor: 'white', border: '3px solid #e2e8f0', borderRadius: '28px', display: 'flex' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrBase64} width="220" height="220" alt="QR Code" />
                            </div>
                            <span style={{ marginTop: '20px', fontSize: '20px', fontWeight: 600, color: '#64748b' }}>
                                Escanea para retirar
                            </span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 800,
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=31536000, immutable'
                }
            }
        );
    } catch (e: any) {
        console.error('Error generating image response', e);
        return new Response(`Failed to generate the image: ${e.message}`, {
            status: 500,
        });
    }
}
