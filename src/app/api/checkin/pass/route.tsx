import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract parameters
        const name = searchParams.get('name') || 'Niño/a Elim';
        const room = searchParams.get('room') || 'Salón Principal';
        const code = searchParams.get('code') || '000000';

        // Generate QR Code URL
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`;

        // Generate Barcode URL (Code 128)
        const barcodeUrl = `https://barcodeapi.org/api/128/${code}`;

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
                        backgroundColor: '#f8fafc',
                        fontFamily: 'system-ui, sans-serif',
                        padding: '40px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            borderRadius: '32px',
                            boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                            padding: '60px',
                            width: '100%',
                            maxWidth: '800px',
                            border: '4px solid #f1f5f9',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '20px', width: '100%' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '20px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <span style={{ fontSize: '40px' }}>🏃‍♂️</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '42px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                                    Pase de Recogida
                                </span>
                                <span style={{ fontSize: '24px', color: '#4f46e5', fontWeight: 600 }}>
                                    Misión Cristiana Elim
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ width: '100%', height: '2px', backgroundColor: '#f1f5f9', margin: '30px 0' }} />

                        {/* Kid Info */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '20px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>
                                    Niño/a
                                </span>
                                <span style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {name}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '20px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>
                                    Salón
                                </span>
                                <span style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a' }}>
                                    {room}
                                </span>
                            </div>
                        </div>

                        {/* Codes Section */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '60px', marginTop: '20px' }}>
                            {/* QR Code */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ padding: '16px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '24px' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrUrl} width="220" height="220" alt={`QR Code ${code}`} />
                                </div>
                                <span style={{ marginTop: '16px', fontSize: '20px', fontWeight: 600, color: '#475569' }}>
                                    Escanear
                                </span>
                            </div>

                            {/* Barcode */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ padding: '24px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px', width: '380px' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={barcodeUrl} style={{ width: '100%', objectFit: 'contain' }} alt={`Barcode ${code}`} />
                                </div>
                                <span style={{ marginTop: '16px', fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '4px' }}>
                                    {code}
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '40px', fontSize: '18px', color: '#94a3b8', textAlign: 'center' }}>
                            Por favor presenta este código al encargado al recoger al niño.
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 800,
            }
        );
    } catch (e: any) {
        console.error('Error generating image response', e);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
