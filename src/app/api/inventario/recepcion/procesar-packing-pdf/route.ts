import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { organizationId: true }
        });
        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'Debe subir un archivo PDF o Imagen de la hoja de despacho' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const fileType = file.type || 'application/pdf';

        const geminiKey = process.env.GEMINI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        if (!geminiKey && !anthropicKey) {
            return NextResponse.json({ 
                error: 'No se encontró la API Key de Gemini (GEMINI_API_KEY) ni de Anthropic (ANTHROPIC_API_KEY) en el archivo .env. Agregue su API Key para activar el reconocimiento inteligente de packing lists.' 
            }, { status: 500 });
        }

        const prompt = `Eres un sistema experto en logística e inventario de flores y follajes. 
Analiza este documento de envío/packing list (puede ser un documento digital impreso o una hoja de despacho escrita a mano por una finca/proveedor).

Extrae con la mayor precisión posible la información y devuelve ÚNICAMENTE un objeto JSON estricto con la siguiente estructura, sin texto explicativo alrededor:

{
  "numeroEnvio": "número de envío, guía o factura (ej. '19918' o 'F-504'), si no hay genera uno como 'PL-' + fecha",
  "proveedor": "Nombre de la finca o proveedor (ej. 'Finca Lucio SPS', 'Follajes del Sur', etc.)",
  "fechaLlegada": "YYYY-MM-DD",
  "cajas": [
    {
      "numeroCaja": 1,
      "codigoProveedor": "código o folio del sticker si aplica (ej. '119764'), o null",
      "items": [
        {
          "descripcion": "Nombre específico del producto/variedad (ej. 'ROSA FREEDOM', 'EUCALIPTO BABY BLUE', etc.)",
          "cultivo": "Cultivo o categoría (ej. 'ROSA - Freedom', 'FOLLAJE - Eucalipto')",
          "bonches": 25 // número de paquetes/bonches
        }
      ]
    }
  ]
}

Reglas:
1. Si el documento agrupa por Cajas (Caja 1, Caja 2, etc.), agrúpalos respetando cada caja.
2. Si el documento no especifica números de caja, agrúpalos en una sola caja por defecto (numeroCaja: 1).
3. Interpreta texto manuscrito con cuidado.
4. "bonches" debe ser un número entero de paquetes/paquetitos de flores/follaje.`;

        let rawText = '';

        // 1. Usar Google Gemini API si está configurada GEMINI_API_KEY
        if (geminiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey: geminiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    inlineData: {
                                        data: base64Data,
                                        mimeType: fileType
                                    }
                                },
                                { text: prompt }
                            ]
                        }
                    ]
                });
                rawText = response.text || '';
            } catch (geminiErr: any) {
                console.error('[Gemini AI Parse Error]:', geminiErr);
                if (!anthropicKey) throw geminiErr;
            }
        }

        // 2. Fallback a Anthropic Claude si no se obtuvo respuesta de Gemini o si sólo está configurada ANTHROPIC_API_KEY
        if (!rawText && anthropicKey) {
            const client = new Anthropic({ apiKey: anthropicKey });
            let contentBlock: any;

            if (fileType.includes('pdf')) {
                contentBlock = {
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: base64Data
                    }
                };
            } else {
                const validMime = fileType.includes('png') ? 'image/png' : (fileType.includes('webp') ? 'image/webp' : 'image/jpeg');
                contentBlock = {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: validMime,
                        data: base64Data
                    }
                };
            }

            const response = await client.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: [
                            contentBlock,
                            { type: 'text', text: prompt }
                        ]
                    }
                ]
            });
            rawText = response.content[0].type === 'text' ? response.content[0].text : '';
        }

        // Extraer objeto JSON del texto
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'No se pudo interpretar la estructura del packing list. Verifique la nitidez del documento.' }, { status: 500 });
        }

        const parsedData = JSON.parse(jsonMatch[0]);

        // Cargar catálogo de activos para hacer matching inteligente con la BD
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: dbUser.organizationId },
            select: { id: true, idQr: true, descripcionCorta: true, marca: true }
        });

        if (parsedData.cajas && Array.isArray(parsedData.cajas)) {
            parsedData.cajas.forEach((caja: any) => {
                if (caja.items && Array.isArray(caja.items)) {
                    caja.items.forEach((item: any) => {
                        const itemDesc = (item.descripcion || '').toLowerCase();
                        const itemCultivo = (item.cultivo || '').toLowerCase();

                        const match = activos.find(a => {
                            const desc = a.descripcionCorta.toLowerCase();
                            const marca = (a.marca || '').toLowerCase();
                            const itemClean = itemDesc.toLowerCase();

                            // Alias Gypsophila <-> Baby Ecuador / Baby Breath
                            if ((itemClean.includes('gyp') || itemClean.includes('baby')) && (desc.includes('baby') || desc.includes('gyp'))) {
                                return true;
                            }
                            // Alias Hydrangea <-> Hortensia
                            if ((itemClean.includes('hyd') || itemClean.includes('horten')) && (desc.includes('hyd') || desc.includes('horten'))) {
                                return true;
                            }

                            return itemDesc.includes(desc) || desc.includes(itemDesc) || (marca && (itemCultivo.includes(marca) || itemDesc.includes(marca)));
                        });

                        if (match) {
                            item.activoFijoId = match.id;
                            item.matchedQr = match.idQr;
                            item.matchedNombre = match.descripcionCorta;
                        } else {
                            item.activoFijoId = null;
                            item.matchedQr = null;
                        }
                    });
                }
            });
        }

        return NextResponse.json({
            success: true,
            datosExtraidos: parsedData
        });

    } catch (err: any) {
        console.error('[Procesar Packing List AI] Error:', err);
        return NextResponse.json({ error: err.message || 'Error al procesar el archivo con IA.' }, { status: 500 });
    }
}
