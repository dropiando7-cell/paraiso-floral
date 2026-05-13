import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // En producción, asegurar que esta ruta sea llamada con un token secreto
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return new NextResponse('Unauthorized', { status: 401 });
        // }

        const hoy = new Date();
        const enTresDias = new Date();
        enTresDias.setDate(hoy.getDate() + 3);

        // Buscar rentas activas que venzan en los próximos 3 días
        const rentasPorVencer = await prisma.rentaEquipo.findMany({
            where: {
                estado: 'ACTIVA',
                fechaFinEsperada: {
                    lte: enTresDias,
                    gte: hoy,
                }
            },
            include: {
                cliente: true,
                activoFijo: true,
                organization: true,
            }
        });

        console.log(`[Cron Alerts] Encontradas ${rentasPorVencer.length} rentas por vencer.`);

        // Iterar sobre las rentas para enviar alerta
        for (const renta of rentasPorVencer) {
            // Preparación para Twilio WhatsApp
            const telefono = renta.cliente?.telefono;
            if (telefono) {
                const mensaje = `Hola ${renta.cliente?.nombre}, te recordamos que el alquiler de tu equipo ${renta.activoFijo?.descripcionCorta} vence el ${renta.fechaFinEsperada.toLocaleDateString()}. Para renovar o coordinar devolución, por favor contáctanos. BioElectrónica-A.`;
                
                // TODO: Implementar Twilio cuando el número de Meta sea aprobado
                // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                // await client.messages.create({
                //     body: mensaje,
                //     from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                //     to: `whatsapp:${telefono}`
                // });
                
                console.log(`[Twilio Stub] Mensaje preparado para ${telefono}: ${mensaje}`);
            }
        }

        return NextResponse.json({ success: true, count: rentasPorVencer.length });
    } catch (error: any) {
        console.error('[Cron Alerts] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
