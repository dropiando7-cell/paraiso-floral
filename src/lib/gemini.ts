import { GoogleGenAI, Type } from '@google/genai';

export interface VoiceIntentResponse {
    action: 'CREATE_COTIZACION' | 'CREATE_FACTURA' | 'CHECK_INVENTORY' | 'CLEAR_DOCUMENT' | 'CHANGE_DOC_TYPE';
    clienteNombre?: string;
    notasDocumento?: string;
    terminosPago?: 'Pago inmediato' | '15 dias netos' | '30 dias netos' | '60 dias netos' | '90 dias netos';
    metodoPago?: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Cheque' | 'Link de pago';
    nuevoTipoDocumento?: 'cotizacion' | 'factura' | 'proforma';
    items: {
        nombre: string;
        cantidad: number;
        precioVenta?: number;
        costoBase?: number;
        isUpdate?: boolean;
        isDelete?: boolean;
        descuento?: number;
    }[];
}

export async function analizarIntencionVoz(transcripcion: string, currentItems?: any[]): Promise<VoiceIntentResponse> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("La clave de API de Gemini (GEMINI_API_KEY) no está configurada en las variables de entorno.");
    }
    const genai = new GoogleGenAI({ apiKey: key });


    const systemInstruction = `
Eres el Asistente de Voz Inteligente del ERP de Distribuidora Paraíso Floral. Tu rol es analizar las transcripciones de las órdenes dictadas por voz del administrador y estructurarlas en un formato JSON limpio.

Las transcripciones suelen ser en español y referirse a crear cotizaciones ("cotiza", "cotización", "haz una cotización") o facturas ("factura", "haz una factura", "cóbrale").
Identifica el cliente (clienteNombre) y la lista de ítems (nombre, cantidad, precioVenta sugerido si se menciona, costoBase si se menciona).

REGLAS DE CORRECCIÓN DE VOZ (MUY IMPORTANTE):
- Si el usuario dicta algo que suena como "solido gago", "solido y gago" o similar, asume que se refiere a la flor "SOLIDAGO".
- Si el usuario dice "rosa rosada", usa exactamente "rosa rosada". Evita inventar "mini rosa rosada" a menos que escuches "mini".
- Siempre intenta relacionar los términos con arreglos florales, flores (rosas, girasoles, claveles, espuma floral, etc.) y suministros de floristería.

Por ejemplo:
- "Cotízale a Juan Pérez tres paquetes de solido gago y una espuma floral"
  Debe resultar en:
  action: "CREATE_COTIZACION"
  clienteNombre: "Juan Pérez"
  items: [{ nombre: "solidago", cantidad: 3 }, { nombre: "espuma floral", cantidad: 1 }]

- "Haz una factura para Carlos Gómez de dos arreglos de rosas a 1500 cada uno"
  Debe resultar en:
  action: "CREATE_FACTURA"
  clienteNombre: "Carlos Gómez"
  items: [{ nombre: "arreglo de rosas", cantidad: 2, precioVenta: 1500 }]

- "Quita el solidago"
  Debe resultar en:
  items: [{ nombre: "solidago", cantidad: 0, isDelete: true }]

- "Aplica 10 de descuento a las rosas"
  Debe resultar en:
  items: [{ nombre: "rosas", cantidad: 1, isUpdate: true, descuento: 10 }]

- "Ponle pago inmediato y transferencia"
  Debe resultar en:
  terminosPago: "Pago inmediato", metodoPago: "Transferencia"

${currentItems && currentItems.length > 0 ? `ACTUALMENTE LA FACTURA TIENE ESTOS ÍTEMS: ${JSON.stringify(currentItems)}
Si el usuario dice "agrega otro solidago", significa sumar 1 a la cantidad actual. Devuelve la cantidad TOTAL final (ej. si había 1, devuelve 2) y "isUpdate": true.
Si el usuario dice "cambia la cantidad de solidago a 2", devuelve la cantidad final a 2 y "isUpdate": true.
Si el usuario cambia el precio, devuélvelo en precioVenta y "isUpdate": true.
Si el usuario pide borrar un ítem, devuelve "isDelete": true.` : ''}
`;

    try {
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
        let response: any = null;
        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                response = await genai.models.generateContent({
                    model: modelName,
                    contents: transcripcion,
                    config: {
                        systemInstruction,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                action: {
                                    type: Type.STRING,
                                    enum: ['CREATE_COTIZACION', 'CREATE_FACTURA', 'CHECK_INVENTORY', 'CLEAR_DOCUMENT', 'CHANGE_DOC_TYPE']
                                },
                                clienteNombre: { type: Type.STRING },
                                notasDocumento: { type: Type.STRING },
                                terminosPago: { type: Type.STRING, enum: ['Pago inmediato', '15 dias netos', '30 dias netos', '60 dias netos', '90 dias netos'] },
                                metodoPago: { type: Type.STRING, enum: ['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago'] },
                                nuevoTipoDocumento: { type: Type.STRING, enum: ['cotizacion', 'factura', 'proforma'] },
                                items: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            nombre: { type: Type.STRING },
                                            cantidad: { type: Type.INTEGER },
                                            precioVenta: { type: Type.NUMBER },
                                            costoBase: { type: Type.NUMBER },
                                            isUpdate: { type: Type.BOOLEAN },
                                            isDelete: { type: Type.BOOLEAN },
                                            descuento: { type: Type.NUMBER }
                                        },
                                        required: ['nombre']
                                    }
                                }
                            },
                            required: ['action'] // Todo lo demás es opcional dependiendo de la orden
                        }
                    }
                });

                if (response?.text) break;
            } catch (err: any) {
                console.warn(`Modelo ${modelName} ocupado, probando fallback...`, err?.message || err);
                lastError = err;
            }
        }

        if (!response?.text) {
            throw lastError || new Error("No se obtuvo respuesta del modelo de IA.");
        }

        return JSON.parse(response.text) as VoiceIntentResponse;
    } catch (e: any) {
        console.error("Error en analizarIntencionVoz:", e);
        throw e;
    }
}
