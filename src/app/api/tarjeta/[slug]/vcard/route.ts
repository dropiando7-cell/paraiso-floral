import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const card = await prisma.digitalCard.findUnique({
            where: { slug },
            include: {
                organization: true
            }
        });

        if (!card) {
            return new NextResponse('Card not found', { status: 404 });
        }

        // Build vCard text
        const vCardLines = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${card.nombre} ${card.apellido}`,
            `N:${card.apellido};${card.nombre};;;`,
            `ORG:${card.organization?.name || 'Bioelectrónica'}`,
        ];

        if (card.puesto) {
            vCardLines.push(`TITLE:${card.puesto}`);
        }

        if (card.phoneNumber) {
            vCardLines.push(`TEL;TYPE=CELL,VOICE:${card.phoneNumber}`);
        }

        if (card.email) {
            vCardLines.push(`EMAIL;TYPE=PREF,INTERNET:${card.email}`);
        }

        if (card.websiteUrl) {
            vCardLines.push(`URL:${card.websiteUrl}`);
        }

        vCardLines.push('END:VCARD');

        const vCardContent = vCardLines.join('\r\n');

        return new NextResponse(vCardContent, {
            headers: {
                'Content-Type': 'text/vcard; charset=utf-8',
                'Content-Disposition': `attachment; filename="${card.nombre}_${card.apellido}.vcf"`,
            },
        });
    } catch (error) {
        console.error('Error generating vcard:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
