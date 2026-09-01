import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI, Type } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { organization: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });
    }

    // 2. Parse request payload (either FormData with file or JSON with base64)
    let base64Audio = '';
    let mimeType = 'audio/webm';

    let transcriptionText = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File | null;
      transcriptionText = (formData.get('transcriptionText') as string) || '';
      if (!audioFile && !transcriptionText) {
        return NextResponse.json({ error: 'No se recibió ningún archivo de audio ni texto' }, { status: 400 });
      }
      if (audioFile) {
        const buffer = Buffer.from(await audioFile.arrayBuffer());
        base64Audio = buffer.toString('base64');
        mimeType = audioFile.type || 'audio/webm';
      }
    } else {
      const body = await req.json();
      transcriptionText = body.transcriptionText || body.text || '';
      if (!body.audioBase64 && !transcriptionText) {
        return NextResponse.json({ error: 'Se requiere audioBase64 o transcriptionText' }, { status: 400 });
      }
      base64Audio = body.audioBase64 || '';
      mimeType = body.mimeType || 'audio/webm';
    }

    // Clean mimeType if it contains codec specifications like audio/webm;codecs=opus
    const cleanMimeType = mimeType.split(';')[0].trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'La clave GEMINI_API_KEY no está configurada' }, { status: 500 });
    }

    const genai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Eres el Asistente de Voz Inteligente de la Distribuidora Paraíso Floral para la creación rápida de pedidos.
Tienes conocimiento experto en la industria floral de exportación e importación y entiendes a la perfección la jerga, modismos, abreviaciones y nombres comerciales de flores y follajes.

Reglas de interpretación floral:
- "rojas freedom", "freedom", "explorer", "mondial", "vendela", "playa blanca" -> nombreProducto: "Rosas", variedadTono: "Freedom", "Explorer", "Blanco", etc.
- "eucalipto dollar", "dollar", "dólar", "baby blue", "cinerea", "silver dollar" -> nombreProducto: "Eucalipto Dólar" o "Eucalipto", variedadTono: "Dólar" o "Baby Blue".
- "babys", "baby", "baby breath", "gipsofila", "gypso", "velo de novia" -> nombreProducto: "Gypsophila / Baby Breath", variedadTono: "Blanco".
- "astromelias", "alstroemerias" -> nombreProducto: "Astromelias".
- "fuji", "fuji amarillo", "fuji blanco" -> nombreProducto: "Fuji", variedadTono: "Amarillo", "Blanco", etc.
- "fichitas", "fichas" -> nombreProducto: "Fichitas".
- "girasoles", "claveles", "miniclaveles", "hortensias", "lirios", "ruscus", "solidago", "estatice", "pinocho", "margaritas".

Instrucciones de extracción JSON:
1. "clienteNombre": Nombre del cliente o florería mencionado (ej. "Floristería Rosas", "María"). Si no se menciona, deja cadena vacía.
2. "clienteTelefono": Número telefónico si se menciona.
3. "destino": Lugar de entrega (ej. "San Pedro Sula", "Boulevard Morazán", "Retiro en Tienda"). Si dice recoger o pasar a traer, pon "Retiro en Tienda".
4. "estadoPago": "pagado", "contra_entrega" (default) o "credito".
5. "notas": Instrucciones especiales.
6. "items": Lista de productos:
   - "nombreProducto": Nombre normalizado de la flor/follaje.
   - "variedadTono": Color, variedad o subcategoría.
   - "cantidadSolicitada": Número entero de paquetes o rollos (mayor a 0).
7. "resumenDictado": Resumen corto en una frase de lo interpretado.

Devuelve estrictamente el JSON sin texto adicional.
`;

    // 3. Call Gemini with ultra-light Flash models (NEVER Pro models to ensure lowest micro-cost)
    const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
    let response: any = null;
    let lastError: any = null;

    // Content payload: prioritize pure text if available (virtually $0.000003 USD), or lightweight audio
    const contents: any[] = transcriptionText
      ? [
          `Interpreta y extrae los datos del pedido dictado a partir de este texto transcrito: "${transcriptionText}"`
        ]
      : [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Audio
            }
          },
          "Escucha este audio y extrae el pedido completo según las instrucciones del sistema."
        ];

    for (const modelName of candidateModels) {
      try {
        response = await genai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                resumenDictado: { type: Type.STRING },
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
      throw lastError || new Error('No se obtuvo respuesta del modelo de voz IA');
    }

    const parsed = JSON.parse(response.text);

    // 4. Cross-reference with database: Clients and Catalog Products
    let matchedCliente = null;
    if (parsed.clienteNombre && parsed.clienteNombre.trim().length > 0) {
      const dbClientes = await prisma.cliente.findMany({
        where: {
          organizationId: dbUser.organizationId,
          nombre: { contains: parsed.clienteNombre.trim(), mode: 'insensitive' }
        },
        take: 3
      });

      if (dbClientes.length > 0) {
        matchedCliente = {
          id: dbClientes[0].id,
          nombre: dbClientes[0].nombre,
          telefono: dbClientes[0].telefono || parsed.clienteTelefono,
          direccion: dbClientes[0].direccion
        };
      }
    }

    // Map catalog products
    const dbProducts = await prisma.producto.findMany({
      where: {
        organizationId: dbUser.organizationId,
        estado: 'ACTIVO'
      },
      select: {
        id: true,
        nombre: true,
        sku: true,
        stockActual: true,
        precioVenta: true
      }
    });

    // Helper to normalize strings for matching
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const enrichedItems = (parsed.items || []).map((item: any) => {
      const fullSearch = normalize(`${item.nombreProducto} ${item.variedadTono || ''}`);
      const tokens = fullSearch.split(/\s+/).filter(t => t.length > 2);

      let bestMatch: any = null;
      let highestScore = 0;

      for (const prod of dbProducts) {
        const prodNorm = normalize(prod.nombre);
        const skuNorm = normalize(prod.sku);

        let score = 0;

        // Exact substring match
        if (prodNorm.includes(normalize(item.nombreProducto)) || normalize(item.nombreProducto).includes(prodNorm)) {
          score += 10;
        }

        // Special aliases mapping
        if (tokens.some(t => ['baby', 'babys', 'breath', 'gipso', 'gipsofila', 'gypso'].includes(t)) &&
            (prodNorm.includes('gypsophila') || prodNorm.includes('baby') || prodNorm.includes('gipsofila'))) {
          score += 15;
        }
        if (tokens.some(t => ['dollar', 'dolar'].includes(t)) && prodNorm.includes('dolar') || prodNorm.includes('dollar')) {
          score += 15;
        }
        if (tokens.some(t => ['freedom', 'roja', 'rojas'].includes(t)) && (prodNorm.includes('rosa') || prodNorm.includes('roja'))) {
          score += 12;
        }

        // Token intersection
        for (const token of tokens) {
          if (prodNorm.includes(token) || skuNorm.includes(token)) {
            score += 4;
          }
        }

        if (score > highestScore && score >= 4) {
          highestScore = score;
          bestMatch = prod;
        }
      }

      return {
        nombreProducto: item.nombreProducto,
        variedadTono: item.variedadTono || '',
        cantidadSolicitada: Math.max(1, Number(item.cantidadSolicitada) || 1),
        productoId: bestMatch ? bestMatch.id : undefined,
        sku: bestMatch ? bestMatch.sku : undefined,
        stockActual: bestMatch ? bestMatch.stockActual : undefined,
        precioSugerido: bestMatch ? Number(bestMatch.precioVenta) : undefined
      };
    });

    return NextResponse.json({
      success: true,
      resumenDictado: parsed.resumenDictado || '',
      clienteNombre: parsed.clienteNombre || '',
      clienteTelefono: parsed.clienteTelefono || '',
      matchedCliente,
      destino: parsed.destino || (matchedCliente?.direccion || ''),
      estadoPago: parsed.estadoPago || 'contra_entrega',
      notas: parsed.notas || '',
      items: enrichedItems
    });

  } catch (error: any) {
    console.error('Error en /api/pedidos/voice-ai:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al procesar el audio con el asistente de IA' 
    }, { status: 500 });
  }
}
