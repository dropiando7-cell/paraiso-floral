import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { revalidatePath } from 'next/cache';
import { SignatureItem } from '@/types/invoice';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { facturaId, firmaDataUrl } = body;

        if (!facturaId || !firmaDataUrl) {
            return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
        }

        const factura = await prisma.factura.findUnique({
            where: { id: facturaId },
            include: { cliente: true }
        });

        if (!factura) {
            return NextResponse.json({ error: 'Factura no encontrada.' }, { status: 404 });
        }

        // 1. Convert base64 data url to Buffer
        const base64Data = firmaDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileKey = `firmas-entregas/firma-entrega-${facturaId}.png`;

        // 2. Upload to Cloudflare R2
        const publicUrl = await uploadToR2(buffer, fileKey, 'image/png');

        // 3. Update templateSettings in DB
        const rawSettings = factura.templateSettings ? JSON.parse(JSON.stringify(factura.templateSettings)) : {};
        const signaturesList: SignatureItem[] = rawSettings.signaturesList || [
            { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: true },
            { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: true }
        ];

        const existingClientSigIndex = signaturesList.findIndex(sig => sig.id === 'cliente_firma');

        const clientSig: SignatureItem = {
            id: 'cliente_firma',
            name: factura.cliente?.nombre || 'Cliente',
            role: 'Cliente (Recibido Conforme)',
            imageUrl: publicUrl,
            enabled: true,
            offsetY: 0,
            offsetX: 0
        };

        if (existingClientSigIndex >= 0) {
            signaturesList[existingClientSigIndex] = clientSig;
        } else {
            signaturesList.push(clientSig);
        }

        rawSettings.signaturesList = signaturesList;

        await prisma.factura.update({
            where: { id: facturaId },
            data: {
                templateSettings: rawSettings
            }
        });

        revalidatePath('/facturas');
        revalidatePath(`/facturas/${facturaId}`);

        return NextResponse.json({ success: true, publicUrl });
    } catch (error: any) {
        console.error('Error al guardar firma de entrega:', error);
        return NextResponse.json({ error: 'Error del servidor al procesar la firma de entrega.' }, { status: 500 });
    }
}
