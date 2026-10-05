import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clave GEMINI_API_KEY no configurada' }, { status: 500 });
    }

    // 2. Extraer archivo de FormData o payload JSON
    const contentType = req.headers.get('content-type') || '';
    let base64Data = '';
    let mimeType = 'image/jpeg';
    let originalName = 'factura.jpg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file || file.size === 0) {
        return NextResponse.json({ error: 'Debe adjuntar una imagen o PDF de la factura' }, { status: 400 });
      }

      originalName = file.name;
      mimeType = file.type || (originalName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const json = await req.json();
      if (!json.base64) {
        return NextResponse.json({ error: 'Se requiere archivo o base64' }, { status: 400 });
      }
      base64Data = json.base64.replace(/^data:image\/\w+;base64,/, '');
      mimeType = json.mimeType || 'image/jpeg';
    }

    // 3. Inicializar Gemini AI
    const genai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Eres un asistente contable y fiscal experto en auditoría de facturas, recibos térmicos y comprobantes de compras para Distribuidora Paraíso Floral en Honduras.
Tu trabajo es examinar minuciosamente el documento (factura SAR electrónica, recibo de caja, ticket térmico de gasolinera o ferretería, invoice internacional de floristería) y extraer con la máxima exactitud los datos numéricos y de emisor.

REGLAS DE EXTRACCIÓN FISCAL:
1. PROVEEDOR: Nombre comercial o Razón Social del emisor (ej: "ESTACION TEXACO EL CARMEN", "SUPERMERCADOS LA COLONIA", "FLOREQUISA", "FERRETERIA LARACH", "DILASA", "ENEE / EEH", etc.).
2. RTN: El Registro Tributario Nacional de 14 dígitos (ej: "08011990123456"). Si no aparece, null.
3. FACTURA: Número de documento o correlativo fiscal SAR (ej: "000-001-01-00045231" o número de ticket). Si no hay, genera null.
4. FECHA: Fecha de emisión en formato YYYY-MM-DD. Si no se indica año, asume el año 2026. Si no se puede leer, usa la fecha de hoy.
5. CATEGORÍA: Clasifica estrictamente en una de las siguientes opciones según el concepto:
   - "FLORES_IMPORTACION" (rosas, gypsophila, claveles, follajes de fincas o proveedores de flores)
   - "INSUMOS_FLORISTERIA" (bases de madera, esponja floral oasis, listones, celofán, herramientas)
   - "FLETES_TRANSPORTE" (encomiendas, fletes de carga, DHL, envíos aéreos o terrestres)
   - "COMBUSTIBLE" (gasolina, diésel, lubricantes en gasolineras)
   - "SERVICIOS_PUBLICOS" (energía eléctrica, agua, internet, telefonía)
   - "GASTOS_OPERATIVOS" (papelería, empaques, limpieza, ferretería, mantenimiento de cuarto frío)
   - "ALIMENTACION_VIATICOS" (comidas de personal en ruta, viáticos)
   - "OTROS" (cualquier otro gasto)
6. IMPORTES (En Lempiras HNL):
   - exenta: Monto de compras exentas de impuesto (0 si no hay o si toda la compra es gravada).
   - gravada: Subtotal gravado al 15% (antes del impuesto).
   - isv15: Importe del Impuesto Sobre Ventas 15%. (Verifica matemáticamente: gravada * 0.15 aprox).
   - total: Gran Total pagado. IMPORTANTE: En la mayoría de los casos total = exenta + gravada + isv15.
7. DESCRIPCIÓN: Resumen conciso y claro de lo comprado (ej: "Gasolina Super para camión de reparto", "3 cajas de Oasis Maxlife y listón rojo", "Compra de insumos de empaque").
8. CONFIANZA: 'ALTA' si la imagen es nítida, 'MEDIA' si es legible con dudas menores, 'BAJA' si está muy borrosa o rota.
`;

    const candidateModels = [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash'
    ];

    let response: any = null;
    let lastError: any = null;

    const contentInput = [
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      "Analiza esta factura o recibo de compra y extrae los datos contables y fiscales según las instrucciones."
    ];

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
                proveedor: { type: Type.STRING },
                rtn: { type: Type.STRING },
                factura: { type: Type.STRING },
                fecha: { type: Type.STRING },
                categoria: { 
                  type: Type.STRING,
                  enum: [
                    'FLORES_IMPORTACION',
                    'INSUMOS_FLORISTERIA',
                    'FLETES_TRANSPORTE',
                    'COMBUSTIBLE',
                    'SERVICIOS_PUBLICOS',
                    'GASTOS_OPERATIVOS',
                    'ALIMENTACION_VIATICOS',
                    'OTROS'
                  ]
                },
                exenta: { type: Type.NUMBER },
                gravada: { type: Type.NUMBER },
                isv15: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
                descripcion: { type: Type.STRING },
                confianza: { type: Type.STRING, enum: ['ALTA', 'MEDIA', 'BAJA'] }
              },
              required: ['proveedor', 'fecha', 'total', 'descripcion', 'categoria']
            }
          }
        });

        if (response?.text) break;
      } catch (err: any) {
        console.warn(`Modelo ${modelName} no disponible, intentando fallback...`, err?.message || err);
        lastError = err;
      }
    }

    if (!response?.text) {
      throw lastError || new Error('No se pudo obtener respuesta del modelo de visión de IA');
    }

    const parsedData = JSON.parse(response.text);

    // Normalizar números para evitar NaN
    parsedData.exenta = Number(parsedData.exenta || 0);
    parsedData.gravada = Number(parsedData.gravada || 0);
    parsedData.isv15 = Number(parsedData.isv15 || 0);
    parsedData.total = Number(parsedData.total || 0);

    // Si total es 0 pero hay gravada + isv
    if (parsedData.total === 0 && (parsedData.gravada > 0 || parsedData.exenta > 0)) {
      parsedData.total = parsedData.exenta + parsedData.gravada + parsedData.isv15;
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      preview: {
        originalName,
        mimeType
      }
    });

  } catch (error: any) {
    console.error('Error en escaneo de factura por IA:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la factura con IA' 
    }, { status: 500 });
  }
}
