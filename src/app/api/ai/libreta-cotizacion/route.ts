import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

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

function stemWord(w: string): string {
  const s = (w || '').trim();
  if (s === 'hortencias' || s === 'hortencia' || s === 'hortensias') return 'hortensia';
  if (s === 'estaticias' || s === 'estatice' || s === 'statice' || s === 'estaficia') return 'estaticia';
  if (s === 'anaranjadas' || s === 'anaranjada' || s === 'anaranjados' || s === 'anaranjado' || s === 'naranjas') return 'naranja';
  if (s === 'jerbera' || s === 'jerberas' || s === 'gerberas') return 'gerbera';
  if (s === 'lisiantus' || s === 'lizianthus' || s === 'lisianthus') return 'lisianthu';
  if (s === 'pompones' || s === 'ponda' || s === 'pondas') return 'pompon';
  if (s === 'pandas') return 'panda';
  if (s === 'dragones') return 'dragon';
  if (s === 'pinochos') return 'pinocho';
  if (s === 'margaritas') return 'margarita';
  if (s === 'girasoles') return 'girasol';
  if (s === 'claveles') return 'clavel';
  if (s === 'crisantemos') return 'crisantemo';
  if (s === 'lirios') return 'lirio';
  if (s === 'astromelias' || s === 'alstroemerias' || s === 'alstromerias') return 'astromelia';
  if (s === 'solidagos') return 'solidago';
  if (s === 'azules') return 'azul';
  if (s === 'verdes') return 'verde';
  if (s === 'colores') return 'color';
  if (/^(roj|blanc|rosad|morad|amarill|pintad)[oa]s?$/.test(s)) {
    return s.replace(/[oa]s?$/, '');
  }
  if (s.endsWith('es') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('s') && s.length > 3) return s.slice(0, -1);
  return s;
}

function cleanWhatsAppItemDesc(raw: string): string {
  let s = (raw || '').trim();
  s = s
    .replace(/\b(como\s+la\s+de\s+la\s+foto|la\s+de\s+la\s+foto|de\s+la\s+foto|como\s+la\s+foto|en\s+la\s+foto|segun\s+foto|ver\s+foto)\b/gi, ' ')
    .replace(/\b(por\s+favor|porfa|xfa|gracias|bonit[oa]s?|fresc[oa]s?|bien\s+bonit[oa]s?)\b/gi, ' ')
    .replace(/^(paquetes?|paq\.?|manojos?|ramos?|docenas?|unidades?|uds?\.?)\s+(de\s+)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

const FLOWER_FAMILIES = [
  'rosa',
  'minirosa',
  'gerbera',
  'minigerbera',
  'clavel',
  'miniclavel',
  'girasol',
  'minigirasol',
  'hortensia',
  'lisianthu',
  'eucalipto',
  'dragon',
  'pinocho',
  'margarita',
  'estaticia',
  'pompon',
  'panda',
  'crisantemo',
  'solidago',
  'limonium',
  'baby',
  'ruscu',
  'astromelia',
  'lirio',
  'cala',
  'calla',
  'anturio',
  'ave',
  'leather',
  'helecho',
  'ipericum',
  'hipericum',
  'snapdragon',
  'stock',
  'delphinium',
  'matricaria',
  'craspedia',
  'proteas',
  'tulipan',
  'orquidea'
];

const COLOR_STEMS = new Set([
  'roj', 'blanc', 'rosad', 'morad', 'amarill', 'naranja', 'azul', 'verde',
  'lila', 'salmon', 'melocoton', 'peach', 'blush', 'coral', 'fucsia',
  'bicolor', 'color', 'negro', 'black', 'tinturad', 'pintad', 'crema', 'cafe', 'vino'
]);

const FLORAL_SYNONYMS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(dolar|dollar)\b/i, canonical: 'eucalipto dolar' },
  { pattern: /\b(baby|gypsophila|gipsofila)\b/i, canonical: 'baby ecuatoriano' },
  { pattern: /\b(cris\s*g|crisantemo|crisantemos)\b/i, canonical: 'crisantemo' },
  { pattern: /\b(estaticia|estatice|statice)\b/i, canonical: 'estaticia' },
  { pattern: /\b(mini\s*clavel|miniclavel)\b/i, canonical: 'miniclavel' },
  { pattern: /\b(ponda|pompon|pompones)\b/i, canonical: 'pompones' },
  { pattern: /\b(solidago|solidagos)\b/i, canonical: 'solidago' },
  { pattern: /\b(limonium|limoniun)\b/i, canonical: 'limonium' },
  { pattern: /\b(gerbera|gerberas|jerbera)\b/i, canonical: 'gerberas' },
  { pattern: /\b(girasol|girasoles)\b/i, canonical: 'girasoles' },
  { pattern: /\b(ruscus|rusco)\b/i, canonical: 'ruscus' },
];

// Cargar precios de referencia del CSV de inventario como respaldo si algún ítem en BD tiene precio 0
let cachedReferencePrices: Map<string, number> | null = null;
function getReferencePricesBySku(): Map<string, number> {
  if (cachedReferencePrices) return cachedReferencePrices;
  const map = new Map<string, number>();
  try {
    const csvPath = path.join(process.cwd(), 'referencias', 'precios_base_inventario_octubre_2026.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).slice(1).filter(Boolean);
      for (const line of lines) {
        const res: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === ',' && !inQuotes) {
            res.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
        res.push(cur);
        const sku = (res[0] || '').trim();
        const price = Number(res[5]) || Number(res[6]) || 0;
        if (sku && price > 0) {
          map.set(sku.toUpperCase(), price);
        }
      }
    }
  } catch (e) {
    console.warn('No se pudo leer CSV de precios de referencia:', e);
  }
  cachedReferencePrices = map;
  return map;
}

function findBestCatalogMatch(rawDesc: string, catalog: any[]) {
  if (!rawDesc || !catalog.length) return null;

  const cleanedDesc = cleanWhatsAppItemDesc(rawDesc);
  let expanded = cleanedDesc || rawDesc;
  for (const syn of FLORAL_SYNONYMS) {
    if (syn.pattern.test(expanded)) {
      expanded = `${expanded} ${syn.canonical}`;
    }
  }

  const normRaw = normalizeText(cleanedDesc || rawDesc);
  if (!normRaw) return null;

  let queryOverride = normalizeText(expanded);
  let preferredSku: string | null = null;

  // Reglas de dominio específicas de Paraíso Floral
  if (/\b(pompon|pompones|ponda)\b/.test(normRaw) && /\b(punto\s+negro|centro\s+negro|ojo\s+negro|panda)\b/.test(normRaw)) {
    queryOverride = 'panda blanco pompones blanco';
    preferredSku = '010006';
  } else if (/\b(rosa|rosas)\b/.test(normRaw) && /\b(viejo|vieja|palo)\b/.test(normRaw)) {
    queryOverride = 'rosas rosadas';
    preferredSku = '010008';
  } else if (normRaw === 'eucalipto' || normRaw === 'eucaliptos') {
    queryOverride = 'eucalipto normal';
    preferredSku = '000163';
  } else if (/\b(hortensia|hortencia|hortensias|hortencias)\b/.test(normRaw) && !/\b(holanda|ecuador|importada)\b/.test(normRaw)) {
    queryOverride = `${normRaw} guatemala`;
  }

  if (preferredSku) {
    const exactSkuProd = catalog.find(p => String(p.sku || '').trim() === preferredSku);
    if (exactSkuProd) return exactSkuProd;
  }

  const rawTokens = normRaw.split(' ').filter(w => w.length >= 1);
  const rawStems = rawTokens.map(stemWord);

  const queryTokens = queryOverride.split(' ').filter(w => w.length >= 1);
  const queryStems = queryTokens.map(stemWord);

  const queryHasMini = /\bmini/.test(normRaw);
  const queryHasSh = /\bsh\b/.test(normRaw);
  const requestedFamilies = rawStems.filter(s => FLOWER_FAMILIES.includes(s));
  if (requestedFamilies.includes('pompon') && queryStems.includes('panda')) {
    requestedFamilies.push('panda');
  }

  const rawColors = rawStems.filter(s => COLOR_STEMS.has(s));

  let bestProduct: any = null;
  let bestScore = -999;

  for (const prod of catalog) {
    const normProd = normalizeText(prod.nombre || '');
    if (!normProd) continue;
    if (/\bmerma\b/.test(normProd)) continue;

    const prodTokens = normProd.split(' ').filter(w => w.length >= 1);
    const prodStems = prodTokens.map(stemWord);
    const prodHasMini = /\bmini/.test(normProd);
    const prodHasSh = prodTokens.includes('sh');

    // No cruzar flores normales con variedades "mini" si el usuario no pidió "mini"
    if (!queryHasMini && prodHasMini) {
      continue;
    }

    // Respetar estrictamente la familia de flor solicitada
    if (requestedFamilies.length > 0) {
      const matchesFamily = requestedFamilies.some(fam => prodStems.includes(fam));
      if (!matchesFamily) {
        continue;
      }
    }

    let score = 0;

    if (!queryHasSh && prodHasSh) {
      score -= 8;
    }

    if (normProd === normRaw || prodStems.join(' ') === rawStems.join(' ')) {
      score += 100;
    }

    let matchedStems = 0;
    for (const rs of rawStems) {
      if (prodStems.includes(rs)) {
        score += 18;
        matchedStems++;
      } else if (rs.length >= 4 && prodStems.some(ps => ps.startsWith(rs) || rs.startsWith(ps))) {
        score += 9;
        matchedStems++;
      }
    }

    for (const qs of queryStems) {
      if (!rawStems.includes(qs) && prodStems.includes(qs)) {
        score += 12;
      }
    }

    const prodColors = prodStems.filter(s => COLOR_STEMS.has(s));
    if (rawColors.length > 0) {
      const matchingColors = rawColors.filter(c => prodColors.includes(c));
      if (matchingColors.length > 0) {
        score += 30 * matchingColors.length;
        const extraProdColors = prodColors.filter(c => !rawColors.includes(c));
        score -= extraProdColors.length * 6;
      } else if (prodColors.includes('color')) {
        // Respaldo a "<Familia> Colores" cuando no existe el color específico en esa familia
        score += 8;
      } else if (prodColors.length > 0) {
        score -= 40;
      }
    } else {
      if (prodStems.includes('normal')) score += 15;
    }

    if (rawStems.length > 0 && matchedStems === rawStems.length) {
      score += 20;
    }

    const extraWords = Math.max(0, prodStems.length - rawStems.length);
    score -= extraWords * 3;

    const price = Number(prod.precioVenta || 0);
    if (price > 0) {
      score += 10;
    } else {
      score -= 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = prod;
    }
  }

  return bestScore >= 15 ? bestProduct : null;
}

function parseStructuredWhatsAppList(text: string) {
  if (!text || typeof text !== 'string') return null;
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return null;

  let clienteNombre = '';
  let condicionPago: 'contado' | 'credito' = 'contado';
  const notasList: string[] = [];
  const parsedItems: Array<{
    orden: number;
    cantidad: number;
    descripcion: string;
    descripcionOriginal: string;
    precioUnitario: number;
  }> = [];

  let nonMetaLines = 0;
  let qtyMatchedLines = 0;
  let lastMainFlower = '';

  for (const line of rawLines) {
    const clientMatch = line.match(/^(?:cliente|nombre|para)\s*[:\-]\s*(.+)$/i);
    if (clientMatch) {
      clienteNombre = clientMatch[1].trim();
      continue;
    }
    if (/^(?:al\s+)?cr[eé]dito$/i.test(line)) {
      condicionPago = 'credito';
      continue;
    }
    if (/^(?:al\s+)?contado$/i.test(line)) {
      condicionPago = 'contado';
      continue;
    }
    if (/^(?:hola|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|pedido|cotizaci[oó]n|lista\s+de\s+flores)\s*[:!]?$/i.test(line)) {
      continue;
    }

    nonMetaLines++;

    const cleanLine = line.replace(/^[-*•]\s*/, '').trim();

    let manualPrice = 0;
    let lineWithoutPrice = cleanLine;
    const priceMatch = cleanLine.match(/^(.*?)\s+(?:a\s+|@\s*|l\.?\s*|lps\.?\s*)(\d+(?:\.\d+)?)\s*(?:c\/u|cada\s+uno)?$/i);
    if (priceMatch && priceMatch[1].trim().length >= 2) {
      lineWithoutPrice = priceMatch[1].trim();
      manualPrice = Number(priceMatch[2]) || 0;
    }

    const leadMatch = lineWithoutPrice.match(/^(\d+(?:\.\d+)?)\s*(?:x\b|paquetes?\b|paq\.?\b|manojos?\b|ramos?\b|docenas?\b|uds?\.?\b|unidades?\b)?\s*(?:de\s+)?(.+)$/i);
    const trailMatch = !leadMatch ? lineWithoutPrice.match(/^(.+?)\s*(?:[x*]\s*|\-\s+)(\d+(?:\.\d+)?)$/i) : null;

    let qty = 1;
    let rawDesc = lineWithoutPrice;

    if (leadMatch) {
      qty = Number(leadMatch[1]) || 1;
      rawDesc = leadMatch[2].trim();
      qtyMatchedLines++;
    } else if (trailMatch) {
      rawDesc = trailMatch[1].trim();
      qty = Number(trailMatch[2]) || 1;
      qtyMatchedLines++;
    }

    if (/^["'”″-]+(\s+|$)/.test(rawDesc) && lastMainFlower) {
      rawDesc = `${lastMainFlower} ${rawDesc.replace(/^["'”″-]+\s*/, '')}`.trim();
    }

    const cleanedDesc = cleanWhatsAppItemDesc(rawDesc);
    if (!cleanedDesc) continue;

    const firstWord = normalizeText(cleanedDesc).split(' ')[0];
    if (firstWord && FLOWER_FAMILIES.includes(stemWord(firstWord))) {
      lastMainFlower = firstWord;
    }

    parsedItems.push({
      orden: parsedItems.length,
      cantidad: Math.max(1, Math.round(qty)),
      descripcion: cleanedDesc,
      descripcionOriginal: rawDesc,
      precioUnitario: manualPrice
    });
  }

  if (parsedItems.length === 0 || qtyMatchedLines === 0 || (qtyMatchedLines / nonMetaLines) < 0.6) {
    return null;
  }

  return {
    clienteNombre,
    clienteDireccion: '',
    tipoDocumento: 'cotizacion',
    condicionPago,
    notas: notasList.join('. '),
    items: parsedItems
  };
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

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { organizationId: true }
    });
    const organizationId = dbUser?.organizationId;

    // Cargar tanto Producto como ActivoFijo para tener el inventario completo de Paraíso Floral
    const [productosDb, activosDb] = organizationId
      ? await Promise.all([
          prisma.producto.findMany({
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
          }),
          prisma.activoFijo.findMany({
            where: {
              organizationId,
              estatusContable: { notIn: ['DE BAJA', 'ELIMINADO'] }
            },
            select: {
              id: true,
              idQr: true,
              descripcionCorta: true,
              descripcionDetallada: true,
              costoAdq: true,
              imagenUrl: true,
              productoId: true,
              producto: {
                select: {
                  id: true,
                  precioVenta: true,
                  imagenWeb: true
                }
              }
            },
            orderBy: { descripcionCorta: 'asc' }
          })
        ])
      : [[], []];

    const refPrices = getReferencePricesBySku();
    const catalogMap = new Map<string, any>();

    for (const p of productosDb) {
      if (/merma/i.test(p.nombre || '')) continue;
      const skuKey = (p.sku || '').trim().toUpperCase();
      const dbPrice = Number(p.precioVenta || 0);
      const fallbackPrice = skuKey ? (refPrices.get(skuKey) || 0) : 0;
      const item = {
        id: p.id,
        productoId: p.id,
        activoId: undefined as string | undefined,
        sku: (p.sku || '').trim(),
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        precioVenta: dbPrice > 0 ? dbPrice : fallbackPrice,
        imagenWeb: p.imagenWeb || (p.imagenes && p.imagenes[0]) || undefined
      };
      catalogMap.set(skuKey || `prod:${p.id}`, item);
    }

    for (const a of activosDb) {
      const nombre = (a.descripcionCorta || '').trim();
      if (!nombre || /merma/i.test(nombre)) continue;
      const skuKey = (a.idQr || '').trim().toUpperCase();
      const dbPrice = Number(a.producto?.precioVenta || a.costoAdq || 0);
      const fallbackPrice = skuKey ? (refPrices.get(skuKey) || 0) : 0;
      const resolvedPrice = dbPrice > 0 ? dbPrice : fallbackPrice;

      if (skuKey && catalogMap.has(skuKey)) {
        const existing = catalogMap.get(skuKey)!;
        if (!existing.activoId) existing.activoId = a.id;
        if (!existing.precioVenta && resolvedPrice > 0) existing.precioVenta = resolvedPrice;
        if (!existing.imagenWeb && a.imagenUrl) existing.imagenWeb = a.imagenUrl;
      } else {
        catalogMap.set(skuKey || `act:${a.id}`, {
          id: a.productoId || a.id,
          productoId: a.productoId || undefined,
          activoId: a.id,
          sku: (a.idQr || '').trim(),
          nombre,
          descripcion: a.descripcionDetallada || '',
          precioVenta: resolvedPrice,
          imagenWeb: a.imagenUrl || a.producto?.imagenWeb || undefined
        });
      }
    }

    const productosCatalogo = Array.from(catalogMap.values());

    // 1. Si es una lista estructurada de texto (ej. lista pegada de WhatsApp sin imagen),
    // procesarla línea por línea de forma determinista para garantizar el orden exacto 1 a 1.
    let rawResult: any = !imageB64 && text ? parseStructuredWhatsAppList(text) : null;

    // 2. Si hay imagen adjunta o es un párrafo libre no estructurado, usar Gemini IA
    if (!rawResult) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'La clave GEMINI_API_KEY no está configurada' }, { status: 500 });
      }

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
1. ORDEN EXACTO DE FILAS (MUY IMPORTANTE):
   - DEBES mantener ESTRICTAMENTE el mismo orden de arriba hacia abajo en que aparecen las líneas en el texto o en la imagen.
   - Asigna el campo "orden" empezando en 0, 1, 2, 3... exactamente en el orden original sin agrupar ni reordenar líneas.
2. COMILLAS DE REPETICIÓN (" o '' o -//-):
   - En las facturas escritas a mano, si una línea dice "Rosa Roja" y las líneas de abajo dicen '" Blanca' o '" Colores', las comillas significan que repite la palabra principal de arriba ("Rosa").
   - Por tanto, '" Blanca' DEBE interpretarse como "Rosas Blancas" y '" Colores' como "Rosas Colores". ¡NUNCA dejes solo la palabra "Blanca" o "Colores"!
3. EQUIVALENCIAS Y JERGA FLORAL DE HONDURAS:
   - "Rosa Roja" -> "Rosas Rojas"
   - '" Blanca' / "Rosa Blanca" -> "Rosas Blancas"
   - '" Colores' / "Rosa Colores" -> "Rosas Colores"
   - "Rosa rosado viejo" / "la de la foto" -> "Rosas Rosadas" (ignora frases conversacionales como "la de la foto")
   - "Hortencia" -> "Hortensia Guatemala" (Azul, Blanca, Morada)
   - "Margarita naranja" -> "Margaritas anaranjadas"
   - "Pompón con punto negro" -> "Panda Blanco"
   - "Pompón morado lila" -> "Pompones Morado"
   - "Estaticia" / "Estáticia" / "Estatice" / "Statice" -> "Estaticia"
   - "Eucalipto" (sin especificar dólar o silver) -> "Eucalipto Normal"
   - "Dollar" / "Dolar" -> "Eucalipto Dólar"
   - "Cris G." / "Cris." -> "Crisantemo"
   - "Baby Ecuador" / "Baby" -> "Baby Ecuador"
   - "Mini Clavel" / "Miniclavel" -> "Miniclavel"
   - "Girasol" -> "Girasoles"
   - "Ponda Rosado" / "Pompon Rosado" -> "Pompones"
   - "Gerbera" -> "Gerberas"
   - "Ruscus" -> "Ruscus"
4. VERIFICACIÓN MATEMÁTICA DE FILAS (CANT. x P. UNIT. = TOTAL):
   - En talonarios manuscritos hay columnas: CANT. | DESCRIPCIÓN | P. UNIT. | TOTAL.
   - SIEMPRE verifica la columna TOTAL de cada fila: si CANT * P. UNIT no coincide con el TOTAL escrito en esa fila, pero TOTAL / CANT da un número redondo coherente, usa (TOTAL / CANT) como precioUnitario.
   - Si el texto es una lista de WhatsApp que NO trae precios escritos, pon precioUnitario: 0 para usar el precio oficial del catálogo.
5. CRUCE CON CATÁLOGO:
   - Si el producto coincide con uno del CATÁLOGO DE INVENTARIO listado abajo, coloca su ID exacto en "productoId" y usa su nombre en "descripcion".
6. CLIENTE Y CONDICIÓN DE PAGO:
   - Extrae "clienteNombre" del campo "Nombre:" del talonario y "clienteDireccion" del campo "Dirección:".
   - Si dice "Crédito", devuelve "condicionPago": "credito". De lo contrario, "contado".
${catalogoTexto}
`;

      const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
      let response: any = null;
      let lastError: any = null;

      const parts: any[] = [];
      if (text) {
        const numberedLines = String(text)
          .split(/\r?\n/)
          .map((l: string) => l.trim())
          .filter(Boolean)
          .map((l: string, i: number) => `[Línea ${i + 1}] ${l}`)
          .join('\n');
        parts.push({ text: `Texto ingresado (respeta el orden exacto de cada línea):\n\n${numberedLines}` });
      } else {
        parts.push({ text: 'Analiza detalladamente la imagen de esta factura/pedido manuscrito, interpreta todas las filas en su orden exacto de arriba hacia abajo, expande comillas de repetición, verifica CANT x P.UNIT = TOTAL y cruza con el catálogo.' });
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
                        orden: { type: Type.NUMBER },
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

      rawResult = JSON.parse(response.text);
      if (Array.isArray(rawResult.items)) {
        rawResult.items = rawResult.items
          .map((it: any, idx: number) => ({
            ...it,
            orden: typeof it.orden === 'number' ? it.orden : idx
          }))
          .sort((a: any, b: any) => a.orden - b.orden);
      }
    }

    const catalogById = new Map<string, any>();
    for (const c of productosCatalogo) {
      if (c.id) catalogById.set(c.id, c);
      if (c.productoId) catalogById.set(c.productoId, c);
      if (c.activoId) catalogById.set(c.activoId, c);
    }

    // Enriquecer cada ítem preservando el orden exacto
    const enrichedItems = (rawResult.items || []).map((item: any, idx: number) => {
      const rawDesc = (item.descripcionOriginal || item.descripcion || '').trim();
      const cleanDesc = cleanWhatsAppItemDesc(item.descripcion || rawDesc);

      // Preferir siempre nuestro matcher determinista sobre el texto original de la línea
      let matchedProd = findBestCatalogMatch(rawDesc || cleanDesc, productosCatalogo);
      if (!matchedProd && item.productoId) {
        matchedProd = catalogById.get(item.productoId) || null;
      }

      const finalDesc = matchedProd?.nombre || cleanDesc || rawDesc || 'Flor / Follaje';
      const userPrice = Number(item.precioUnitario) || 0;
      const catalogPrice = matchedProd ? Number(matchedProd.precioVenta || 0) : 0;

      return {
        orden: idx,
        productoId: matchedProd?.productoId || undefined,
        activoId: matchedProd?.activoId || undefined,
        sku: matchedProd?.sku || '',
        descripcion: finalDesc,
        descripcionOriginal: rawDesc || finalDesc,
        descripcionLarga: matchedProd?.descripcion || '',
        cantidad: Math.max(1, Number(item.cantidad) || 1),
        precioUnitario: userPrice > 0 ? userPrice : catalogPrice,
        precioManual: userPrice > 0,
        imageUrl: matchedProd?.imagenWeb || undefined
      };
    });

    // Buscar si el cliente detectado existe en la base de datos
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
