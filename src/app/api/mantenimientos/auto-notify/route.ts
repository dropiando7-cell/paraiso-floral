import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTwilioWhatsApp } from '@/lib/checkin-notifications';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // En producción, asegurar que esta ruta sea llamada de forma segura
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const today = new Date();

        // 1. Obtener días de anticipación de la configuración
        const diasConfig = await prisma.systemSetting.findUnique({
            where: { key: 'mantenimiento_notificar_dias' }
        });
        const notificarDias = diasConfig ? parseInt(diasConfig.value) : 5;

        // Calcular el rango del día objetivo (hoy + notificarDias)
        const targetDayStart = new Date(today);
        targetDayStart.setDate(today.getDate() + notificarDias);
        targetDayStart.setHours(0, 0, 0, 0);

        const targetDayEnd = new Date(today);
        targetDayEnd.setDate(today.getDate() + notificarDias);
        targetDayEnd.setHours(23, 59, 59, 999);

        // 2. Buscar mantenimientos programados para ese día que no han sido notificados
        const mantenimientos = await prisma.mantenimiento.findMany({
            where: {
                estado: 'PROGRAMADO',
                notificado: false,
                fechaProgramada: {
                    gte: targetDayStart,
                    lte: targetDayEnd
                }
            },
            include: {
                equipo: {
                    include: {
                        cliente: true
                    }
                }
            }
        });

        console.log(`[Cron Mantenimientos] Encontrados ${mantenimientos.length} mantenimientos para notificar (Día objetivo: ${targetDayStart.toLocaleDateString()}).`);

        const sentNotifications = [];
        const failedNotifications = [];

        // 3. Obtener configuración del template SID
        const templateConfig = await prisma.systemSetting.findUnique({
            where: { key: 'mantenimiento_whatsapp_template_sid' }
        });
        const templateSid = templateConfig?.value || 'HXa363e371108b8cd13811d22b75ccbc74';

        // 4. Iterar y enviar notificaciones
        for (const m of mantenimientos) {
            const cliente = m.equipo.cliente;
            if (!cliente.telefono) {
                failedNotifications.push({ id: m.id, error: 'Cliente sin teléfono' });
                continue;
            }

            let cleanPhone = cliente.telefono.replace(/[\s\-()]/g, "");
            if (!cleanPhone.startsWith("+")) {
                cleanPhone = `+504${cleanPhone}`;
            }

            const fechaStr = new Date(m.fechaProgramada).toLocaleDateString('es-HN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            let variables: Record<string, string> = {};

            // Plantilla genérica vs personalizada
            if (templateSid === 'HXa363e371108b8cd13811d22b75ccbc74') {
                const eqDesc = `${m.equipo.nombre}` + (m.equipo.serie ? ` (Serie: ${m.equipo.serie})` : '');
                const genericMessage = `Estimado(a) ${cliente.nombre}, le recordamos que el mantenimiento preventivo de su equipo ${eqDesc} está programado para el día ${fechaStr}. Por favor, contáctenos para confirmar su disponibilidad.`;

                variables = {
                    "1": "Bioelectrónica Honduras",
                    "2": genericMessage
                };
            } else {
                variables = {
                    "1": cliente.nombre,
                    "2": m.equipo.nombre,
                    "3": m.equipo.serie || 'No especificado',
                    "4": fechaStr
                };
            }

            try {
                const result = await sendTwilioWhatsApp(cleanPhone, templateSid, variables);
                if (result.success) {
                    // Actualizar registro
                    await prisma.mantenimiento.update({
                        where: { id: m.id },
                        data: {
                            notificado: true,
                            fechaNotificacion: new Date(),
                            whatsappSid: result.messageId
                        }
                    });

                    // Log Activity
                    await logActivity({
                        userId: null, // Sistema / Cron
                        organizationId: m.organizationId,
                        action: 'EXPORT',
                        module: '/mantenimientos/cron',
                        description: `Notificación automática de mantenimiento enviada a ${cliente.nombre} por WhatsApp`,
                        metadata: { mantenimientoId: m.id, clienteId: cliente.id, whatsappSid: result.messageId }
                    });

                    sentNotifications.push({ id: m.id, cliente: cliente.nombre });
                } else {
                    failedNotifications.push({ id: m.id, error: result.error || 'Fallo Twilio' });
                }
            } catch (err: any) {
                failedNotifications.push({ id: m.id, error: err.message || 'Error en dispatch' });
            }
        }

        return NextResponse.json({
            success: true,
            totalEncontrados: mantenimientos.length,
            enviados: sentNotifications,
            fallidos: failedNotifications
        });
    } catch (error: any) {
        console.error('[Cron Mantenimientos] Error general:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
