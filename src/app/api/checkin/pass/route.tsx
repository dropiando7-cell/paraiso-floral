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

        const logoUrl = 'https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blanco-1.png';

        const [qrRes, barcodeRes, logoRes] = await Promise.all([
            fetch(qrUrl),
            fetch(barcodeUrl),
            fetch(logoUrl)
        ]);

        const qrArrayBuffer = await qrRes.arrayBuffer();
        const barcodeArrayBuffer = await barcodeRes.arrayBuffer();
        const logoArrayBuffer = await logoRes.arrayBuffer();

        const qrBase64 = `data:${qrRes.headers.get('content-type') || 'image/png'};base64,${Buffer.from(qrArrayBuffer).toString('base64')}`;
        const barcodeBase64 = `data:${barcodeRes.headers.get('content-type') || 'image/png'};base64,${Buffer.from(barcodeArrayBuffer).toString('base64')}`;
        const logoBase64 = `data:${logoRes.headers.get('content-type') || 'image/png'};base64,${Buffer.from(logoArrayBuffer).toString('base64')}`;

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
                    {/* Blue Card Header Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: '#2563eb', // brand blue
                            borderRadius: '32px',
                            padding: '24px', // Reduced padding
                            width: '100%',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '5px', textTransform: 'uppercase', marginBottom: '16px', color: '#ffffff' }}>
                            Elim Honduras
                        </span>

                        {/* Church Logo instead of Avatar */}
                        <div style={{
                            display: 'flex',
                            marginBottom: '10px'
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoBase64} width="80" height="80" style={{ objectFit: 'contain' }} alt="Elim Logo" />
                        </div>

                        <span style={{ fontSize: '42px', fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                            {name}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: '30px', width: '100%' }}>
                        {/* QR Code Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ padding: '16px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '24px', display: 'flex' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrBase64} width="200" height="200" alt="QR Code" />
                            </div>
                        </div>

                        {/* Barcode Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ padding: '24px', backgroundColor: 'white', border: '3px solid #0f172a', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '360px' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={barcodeBase64} width="320" height="90" alt="Barcode" />
                                <div style={{ display: 'flex', marginTop: '16px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '40px', fontWeight: 900, color: '#0f172a', letterSpacing: '8px', fontFamily: 'monospace' }}>
                                        {code.split('').join(' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800, // Fixed resolution
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
