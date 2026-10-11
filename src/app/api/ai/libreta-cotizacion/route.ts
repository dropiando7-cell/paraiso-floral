import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI, Type } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { text, imageB64 } = await req.json();

    if (!text && !imageB64) {
      return NextResponse.json({ error: 'Se requiere texto o una imagen' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'La clave GEMINI_API_KEY no está configurada' }, { status: 500 });
    }

    const genai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Eres un asistente que convierte notas, capturas de pantalla de WhatsApp o dictados en borradores de cotización o factura para un ERP de flores (Distribuidora Paraíso Floral).
Si el usuario envía una imagen, extrae todo el texto visible (cantidades, nombres de productos, precios, cliente) como si lo hubieran escrito.
Se te dará el texto que un usuario pegó/dictó y/o una imagen. Debes extraer:
1. "clienteNombre": El nombre del cliente o empresa si se menciona en el texto/imagen (ej: "Cliente: 504 FLOWER SHOP", "Para Juan Pérez", etc.). Si no hay, null.
2. "tipoDocumento": Si se pide factura ("factura", "facturar") usa "factura". Si se pide cotización ("cotizar", "cotización") o no se especifica, usa "cotizacion".
3. "notas": Cualquier instrucción de entrega o comentario general.
4. "items": Una lista de productos extraídos del texto o imagen.

Para CADA ítem, extrae:
- descripcion: El nombre del producto o flor (ej. Rosas Rojas, Quinceañeras, Fichitas Blancas, Baby Ecuador, Solidago, etc.).
- cantidad: (número) Cuántos paquetes o unidades solicita (por defecto 1 si no se especifica).
- precioUnitario: (número) El precio c/u si se indica en la misma línea. Si no se encuentra precio, usa 0.

Si ves algo como "1 envio 250", pon descripcion: "Envío", cantidad: 1, precioUnitario: 250.
Devuelve estrictamente un JSON que cumpla el schema sin texto extra.
`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
    let response: any = null;
    let lastError: any = null;

    const parts: any[] = [];
    if (text) {
      parts.push({ text: `Texto ingresado:\n\n${text}` });
    } else {
      parts.push({ text: "Analiza la siguiente imagen de un pedido." });
    }

    if (imageB64) {
      const mimeType = imageB64.substring(imageB64.indexOf(':') + 1, imageB64.indexOf(';'));
      const data = imageB64.split(',')[1];
      parts.push({
        inlineData: {
          mimeType,
          data
        }
      });
    }

    for (const modelName of candidateModels) {
      try {
        response = await genai.models.generateContent({
          model: modelName,
          contents: parts,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                clienteNombre: { type: Type.STRING },
                tipoDocumento: { type: Type.STRING, enum: ['cotizacion', 'factura', 'proforma'] },
                notas: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      descripcion: { type: Type.STRING },
                      cantidad: { type: Type.INTEGER },
                      precioUnitario: { type: Type.NUMBER }
                    },
                    required: ['descripcion', 'cantidad', 'precioUnitario']
                  }
                }
              },
              required: ['items', 'notas']
            }
          }
        });

        if (response?.text) break;
      } catch (err: any) {
        console.warn(`Modelo ${modelName} falló, intentando alternativa...`, err?.message || err);
        lastError = err;
      }
    }

    if (!response?.text) {
      throw lastError || new Error('No se obtuvo respuesta del modelo de IA');
    }

    const result = JSON.parse(response.text);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error en API libreta-cotizacion:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
