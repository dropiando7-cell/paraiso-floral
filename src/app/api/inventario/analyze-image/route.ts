import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CUENTAS = [
    'Terrenos', 'Edificios', 'Vehículos', 'Equipo de Cómputo',
    'Mobiliario y Equipo de Oficina', 'Mobiliario y Equipo de Templo',
    'Equipo de Audio e Instrumentos', 'Mejoras a Edificios', 'Equipos Diversos',
];

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

        const prompt = `Eres un sistema de inventario de activos fijos para una iglesia. 
Analiza la imagen del activo y devuelve ÚNICAMENTE un objeto JSON válido con los siguientes campos.
No incluyas texto adicional, solo el JSON.

Las cuentas contables disponibles son EXACTAMENTE estas (devuelve una de ellas):
${CUENTAS.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Reglas para clasificar:
- Computadoras, laptops, tablets, impresoras, proyectores, monitores → "Equipo de Cómputo"
- Escritorios, sillas, archiveros, libreros, estantes de oficina → "Mobiliario y Equipo de Oficina"
- Bancas, sillas de templo, podios, altares, mesas de iglesia → "Mobiliario y Equipo de Templo"
- Micrófonos, parlantes, amplificadores, consola de audio, instrumentos musicales → "Equipo de Audio e Instrumentos"
- Carros, camionetas, motos → "Vehículos"
- Construcciones, paredes, remodelaciones, instalaciones fijas → "Mejoras a Edificios"
- Terrenos, lotes → "Terrenos"
- Edificios completos → "Edificios"
- Cualquier otro equipo → "Equipos Diversos"

Devuelve este JSON:
{
  "descripcionCorta": "nombre conciso del activo (máximo 60 caracteres)",
  "descripcionDetallada": "descripción completa con marca, modelo, color, material y estado aparente",
  "modelo": "marca y modelo específico si es visible, o vacío si no se puede determinar",
  "cuentaAct": "una de las 9 cuentas contables exactas listadas arriba",
  "confianza": "ALTA | MEDIA | BAJA según qué tan clara es la imagen"
}`;

        // Download the image from R2 and convert to base64
        // This guarantees Claude receives the image even if CDN hasn't propagated yet
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) {
            return NextResponse.json({ error: `Cannot fetch image from R2: ${imgResp.status}` }, { status: 400 });
        }
        const imgBuffer = await imgResp.arrayBuffer();
        const base64Data = Buffer.from(imgBuffer).toString('base64');
        const mediaType = (imgResp.headers.get('content-type') || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

        // ---------------------------------------------------------------------
        // Gemini Implementation
        // ---------------------------------------------------------------------
        const response = await genai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mediaType,
                                data: base64Data,
                            }
                        }
                    ]
                }
            ],
            config: {
                // Ensure output is JSON
                responseMimeType: 'application/json',
            }
        });

        const rawText = response.text || '';

        // ---------------------------------------------------------------------
        // Older Claude Implementation (Commented Out)
        // ---------------------------------------------------------------------
        /*
        const response = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 600,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Data,
                            },
                        },
                        {
                            type: 'text',
                            text: prompt,
                        },
                    ],
                },
            ],
        });

        const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
        */

        // Parse JSON from Claude's response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);

        // Validate cuentaAct is one of our valid options
        if (!CUENTAS.includes(result.cuentaAct)) {
            result.cuentaAct = '';
        }

        return NextResponse.json(result);

    } catch (err: any) {
        console.error('[Analyze Image] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
