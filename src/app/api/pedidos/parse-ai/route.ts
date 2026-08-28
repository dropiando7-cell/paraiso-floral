import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI, Type } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { text, imageUrl } = await req.json();

    if (!text && !imageUrl) {
      return NextResponse.json({ error: 'Se requiere texto o imageUrl' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'La clave GEMINI_API_KEY no está configurada' }, { status: 500 });
    }

    const genai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Eres un procesador de pedidos inteligente para Paraíso Floral. Tu objetivo es analizar textos de mensajes de WhatsApp o imágenes de comandas escritas a mano, y estructurarlos en un JSON válido que representa los detalles del pedido.

Extrae con precisión:
1. Nombre del cliente (clienteNombre). Si no se menciona, deja en blanco.
2. Teléfono del cliente (clienteTelefono).
3. Lugar de entrega/destino de envío (destino). Si dice retiro o pasar a traer, pon "Retiro en Tienda".
4. Estado de pago (estadoPago): Debe ser uno de 'pagado', 'contra_entrega' o 'credito'. Intenta deducir esto por palabras como "ya pagó", "a crédito", "cobrar al entregar", etc. Si no se puede deducir, pon "contra_entrega" por defecto.
5. Notas: Cualquier instrucción especial de despacho o empaque.
6. Lista de ítems (items):
   - nombreProducto: Nombre del producto (ej: Rosas, Claveles, Eucalyptus, etc.).
   - variedadTono: Color o variedad (ej: Freedom, Explorer, Rojo, Blanco, etc.).
   - cantidadSolicitada: Cantidad numérica. Intenta interpretar paquetes, rollos o tallos (ej: si dice "5 paquetes" o "5 rollos", pon 5).

Devuelve estrictamente un objeto JSON con la estructura del esquema configurado, sin texto aclaratorio de introducción o conclusión.
`;

    let contentInput: any[] = [];

    // If image is supplied, download and convert to base64 inline
    if (imageUrl) {
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        return NextResponse.json({ error: 'No se pudo descargar la imagen de soporte' }, { status: 400 });
      }
      const arrayBuffer = await imgResp.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
      
      contentInput.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    // Add text prompt
    const promptText = text 
      ? `Analiza este texto del pedido de WhatsApp:\n\n"${text}"`
      : `Analiza la comanda escrita a mano en la imagen adjunta para extraer el pedido.`;
      
    contentInput.push(promptText);

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: contentInput,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clienteNombre: { type: Type.STRING },
            clienteTelefono: { type: Type.STRING },
            destino: { type: Type.STRING },
            estadoPago: { 
              type: Type.STRING,
              enum: ['pagado', 'contra_entrega', 'credito']
            },
            notas: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nombreProducto: { type: Type.STRING },
                  variedadTono: { type: Type.STRING },
                  cantidadSolicitada: { type: Type.INTEGER }
                },
                required: ['nombreProducto', 'cantidadSolicitada']
              }
            }
          },
          required: ['clienteNombre', 'destino', 'estadoPago', 'items']
        }
      }
    });

    if (!response.text) {
      return NextResponse.json({ error: 'No se obtuvo respuesta del modelo de IA' }, { status: 500 });
    }

    const result = JSON.parse(response.text);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error en API parse-ai:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
