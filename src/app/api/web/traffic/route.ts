import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pagina, userAgent } = body;

        if (!pagina) {
            return NextResponse.json({ success: false, error: 'La página es requerida.' }, { status: 400 });
        }

        // Try to read IP and location from headers
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';
        
        const country = request.headers.get('x-vercel-ip-country') || 'HN';
        const city = request.headers.get('x-vercel-ip-city') || 'San Pedro Sula';

        // Parse user agent to get browser, OS, device
        let browser = 'Desconocido';
        let so = 'Desconocido';
        let dispositivo = 'Desktop';

        const ua = userAgent || '';

        // Simple parser
        if (/iphone|ipad|ipod/i.test(ua)) {
            dispositivo = 'Mobile (iOS)';
            so = 'iOS';
        } else if (/android/i.test(ua)) {
            dispositivo = 'Mobile (Android)';
            so = 'Android';
        } else if (/mobile/i.test(ua)) {
            dispositivo = 'Mobile';
        }

        if (/windows/i.test(ua)) {
            so = 'Windows';
        } else if (/macintosh|mac os x/i.test(ua)) {
            so = 'macOS';
        } else if (/linux/i.test(ua)) {
            so = 'Linux';
        }

        if (/chrome|crios/i.test(ua)) {
            browser = 'Chrome';
        } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
            browser = 'Safari';
        } else if (/firefox/i.test(ua)) {
            browser = 'Firefox';
        } else if (/edg/i.test(ua)) {
            browser = 'Edge';
        }

        const traffic = await prisma.webTraffic.create({
            data: {
                ip,
                pais: country,
                ciudad: city,
                dispositivo,
                browser,
                so,
                userAgent: ua,
                pagina
            }
        });

        return NextResponse.json({ success: true, traffic });
    } catch (e: any) {
        console.error('Error tracking web traffic:', e);
        return NextResponse.json({ success: false, error: e.message || 'Error del servidor.' }, { status: 500 });
    }
}
