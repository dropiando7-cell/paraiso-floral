import { prisma } from './prisma';

/**
 * Despacha una notificación in-app y opcionalmente push (OneSignal) a un usuario.
 * @param recipientUserId ID del usuario destinatario (UUID)
 * @param title Título de la notificación
 * @param message Contenido o cuerpo del mensaje
 * @param link Enlace opcional dentro de la plataforma (e.g. /soporte?id=...)
 * @param type Tipo de notificación ("WORK_ORDER", "TASK", "SYSTEM", etc.)
 * @param creadoPorId ID del usuario que generó el evento (opcional, para trazabilidad)
 */
export async function triggerNotification(
    recipientUserId: string,
    title: string,
    message: string,
    link?: string,
    type = 'SYSTEM',
    creadoPorId?: string
) {
    try {
        if (!recipientUserId) {
            console.error('[NOTIFICACIONES] triggerNotification falló: userId es inválido');
            return null;
        }

        // 1. Guardar en base de datos local (Campanita)
        const localNotification = await prisma.notification.create({
            data: {
                userId: recipientUserId,
                title,
                message,
                type,
                link: link || null,
                creadoPorId: creadoPorId || null,
            }
        });

        console.log(`[NOTIFICACIONES] Notificación in-app guardada localmente: ID ${localNotification.id}`);

        // 2. Despachar notificación push a OneSignal
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (!appId || !restApiKey) {
            console.warn('[NOTIFICACIONES] OneSignal Push omitido: NEXT_PUBLIC_ONESIGNAL_APP_ID u ONESIGNAL_REST_API_KEY no están configurados.');
            return localNotification;
        }

        const oneSignalPayload = {
            app_id: appId,
            include_aliases: {
                external_id: [recipientUserId]
            },
            target_channel: 'push',
            headings: {
                en: title,
                es: title
            },
            contents: {
                en: message,
                es: message
            },
            url: link ? `${appUrl}${link}` : appUrl
        };

        // Despachar a la API de OneSignal de forma asíncrona para no ralentizar el request del usuario
        fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${restApiKey}`
            },
            body: JSON.stringify(oneSignalPayload)
        })
        .then(async (res) => {
            if (!res.ok) {
                const errText = await res.text();
                console.error(`[NOTIFICACIONES] Error al despachar OneSignal API (Status ${res.status}):`, errText);
            } else {
                const resJson = await res.json();
                console.log('[NOTIFICACIONES] Push despachado exitosamente por OneSignal:', resJson);
            }
        })
        .catch(err => {
            console.error('[NOTIFICACIONES] Error de red al conectar con OneSignal API:', err);
        });

        return localNotification;
    } catch (err) {
        console.error('[NOTIFICACIONES] Error inesperado en triggerNotification:', err);
        return null;
    }
}
