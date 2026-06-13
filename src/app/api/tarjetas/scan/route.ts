import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl } = await req.json();
        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
        }

        const prompt = `Eres un sistema experto en extracción de información de contacto de tarjetas de presentación físicas.
Analiza la imagen de la tarjeta de presentación y extrae los datos de contacto.
Devuelve ÚNICAMENTE un objeto JSON válido con los siguientes campos. 
No incluyas texto adicional, ni explicaciones, solo el JSON. Si no encuentras alguno de los valores, déjalo como string vacío ("").

Devuelve este JSON:
{
  "nombre": "el nombre del contacto",
  "apellido": "el apellido del contacto",
  "puesto": "el cargo o puesto de trabajo",
  "empresa": "el nombre de la empresa u organización",
  "telefono": "el número de teléfono",
  "email": "la dirección de correo electrónico",
  "bio": "una breve descripción o notas extraídas de la tarjeta",
  "websiteUrl": "la URL del sitio web si está presente",
  "linkedinUrl": "la URL o usuario de LinkedIn si está presente",
  "whatsappNumber": "el número de WhatsApp si está especificado separado"
}`;

        // Download the image from R2 and convert to base64
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) {
            return NextResponse.json({ error: `Cannot fetch image from R2: ${imgResp.status}` }, { status: 400 });
        }
        const imgBuffer = await imgResp.arrayBuffer();
        const base64Data = Buffer.from(imgBuffer).toString('base64');
        const mediaType = imgResp.headers.get('content-type') || 'image/jpeg';

        const message = await client.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image',
                            source: { type: 'base64', media_type: mediaType as any, data: base64Data },
                        },
                    ],
                }
            ],
        });

        const textResponse = (message.content[0] as Anthropic.TextBlock).text;

        // Extract JSON
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in response:", textResponse);
            return NextResponse.json({ error: 'Respuesta inválida de la IA' }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);

    } catch (err: any) {
        console.error('AI Card Scan Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
