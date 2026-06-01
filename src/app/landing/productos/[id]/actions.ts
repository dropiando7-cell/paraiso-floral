'use server';

import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface QuoteEmailData {
    itemName: string;
    itemBrand: string;
    itemModel: string;
    itemCode: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientMessage: string;
}

export async function sendQuoteEmailAction(data: QuoteEmailData) {
    try {
        // 1. Fetch configured email from landing settings
        let targetEmail = 'ventas@bioelectronica.hn'; // default fallback
        
        try {
            const setting = await prisma.systemSetting.findUnique({
                where: { key: 'landing_settings' }
            });
            if (setting) {
                const parsed = JSON.parse(setting.value);
                if (parsed.quoteEmail && parsed.quoteEmail.trim() !== '') {
                    targetEmail = parsed.quoteEmail.trim();
                } else if (parsed.contactEmails && parsed.contactEmails.length > 0 && parsed.contactEmails[0].trim() !== '') {
                    targetEmail = parsed.contactEmails[0].trim();
                }
            }
        } catch (dbError) {
            console.error('Error fetching target email from DB:', dbError);
        }

        // 2. Format the email subject and HTML body
        const subject = `Nueva Solicitud de Cotización: ${data.itemName} - ${data.clientName}`;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #00a8cc; padding-bottom: 10px; margin-bottom: 20px;">Nueva Solicitud de Cotización</h2>
                <p style="font-size: 14px; line-height: 1.5; color: #475569;">
                    Se ha recibido una nueva solicitud de cotización desde el catálogo web de Bioelectrónica Honduras.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f8fafc;">
                            <th style="border: 1px solid #e2e8f0; text-align: left; padding: 10px; font-weight: bold;">Detalle</th>
                            <th style="border: 1px solid #e2e8f0; text-align: left; padding: 10px; font-weight: bold;">Información</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc; width: 35%;">Equipo</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px;">${data.itemName}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Marca</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px;">${data.itemBrand}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Modelo</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px;">${data.itemModel || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Código / SKU</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; text-transform: uppercase;">${data.itemCode}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Cliente</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px;">${data.clientName}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Correo</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px;"><a href="mailto:${data.clientEmail}">${data.clientEmail}</a></td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Teléfono</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px;"><a href="tel:${data.clientPhone}">${data.clientPhone}</a></td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold; background-color: #f8fafc;">Mensaje</td>
                            <td style="border: 1px solid #e2e8f0; padding: 10px; white-space: pre-line; line-height: 1.6;">${data.clientMessage}</td>
                        </tr>
                    </tbody>
                </table>
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center;">
                    Este es un mensaje automático enviado por el portal de administración de Bioelectrónica Honduras.
                </div>
            </div>
        `;

        // 3. Send email using Resend
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY no configurado. Envío simulado a:', targetEmail);
            return { success: true, simulated: true };
        }

        const senderEmail = 'Bioelectrónica Honduras <admin@bioelectronica.hn>';

        await resend.emails.send({
            from: senderEmail,
            to: targetEmail,
            subject: subject,
            html: html,
            replyTo: data.clientEmail
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error sending quote email:', error);
        return { success: false, error: error.message || 'Error al enviar el correo' };
    }
}
