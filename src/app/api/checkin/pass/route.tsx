import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract parameters
        const name = searchParams.get('name') || 'Niño/a Elim';
        const code = searchParams.get('code') || '000000';

        // Pre-fetch images to avoid Twilio timeouts
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`;
        const barcodeUrl = `https://barcodeapi.org/api/128/${code}`;

        const [qrRes, barcodeRes] = await Promise.all([
            fetch(qrUrl),
            fetch(barcodeUrl)
        ]);

        const qrArrayBuffer = await qrRes.arrayBuffer();
        const barcodeArrayBuffer = await barcodeRes.arrayBuffer();

        const qrBase64 = `data:${qrRes.headers.get('content-type') || 'image/png'};base64,${Buffer.from(qrArrayBuffer).toString('base64')}`;
        const barcodeBase64 = `data:${barcodeRes.headers.get('content-type') || 'image/png'};base64,${Buffer.from(barcodeArrayBuffer).toString('base64')}`;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        fontFamily: 'system-ui, sans-serif',
                        padding: '40px',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Blue Card Header Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: '#2563eb', // brand blue
                            borderRadius: '32px',
                            padding: '40px',
                            width: '100%',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '30px', color: '#bfdbfe' }}>
                            Misión Cristiana Elim
                        </span>

                        {/* Avatar placeholder circle */}
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '60px',
                            border: '3px solid white',
                            display: 'flex',
                            marginBottom: '20px',
                            backgroundColor: 'transparent'
                        }}></div>

                        <span style={{ fontSize: '56px', fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                            {name}
                        </span>
                    </div>

                    {/* QR Code Section */}
                    <div style={{ display: 'flex', marginTop: '50px', marginBottom: '20px' }}>
                        <div style={{ padding: '20px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '24px', display: 'flex' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrBase64} width="240" height="240" alt="QR Code" />
                        </div>
                    </div>

                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '30px' }}>
                        Escanea para Check-out
                    </span>

                    {/* Barcode Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ padding: '30px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '480px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={barcodeBase64} style={{ width: '380px', height: '120px', objectFit: 'contain' }} alt="Barcode" />
                            <div style={{ display: 'flex', marginTop: '16px', alignItems: 'center' }}>
                                <span style={{ fontSize: '42px', fontWeight: 800, color: '#2563eb', letterSpacing: '10px', fontFamily: 'monospace' }}>
                                    {code.split('').join(' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 600, // Fixed resolution
                height: 900,
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
