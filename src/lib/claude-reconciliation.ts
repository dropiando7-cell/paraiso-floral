import Anthropic from '@anthropic-ai/sdk';
import type { TemplateReconciliationData } from './fill-template';

export type { TemplateReconciliationData };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un contador experto en conciliaciones bancarias para organizaciones religiosas sin fines de lucro (iglesias).
Tu tarea es analizar los documentos financieros proporcionados y generar una conciliación bancaria usando el formato exacto requerido.

INSTRUCCIONES:
1. Analiza el estado de cuenta bancario Y el auxiliar contable
2. Identifica las 4 categorías de diferencias:
   - debitos_libros_no_banco: Depósitos/débitos registrados en libros pero que NO aparecen en el banco (tránsito)
   - creditos_libros_no_banco: Créditos/cheques emitidos en libros pero que NO han sido cobrados en el banco (cheques en circulación)
   - debitos_banco_no_libros: Cargos/débitos del banco que NO están en libros (ND bancarios, comisiones no registradas)
   - creditos_banco_no_libros: Abonos del banco que NO están en libros (NC bancarios, intereses no registrados)
3. Extrae los saldos exactos de los documentos
4. Usa fechas en formato DD/MM/YYYY
5. Todos los montos deben ser NUMÉRICOS (sin símbolo de moneda)
6. Si no encuentras información suficiente, pon valores 0 y explica en observaciones

FORMATO DE RESPUESTA: JSON válido únicamente, sin texto adicional ni markdown.`;

export async function generateReconciliation(
  fileContent: string,
  banco: string,
  tipoCuenta: string,
  month: string,
  year: string,
  fileNames: string[]
): Promise<TemplateReconciliationData> {
  const MONTH_NAMES: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
  };
  const monthName = MONTH_NAMES[month] ?? month;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const fechaConciliacion = `${lastDay.toString().padStart(2, '0')}/${month}/${year}`;

  const userPrompt = `Genera la conciliación bancaria con los siguientes parámetros:

INSTITUCIÓN: Iglesia Misión Cristiana Elim Honduras
BANCO: ${banco}
TIPO DE CUENTA: ${tipoCuenta}
PERÍODO: ${monthName} ${year}
ARCHIVOS ANALIZADOS: ${fileNames.join(', ')}

CONTENIDO DE LOS ARCHIVOS:
${fileContent}

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{
  "informacion_general": {
    "banco_nombre": "${banco}",
    "cuenta_numero": "[número de cuenta del estado de cuenta]",
    "fecha_conciliacion": "${fechaConciliacion}",
    "moneda": "HNL",
    "saldo_banco": [saldo final según extracto bancario, número],
    "saldo_libros": [saldo según auxiliar contable/libros, número]
  },
  "debitos_libros_no_banco": [
    {
      "fecha": "DD/MM/YYYY",
      "referencia": "DEP-001",
      "descripcion": "Descripción del depósito en tránsito",
      "monto": 0.00
    }
  ],
  "creditos_libros_no_banco": [
    {
      "fecha": "DD/MM/YYYY",
      "referencia": "CHQ-001",
      "descripcion": "Cheque No. XXXX pendiente de cobro",
      "monto": 0.00
    }
  ],
  "debitos_banco_no_libros": [
    {
      "fecha": "DD/MM/YYYY",
      "referencia": "ND-001",
      "descripcion": "Comisión bancaria / cargo no registrado",
      "monto": 0.00
    }
  ],
  "creditos_banco_no_libros": [
    {
      "fecha": "DD/MM/YYYY",
      "referencia": "NC-001",
      "descripcion": "Intereses / abono no registrado",
      "monto": 0.00
    }
  ],
  "autorizaciones": {
    "elaborado_nombre": "Sistema IA - Elim Honduras",
    "elaborado_fecha": "${fechaConciliacion}"
  }
}`;

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textContent = message.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude no retornó texto');
  }

  let jsonText = textContent.text.trim();
  // Strip markdown if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonText = jsonMatch[1];

  try {
    return JSON.parse(jsonText) as TemplateReconciliationData;
  } catch {
    throw new Error(`No se pudo parsear JSON de Claude: ${jsonText.substring(0, 300)}`);
  }
}
