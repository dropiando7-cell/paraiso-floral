import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI, Type } from '@google/genai';

export const dynamic = 'force-dynamic';

function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FLORAL_SYNONYMS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(dolar|dollar)\b/i, canonical: 'eucalipto dolar' },
  { pattern: /\b(baby|gypsophila|gipsofila)\b/i, canonical: 'baby ecuatoriano' },
  { pattern: /\b(cris\s*g|crisantemo|crisantemos)\b/i, canonical: 'crisantemo' },
  { pattern: /\b(estaticia|estatice|statice)\b/i, canonical: 'estatice' },
  { pattern: /\b(mini\s*clavel|miniclavel)\b/i, canonical: 'miniclavel' },
  { pattern: /\b(ponda|pompon|pompones)\b/i, canonical: 'pompones' },
  { pattern: /\b(solidago|solidagos)\b/i, canonical: 'solidago' },
  { pattern: /\b(limonium|limoniun)\b/i, canonical: 'limonium' },
  { pattern: /\b(gerbera|gerberas|jerbera)\b/i, canonical: 'gerberas' },
  { pattern: /\b(girasol|girasoles)\b/i, canonical: 'girasoles' },
  { pattern: /\b(ruscus|rusco)\b/i, canonical: 'ruscus' },
];

function findBestCatalogMatch(rawDesc: string, catalog: any[]) {
  if (!rawDesc || !catalog.length) return null;

  let expanded = rawDesc;
  for (const syn of FLORAL_SYNONYMS) {
    if (syn.pattern.test(expanded)) {
      expanded = `${expanded} ${syn.canonical}`;
    }
  }

  const normQuery = normalizeText(expanded);
  const normRaw = normalizeText(rawDesc);
  if (!normRaw) return null;

  // Sinónimos de singular/plural básicos (ej. rosa -> rosas, roja -> rojas)
  const stemWord = (w: string) => w.replace(/(es|s)$/, '');
  const rawTokens = normRaw.split(' ').filter(w => w.length >= 2);
  const queryTokens = normQuery.split(' ').filter(w => w.length >= 2);

  let bestProduct: any = null;
  let bestScore = 0;

  for (const prod of catalog) {
    const normProd = normalizeText(prod.nombre || '');
    if (!normProd) continue;

    if (normProd === normRaw || normProd === normQuery) {
      return prod;
    }

    const prodTokens = normProd.split(' ').filter(w => w.length >= 2);
    const prodStems = prodTokens.map(stemWord);

    let score = 0;

    // Coincidencia de palabras originales del ítem
    let matchedRawCount = 0;
    for (const rt of rawTokens) {
      const rStem = stemWord(rt);
      if (prodTokens.includes(rt) || prodStems.includes(rStem)) {
        score += 12;
        matchedRawCount++;
      } else if (prodTokens.some(pt => pt.startsWith(rStem) || rStem.startsWith(pt))) {
        score += 7;
        matchedRawCount++;
      }
    }

    // Coincidencia por sinónimos expandidos
    for (const qt of queryTokens) {
      const qStem = stemWord(qt);
      if (prodTokens.includes(qt) || prodStems.includes(qStem)) {
        score += 5;
      }
    }

    // Si el ítem especifica un color clave (roja, blanca, amarilla, rosada, colores), penalizar si el producto tiene otro color distinto
    const colors = ['roja', 'rojo', 'blanca', 'blanco', 'amarilla', 'amarillo', 'rosada', 'rosado', 'colores', 'naranja', 'morado', 'verde'];
    const rawColors = rawTokens.map(stemWord).filter(t => colors.map(stemWord).includes(t));
    const prodColors = prodTokens.map(stemWord).filter(t => colors.map(stemWord).includes(t));

    if (rawColors.length > 0) {
      const hasSameColor = rawColors.some(c => prodColors.includes(c));
      if (hasSameColor) {
        score += 20;
      } else if (prodColors.length > 0) {
        score -= 25; // Evitar cruzar "Rosa Blanca" con "Rosa Roja"
      }
    }

    // Bonificación si todas las palabras clave del ítem están en el producto
    if (rawTokens.length > 0 && matchedRawCount === rawTokens.length) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = prod;
    }
  }

  return bestScore >= 12 ? bestProduct : null;
}

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

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { organizationId: true }
    });
    const organizationId = dbUser?.organizationId;

    // Cargar catálogo de productos activos para que la IA cruce directamente con el inventario real
    const productosCatalogo = organizationId
      ? await prisma.producto.findMany({
          where: { organizationId, estado: 'ACTIVO' },
          select: {
            id: true,
            sku: true,
            nombre: true,
            descripcion: true,
            precioVenta: true,
            imagenWeb: true,
            imagenes: true
          },
          orderBy: { nombre: 'asc' }
        })
      : [];

    const catalogoTexto = productosCatalogo.length > 0
      ? `\nCATÁLOGO DE INVENTARIO DISPONIBLE (ID | SKU | NOMBRE | PRECIO REF):\n` +
        productosCatalogo
          .map(p => `${p.id} | ${p.sku || '-'} | ${p.nombre} | L.${Number(p.precioVenta || 0)}`)
          .join('\n')
      : '';

    const genai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Eres un experto lector contable y florista de "Distribuidora Paraíso Floral" en Honduras.
Tu tarea es leer notas de WhatsApp, dictados o FOTOS DE FACTURAS COMERCIALES / TALONARIOS ESCRITOS A MANO y convertirlos en un pedido estructurado, cruzando los ítems con el CATÁLOGO DE INVENTARIO cuando exista coincidencia.

REGLAS CRÍTICAS PARA LECTURA DE TALONARIOS MANUSCRITOS Y NOTAS:
1. COMILLAS DE REPETICIÓN (" o '' o -//-):
   - En las facturas escritas a mano, si una línea dice "Rosa Roja" y las líneas de abajo dicen '" Blanca' o '" Colores', las comillas significan que repite la palabra principal de arriba ("Rosa").
   - Por tanto, '" Blanca' DEBE interpretarse como "Rosas Blancas" y '" Colores' como "Rosas Colores". ¡NUNCA dejes solo la palabra "Blanca" o "Colores"!
2. EQUIVALENCIAS Y JERGA FLORAL DE HONDURAS:
   - "Rosa Roja" -> "Rosas Rojas"
   - '" Blanca' / "Rosa Blanca" -> "Rosas Blancas"
   - '" Colores' / "Rosa Colores" -> "Rosas Colores"
   - "Cris G." / "Cris." -> "Crisantemo Grande" (o el Crisantemo del catálogo)
   - "Baby Ecuador" / "Baby" -> "Baby Ecuatoriano (Gypsophila)"
   - "Solidagos pintados" / "Solidago" -> "Solidago" (o "Solidago Pintado" si quieres conservar el detalle)
   - "Estaticia" / "Estatice" / "Statice" -> "Estatice"
   - "Limonium" / "Limoniun" -> "Limonium"
   - "Dollar" / "Dolar" -> "Eucalipto Dólar"
   - "Mini Clavel" / "Miniclavel" -> "Miniclavel Colores" (o "Mini Clavel")
   - "Girasol" -> "Girasoles"
   - "Ponda Rosado" / "Pompon Rosado" -> "Pompón Rosado" / "Pompones"
   - "Gerbera" -> "Gerberas Colores" (o "Gerbera")
   - "Ruscus" -> "Ruscus"
   - "Envio" / "Envío" -> "Envío"
3. VERIFICACIÓN MATEMÁTICA DE FILAS (CANT. x P. UNIT. = TOTAL):
   - En talonarios manuscritos hay columnas: CANT. | DESCRIPCIÓN | P. UNIT. | TOTAL.
   - Algunos números escritos a mano en P. UNIT. pueden verse confusos (por ejemplo, un "350" mal trazado puede parecer ".150", pero si CANT = 2 y TOTAL = 700, 700 / 2 = 350).
   - SIEMPRE verifica la columna TOTAL de cada fila: si CANT * P. UNIT no coincide con el TOTAL escrito en esa fila, pero TOTAL / CANT da un número redondo coherente, usa (TOTAL / CANT) como precioUnitario para que la suma de la factura cuadre exactamente con el total manuscrito.
4. CRUCE CON CATÁLOGO:
   - Si el producto coincide con uno del CATÁLOGO DE INVENTARIO listado abajo, coloca su UUID exacto en "productoId" y usa un nombre claro en "descripcion".
   - Si no estás 100% seguro de que sea el mismo producto del catálogo (ej. un color o variedad distinta que no figura en el catálogo), deja "productoId" vacío ("") y pon el nombre completo y claro en "descripcion" (¡NUNCA pongas la palabra genérica "Producto"!).
5. CLIENTE Y CONDICIÓN DE PAGO:
   - Extrae "clienteNombre" del campo "Nombre:" del talonario (ej. "La Occidental") y "clienteDireccion" del campo "Dirección:" (ej. "La Entrada Copán").
   - Si en el talonario o al pie del total dice "Crédito" (ej. "6,220 Crédito"), devuelve "condicionPago": "credito". De lo contrario, "contado".
${catalogoTexto}
`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
    let response: any = null;
    let lastError: any = null;

    const parts: any[] = [];
    if (text) {
      parts.push({ text: `Texto ingresado:\n\n${text}` });
    } else {
      parts.push({ text: 'Analiza detalladamente la imagen de esta factura/pedido manuscrito, interpreta todas las filas, expande comillas de repetición, verifica CANT x P.UNIT = TOTAL y cruza con el catálogo.' });
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
                clienteDireccion: { type: Type.STRING },
                tipoDocumento: { type: Type.STRING, enum: ['cotizacion', 'factura', 'proforma'] },
                condicionPago: { type: Type.STRING, enum: ['contado', 'credito'] },
                notas: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      productoId: { type: Type.STRING },
                      descripcion: { type: Type.STRING },
                      cantidad: { type: Type.NUMBER },
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

    const rawResult = JSON.parse(response.text);
    const catalogById = new Map(productosCatalogo.map(p => [p.id, p]));

    // Enriquecer y asegurar que cada ítem tenga su producto de inventario (si aplica) y un nombre real
    const enrichedItems = (rawResult.items || []).map((item: any) => {
      const cleanDesc = (item.descripcion || '').trim();
      let matchedProd = item.productoId ? catalogById.get(item.productoId) : null;

      if (!matchedProd && cleanDesc) {
        matchedProd = findBestCatalogMatch(cleanDesc, productosCatalogo);
      }

      const finalDesc = matchedProd?.nombre || cleanDesc || 'Flor / Follaje';
      const userPrice = Number(item.precioUnitario) || 0;
      const catalogPrice = matchedProd ? Number(matchedProd.precioVenta || 0) : 0;

      return {
        productoId: matchedProd?.id || undefined,
        sku: matchedProd?.sku || '',
        descripcion: finalDesc,
        descripcionOriginal: cleanDesc || finalDesc,
        descripcionLarga: matchedProd?.descripcion || '',
        cantidad: Math.max(1, Number(item.cantidad) || 1),
        precioUnitario: userPrice > 0 ? userPrice : catalogPrice,
        imageUrl: matchedProd?.imagenWeb || (matchedProd?.imagenes && matchedProd.imagenes[0]) || undefined
      };
    });

    // Buscar si el cliente detectado en la hoja existe en la base de datos
    let clienteEncontrado: any = null;
    if (organizationId && rawResult.clienteNombre && rawResult.clienteNombre.trim()) {
      const targetName = rawResult.clienteNombre.trim();
      const found = await prisma.cliente.findFirst({
        where: {
          organizationId,
          OR: [
            { nombre: { contains: targetName, mode: 'insensitive' } },
            { alias: { contains: targetName, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          nombre: true,
          rtn: true,
          telefono: true,
          direccion: true,
          departamento: true,
          diasCredito: true
        }
      });
      if (found) {
        clienteEncontrado = found;
      }
    }

    return NextResponse.json({
      ...rawResult,
      items: enrichedItems,
      clienteEncontrado
    });

  } catch (error: any) {
    console.error('Error en API libreta-cotizacion:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
