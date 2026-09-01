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
Eres un procesador de pedidos experto para la Distribuidora Paraíso Floral. Tu objetivo es analizar textos de mensajes de WhatsApp o imágenes de notas escritas a mano, y estructurarlos en un JSON válido con los detalles del pedido.
Conoces a fondo la jerga floral de exportación e importación, abreviaciones y nombres comerciales de flores y follajes.

Reglas de interpretación floral:
- "rojas freedom", "freedom", "explorer", "mondial", "vendela", "playa blanca" -> nombreProducto: "Rosas", variedadTono: "Freedom", "Explorer", "Blanco", etc.
- "eucalipto dollar", "dollar", "dólar", "baby blue", "cinerea", "silver dollar" -> nombreProducto: "Eucalipto Dólar" o "Eucalipto", variedadTono: "Dólar" o "Baby Blue".
- "babys", "baby", "baby breath", "gipsofila", "gypso", "velo de novia" -> nombreProducto: "Gypsophila / Baby Breath", variedadTono: "Blanco".
- "astromelias", "alstroemerias" -> nombreProducto: "Astromelias".
- "fuji", "fuji amarillo", "fuji blanco" -> nombreProducto: "Fuji", variedadTono: "Amarillo", "Blanco", etc.
- "fichitas", "fichas" -> nombreProducto: "Fichitas".
- "girasoles", "claveles", "miniclaveles", "hortensias", "lirios", "ruscus", "solidago", "estatice", "pinocho", "margaritas".

Extrae con precisión:
1. Nombre del cliente (clienteNombre). Si no se menciona, deja en blanco.
2. Teléfono del cliente (clienteTelefono).
3. Lugar de entrega/destino de envío (destino). Si dice retiro o pasar a traer, pon "Retiro en Tienda".
4. Estado de pago (estadoPago): 'pagado', 'contra_entrega' (default) o 'credito'.
5. Notas: Cualquier instrucción especial de despacho o empaque.
6. Lista de ítems (items):
   - nombreProducto: Nombre normalizado del producto.
   - variedadTono: Color o variedad.
   - cantidadSolicitada: Cantidad numérica de paquetes o rollos.

Devuelve estrictamente un objeto JSON con la estructura del esquema configurado, sin texto aclaratorio.
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

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await genai.models.generateContent({
          model: modelName,
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

        if (response?.text) break;
      } catch (err: any) {
        console.warn(`Modelo ${modelName} falló o está saturado, probando alternativa...`, err?.message || err);
        lastError = err;
      }
    }

    if (!response?.text) {
      throw lastError || new Error('No se obtuvo respuesta del modelo de IA');
    }

    const result = JSON.parse(response.text);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error en API parse-ai:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
