import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { telefono, nombre, mensaje } = await req.json();

    if (!telefono || !mensaje) {
      return NextResponse.json(
        { ok: false, error: 'Faltan parámetros requeridos (telefono, mensaje)' },
        { status: 400 }
      );
    }

    // Limpiar el teléfono de espacios, guiones y paréntesis
    let cleanPhone = telefono.replace(/[\s\-\(\)]/g, '');
    
    // Si no tiene '+', asumimos que es de Honduras (+504)
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+504${cleanPhone}`;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !twilioWhatsappFrom) {
      return NextResponse.json(
        { ok: false, error: 'Faltan variables de entorno de Twilio' },
        { status: 500 }
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Para la API REST de Twilio, el body debe ser form-urlencoded
    const params = new URLSearchParams();
    params.append('To', `whatsapp:${cleanPhone}`);
    params.append('From', twilioWhatsappFrom); // Ya debería incluir whatsapp:
    
    // Construimos el mensaje final
    let finalMessage = mensaje;
    if (nombre && !mensaje.includes(nombre)) {
      finalMessage = `Hola ${nombre},\n\n${mensaje}`;
    }
    
    params.append('Body', finalMessage);

    const token = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio API Error:', data);
      return NextResponse.json(
        { ok: false, error: data.message || 'Error al enviar mensaje' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      sid: data.sid,
      status: data.status,
    });
  } catch (error: any) {
    console.error('Error in WhatsApp send API:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
