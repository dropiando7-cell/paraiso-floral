import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { PDFParse } from 'pdf-parse';
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
        const files: File[] = [];

        const allFiles = formData.getAll('files') as File[];
        if (allFiles && allFiles.length > 0) {
            files.push(...allFiles.filter(f => f instanceof File && f.size > 0));
        }

        const singleFile = formData.get('file') as File | null;
        if (singleFile && singleFile instanceof File && singleFile.size > 0) {
            if (!files.some(f => f.name === singleFile.name && f.size === singleFile.size)) {
                files.push(singleFile);
            }
        }

        if (files.length === 0) {
            return NextResponse.json({ error: 'Debe subir al menos un archivo PDF o Imagen de packing list' }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        if (!geminiKey && !anthropicKey) {
            return NextResponse.json({ 
                error: 'No se encontró la API Key de Gemini (GEMINI_API_KEY) ni de Anthropic (ANTHROPIC_API_KEY) en las variables de entorno.' 
            }, { status: 500 });
        }

        // Cargar catálogo de inventario activo para matching inteligente instantáneo
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: dbUser.organizationId },
            select: { id: true, idQr: true, descripcionCorta: true, marca: true, codigoBarras: true, categoria: true }
        });

        const promptBase = `Eres un sistema experto en logística e inventario de flores y follajes de importación para Paraíso Floral.
Analiza este documento de envío / packing list / factura de flores. Puede ser de proveedores locales (ej. 'LUCIO NAHUN BARAHONA SUAREZ SPS', 'Follajes del Sur') o de fincas de Ecuador y Colombia (ej. 'QUALITY FLOWERS', 'FLOREQUISA', 'FLORSANI', 'GALAPAGOS FLORES', 'LUZ OF ROSES', 'JYR QUALITY FLOWERS', 'SANTA CLARA GARDENS', 'LUMINA FLOWERS', etc.).

Extrae con la mayor precisión posible la información y devuelve ÚNICAMENTE un objeto JSON estricto con la siguiente estructura:

{
  "numeroEnvio": "número de envío, guía, factura o invoice (ej. '19981', '002001000621100', '5087821', '8472', '14417', '24291', '4'), si no hay genera uno como 'PL-' + fecha",
  "proveedor": "Nombre de la finca o proveedor (ej. 'LUCIO NAHUN BARAHONA SUAREZ SPS', 'QUALITY FLOWERS', 'FLORSANI', 'FLOREQUISA', 'GALAPAGOS FLORES', 'LUZ OF ROSES', 'JYR QUALITY FLOWERS', 'SANTA CLARA GARDENS')",
  "fechaLlegada": "YYYY-MM-DD",
  "cajas": [
    {
      "numeroCaja": 1,
      "codigoProveedor": "código o folio del sticker de la caja si aplica (ej. '120242', '119764'), o null",
      "items": [
        {
          "descripcion": "Nombre del producto/variedad completo (ej. 'ROSA FREEDOM 60CM', 'ROSA VENDELA 40 CMS', 'GYPSOPHILA XLENCE', 'EUCALIPTO BABY BLUE', 'DUSTY MILLER', 'HORTENSIA BLANCA', 'LEATHER LEAF')",
          "cultivo": "Cultivo o categoría (ej. 'ROSA - Freedom', 'FOLLAJE - Eucalipto', 'GYPSOPHILA', 'HORTENSIA')",
          "bonches": 25 // número entero de paquetes / bonches / bunches
        }
      ]
    }
  ]
}

Reglas estrictas:
1. Agrupa los productos dentro de su respectiva caja (Caja 1, Caja 2, etc.) si el documento detalla por caja. Si no especifica caja, distribúyelos o ponlos en numeroCaja: 1.
2. Extrae todos los ítems y sus cantidades exactas de bonches/paquetes (si viene en tallos/stems y bunches/box, usa la cantidad de BUNCHES/BONCHES).
3. Devuelve SOLO JSON válido sin bloques markdown ni texto explicativo.`;

        const lotesExtraidos: any[] = [];

        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

                let extractedText = '';
                let isPdfWithText = false;

                if (fileType.includes('pdf')) {
                    try {
                        const pdfParser = new PDFParse({ data: buffer });
                        const textResult = await pdfParser.getText();
                        if (textResult && textResult.text && textResult.text.trim().length > 30) {
                            extractedText = textResult.text.trim();
                            isPdfWithText = true;
                        }
                    } catch (pdfErr) {
                        console.warn('[PDFParse warning, falling back to vision]:', pdfErr);
                    }
                }

                let rawAIResponse = '';

                // Usar Gemini 2.5 Flash (ultra-rápido)
                if (geminiKey) {
                    const ai = new GoogleGenAI({ apiKey: geminiKey });

                    if (isPdfWithText) {
                        // Modo ultra-rápido sub-segundo con texto extraído localmente
                        const promptWithText = `${promptBase}\n\n--- TEXTO EXTRAÍDO DEL DOCUMENTO (${file.name}) ---\n${extractedText}`;
                        const response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: promptWithText,
                            config: {
                                responseMimeType: 'application/json'
                            }
                        });
                        rawAIResponse = response.text || '';
                    } else {
                        // Modo multimodal para PDFs escaneados / fotos a mano
                        const base64Data = buffer.toString('base64');
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
                                        { text: promptBase }
                                    ]
                                }
                            ],
                            config: {
                                responseMimeType: 'application/json'
                            }
                        });
                        rawAIResponse = response.text || '';
                    }
                } else if (anthropicKey) {
                    // Fallback a Claude
                    const client = new Anthropic({ apiKey: anthropicKey });
                    const base64Data = buffer.toString('base64');
                    const response = await client.messages.create({
                        model: 'claude-sonnet-4-5',
                        max_tokens: 4000,
                        messages: [
                            {
                                role: 'user',
                                content: isPdfWithText 
                                    ? `${promptBase}\n\n--- TEXTO EXTRAÍDO ---\n${extractedText}`
                                    : [
                                        {
                                            type: fileType.includes('pdf') ? 'document' : 'image',
                                            source: {
                                                type: 'base64',
                                                media_type: fileType as any,
                                                data: base64Data
                                            }
                                        } as any,
                                        { type: 'text', text: promptBase }
                                    ]
                            }
                        ]
                    });
                    rawAIResponse = response.content[0].type === 'text' ? response.content[0].text : '';
                }

                const jsonMatch = rawAIResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error(`No se pudo extraer la estructura del documento ${file.name}`);
                }

                const parsed = JSON.parse(jsonMatch[0]);

                // Asignar nombre del archivo de origen
                parsed.archivoOrigen = file.name;

                // Enlazado inteligente con el catálogo de ActivoFijo / Código de Barras / QR
                if (parsed.cajas && Array.isArray(parsed.cajas)) {
                    parsed.cajas.forEach((caja: any) => {
                        if (caja.items && Array.isArray(caja.items)) {
                            caja.items.forEach((item: any) => {
                                const itemDesc = (item.descripcion || '').toLowerCase();
                                const itemCultivo = (item.cultivo || '').toLowerCase();
                                const itemClean = itemDesc
                                    .replace(/rosa\s*-\s*/i, '')
                                    .replace(/\s*\d+\s*(cms|cm)/i, '')
                                    .trim();

                                const match = activos.find(a => {
                                    const desc = a.descripcionCorta.toLowerCase();
                                    const marca = (a.marca || '').toLowerCase();
                                    const qr = (a.idQr || '').toLowerCase();
                                    const barcode = (a.codigoBarras || '').toLowerCase();

                                    // 1. Coincidencia por código directo si viene en la descripción
                                    if (qr && itemDesc.includes(qr)) return true;
                                    if (barcode && itemDesc.includes(barcode)) return true;

                                    // 2. Coincidencia por variedad limpia
                                    if (desc.includes(itemClean) || itemClean.includes(desc)) return true;
                                    if (marca && (itemDesc.includes(marca) || marca.includes(itemDesc))) return true;

                                    // 3. Diccionario de sinónimos de flores y follajes de importación
                                    if ((itemDesc.includes('gyp') || itemDesc.includes('baby') || itemDesc.includes('xlence')) && (desc.includes('baby') || desc.includes('gyp'))) return true;
                                    if ((itemDesc.includes('hyd') || itemDesc.includes('horten')) && (desc.includes('hyd') || desc.includes('horten'))) return true;
                                    if (itemDesc.includes('dusty') && desc.includes('dusty')) return true;
                                    if (itemDesc.includes('leather') && (desc.includes('leather') || desc.includes('cuero'))) return true;
                                    if (itemDesc.includes('eryng') && desc.includes('eryng')) return true;
                                    if (itemDesc.includes('eucalipto') && desc.includes('eucalipto')) return true;
                                    if (itemDesc.includes('ruscus') && desc.includes('ruscus')) return true;
                                    if (itemDesc.includes('delfin') && desc.includes('delphin')) return true;
                                    if (itemDesc.includes('ranunc') && desc.includes('ranunc')) return true;
                                    if (itemDesc.includes('matio') && desc.includes('mathio')) return true;
                                    if (itemDesc.includes('clavel') && desc.includes('clavel')) return true;
                                    if (itemDesc.includes('pompon') && (desc.includes('pompon') || desc.includes('crisantemo'))) return true;

                                    return false;
                                });

                                if (match) {
                                    item.activoFijoId = match.id;
                                    item.matchedQr = match.idQr;
                                    item.matchedNombre = match.descripcionCorta;
                                    item.codigoBarras = match.codigoBarras || match.idQr;
                                    item.esNuevo = false;
                                } else {
                                    item.activoFijoId = null;
                                    item.matchedQr = null;
                                    item.matchedNombre = null;
                                    item.codigoBarras = null;
                                    item.esNuevo = true;
                                }
                            });
                        }
                    });
                }

                // Calcular totales del packing list
                let totalBonches = 0;
                let totalCajas = parsed.cajas?.length || 0;
                parsed.cajas?.forEach((c: any) => {
                    c.items?.forEach((i: any) => {
                        totalBonches += i.bonches || 0;
                    });
                });
                parsed.totalBonches = totalBonches;
                parsed.totalCajas = totalCajas;

                lotesExtraidos.push(parsed);
            } catch (fileErr: any) {
                console.error(`[Error procesando archivo ${file.name}]:`, fileErr);
            }
        }

        if (lotesExtraidos.length === 0) {
            return NextResponse.json({ error: 'No se pudo procesar ningún archivo. Verifique el formato de los documentos.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            lotesExtraidos,
            lotesCount: lotesExtraidos.length,
            // Retrocompatibilidad con interfaz anterior
            datosExtraidos: lotesExtraidos[0]
        });

    } catch (err: any) {
        console.error('[Procesar Packing List AI Global Error]:', err);
        return NextResponse.json({ error: err.message || 'Error al procesar los packing lists con IA.' }, { status: 500 });
    }
}

