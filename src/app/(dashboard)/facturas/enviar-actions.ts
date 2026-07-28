'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from './actions';
import { Resend } from 'resend';
import { headers } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplateSettings {
  bccList: string;
  address: string;
  phone: string;
  email: string;
  defaultSubject: string;
  defaultBody: string;
}

const DEFAULT_SETTINGS: EmailTemplateSettings = {
  bccList: 'administracion@bioelectronicahn.com, gerencia@bioelectronicahn.com',
  address: 'Bo. Guamilito, 7 Calle, 9 Avenida NO, San Pedro Sula, Cortés',
  phone: '+504 3178-2368 | +504 8924-6108',
  email: 'administracion@bioelectronicahn.com',
  defaultSubject: '{docType} {correlativo} - Bioelectrónica Honduras',
  defaultBody: 'Le hacemos llegar su {docType} número {correlativo} por un monto total de {total}, emitida el {fecha}.\n\nEn el archivo adjunto encontrará el documento PDF correspondiente.'
};

export async function getEmailSettings() {
  try {
    const authUser = await getAuthenticatedUser();
    const org = await prisma.organization.findUnique({
      where: { id: authUser.organizationId },
      select: { invoiceSettings: true }
    });

    const currentSettings = (org?.invoiceSettings as any) || {};
    const emailSettings = {
      ...DEFAULT_SETTINGS,
      ...(currentSettings.emailTemplateSettings || {})
    };

    return { success: true, settings: emailSettings };
  } catch (error: any) {
    console.error('Error fetching email settings:', error);
    return { success: false, error: error.message };
  }
}

export async function saveEmailSettings(settings: EmailTemplateSettings) {
  try {
    const authUser = await getAuthenticatedUser();
    const org = await prisma.organization.findUnique({
      where: { id: authUser.organizationId },
      select: { invoiceSettings: true }
    });

    const currentSettings = (org?.invoiceSettings as any) || {};
    const updatedInvoiceSettings = {
      ...currentSettings,
      emailTemplateSettings: settings
    };

    await prisma.organization.update({
      where: { id: authUser.organizationId },
      data: { invoiceSettings: updatedInvoiceSettings }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error saving email settings:', error);
    return { success: false, error: error.message };
  }
}

export async function enviarDocumentoPorEmail(
  documentoId: string,
  emailDestino: string,
  asunto: string,
  mensajePersonalizado: string
) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // 2. Fetch document data
    const doc = await prisma.factura.findUnique({
      where: { id: documentoId },
      include: {
        cliente: true,
      },
    });

    if (!doc) {
      return { success: false, error: 'Documento no encontrado' };
    }

    // Fetch dynamic template settings
    const settingsRes = await getEmailSettings();
    const emailSettings = settingsRes.success && settingsRes.settings ? settingsRes.settings : DEFAULT_SETTINGS;

    const correlativo = doc.correlativo || doc.id;
    const tipoDoc = doc.tipoDocumento.toLowerCase();
    const totalFormateado = new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(Number(doc.total)).replace('HNL', 'L').trim();
    const fechaEmision = doc.fechaEmision
      ? new Date(doc.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    // 3. Fetch PDF from route handler as buffer
    const headersList = await headers();
    const host = headersList.get('host') || 'sistema.bioelectronicahn.com';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    const pdfUrl = `${baseUrl}/api/pdf/${documentoId}?type=${tipoDoc === 'cotizacion' && doc.ordenTrabajoId ? 'cotizacion' : tipoDoc}`;
    
    console.log('Fetching PDF internally from:', pdfUrl);
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      const errorText = await pdfRes.text().catch(() => '');
      console.error('Error fetching PDF:', pdfRes.status, errorText);
      return { success: false, error: 'No se pudo generar el archivo PDF del documento' };
    }

    const contentType = pdfRes.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      const bodyText = await pdfRes.text().catch(() => '');
      console.error('Received non-PDF response:', contentType, bodyText.substring(0, 500));
      return { success: false, error: 'La respuesta del servidor no es un archivo PDF válido' };
    }

    const arrayBuffer = await pdfRes.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // 4. Create HTML body for the email with custom branding
    const docLabel = doc.tipoDocumento === 'FACTURA' ? 'Factura' : 
                     doc.tipoDocumento === 'NOTA_CREDITO' ? 'Nota de Crédito' : 
                     doc.tipoDocumento === 'PROFORMA' ? 'Factura Pro Forma' : 'Cotización';

    const cleanMsg = mensajePersonalizado ? mensajePersonalizado.replace(/\n/g, '<br/>') : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${docLabel} ${correlativo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { background-color: #0f172a; color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
            .header p { margin: 4px 0 0 0; font-size: 14px; color: #94a3b8; }
            .content { padding: 32px 24px; }
            .greeting { font-size: 16px; font-weight: bold; margin-bottom: 16px; color: #0f172a; }
            .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .summary-box { background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
            .summary-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 12px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .summary-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-weight: bold; color: #0f172a; }
            .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .footer a { color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BIOELECTRÓNICA HONDURAS</h1>
              <p>Soporte Técnico y Venta de Equipo Médico</p>
            </div>
            <div class="content">
              <div class="greeting">Estimado(a) ${doc.cliente.nombre},</div>
              <div class="message">
                ${cleanMsg}
              </div>
              <div class="summary-box">
                <div class="summary-title">Resumen del Documento</div>
                <div class="summary-row">
                  <span>Documento:</span>
                  <strong>${docLabel} #${correlativo}</strong>
                </div>
                <div class="summary-row">
                  <span>Fecha de Emisión:</span>
                  <span>${fechaEmision}</span>
                </div>
                <div class="summary-row">
                  <span>Monto Total:</span>
                  <strong>${totalFormateado}</strong>
                </div>
              </div>
              <div class="message" style="font-size: 13px; color: #64748b;">
                Por favor, conserve este correo para sus registros. Si tiene alguna consulta sobre esta cotización o factura, responda directamente a este correo.
              </div>
            </div>
            <div class="footer">
              <p><strong>Bioelectrónica Honduras S. de R.L. de C.V.</strong></p>
              <p>${emailSettings.address}</p>
              <p>Tel: ${emailSettings.phone} | <a href="mailto:${emailSettings.email}">${emailSettings.email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // 5. Send using Resend
    const filename = `${docLabel.replace(/\s+/g, '_')}_${correlativo}.pdf`;

    // Parse BCC list (split by comma and trim whitespace)
    const bccList = emailSettings.bccList
      ? emailSettings.bccList.split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0)
      : [];

    console.log(`Sending email to ${emailDestino} for ${docLabel} ${correlativo}...`);
    const sendResult = await resend.emails.send({
      from: 'Bioelectrónica Honduras <notificaciones@mail.bioelectronicahn.com>',
      to: emailDestino,
      bcc: bccList.length > 0 ? bccList : undefined,
      replyTo: emailSettings.email || 'administracion@bioelectronicahn.com',
      subject: asunto || `${docLabel} ${correlativo} - Bioelectrónica Honduras`,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
        },
      ],
    });

    if (sendResult.error) {
      console.error('Resend Error:', sendResult.error);
      return { success: false, error: `Error de Resend: ${sendResult.error.message}` };
    }

    console.log('Email sent successfully:', sendResult.data);
    return { success: true, data: sendResult.data };

  } catch (error: any) {
    console.error('Error in enviarDocumentoPorEmail Server Action:', error);
    return { success: false, error: error.message || 'Error interno al enviar el correo' };
  }
}
