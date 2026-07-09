import { GoogleGenAI, Type } from '@google/genai';

export interface VoiceIntentResponse {
    action: 'CREATE_COTIZACION' | 'CREATE_FACTURA' | 'CHECK_INVENTORY';
    clienteNombre: string;
    items: {
        nombre: string;
        cantidad: number;
        precioVenta?: number;
        costoBase?: number;
    }[];
}

export async function analizarIntencionVoz(transcripcion: string): Promise<VoiceIntentResponse> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("La clave de API de Gemini (GEMINI_API_KEY) no está configurada en las variables de entorno.");
    }
    const genai = new GoogleGenAI({ apiKey: key });


    const systemInstruction = `
Eres el Asistente de Voz Inteligente del ERP de Bioelectrónica Honduras. Tu rol es analizar las transcripciones de las órdenes dictadas por voz del gerente Manuel Tejada y estructurarlas en un formato JSON limpio.

Las transcripciones suelen ser en español y referirse a crear cotizaciones ("cotiza", "cotización", "haz una cotización") o facturas ("factura", "haz una factura", "cóbrale").
Identifica el cliente (clienteNombre) y la lista de ítems (nombre, cantidad, precioVenta sugerido si se menciona, costoBase si se menciona).

Por ejemplo:
- "Cotízale a Juan Pérez un monitor de signos vitales y un sensor de oxígeno"
  Debe resultar en:
  action: "CREATE_COTIZACION"
  clienteNombre: "Juan Pérez"
  items: [{ nombre: "monitor de signos vitales", cantidad: 1 }, { nombre: "sensor de oxígeno", cantidad: 1 }]

- "Haz una factura para Carlos Gómez de dos baterías de 12 voltios a 1500 cada una"
  Debe resultar en:
  action: "CREATE_FACTURA"
  clienteNombre: "Carlos Gómez"
  items: [{ nombre: "batería de 12 voltios", cantidad: 2, precioVenta: 1500 }]
`;

    try {
        const response = await genai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: transcripcion,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: {
                            type: Type.STRING,
                            enum: ['CREATE_COTIZACION', 'CREATE_FACTURA', 'CHECK_INVENTORY']
                        },
                        clienteNombre: { type: Type.STRING },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    nombre: { type: Type.STRING },
                                    cantidad: { type: Type.INTEGER },
                                    precioVenta: { type: Type.NUMBER },
                                    costoBase: { type: Type.NUMBER }
                                },
                                required: ['nombre', 'cantidad']
                            }
                        }
                    },
                    required: ['action', 'clienteNombre', 'items']
                }
            }
        });

        if (!response.text) {
            throw new Error("No se obtuvo respuesta del modelo de IA.");
        }

        return JSON.parse(response.text) as VoiceIntentResponse;
    } catch (e: any) {
        console.error("Error en analizarIntencionVoz:", e);
        throw e;
    }
}
