import { analizarIntencionVoz } from '../src/lib/gemini';
import { prisma } from '../src/lib/prisma';

// Configurar variables de entorno si es necesario
process.env.GEMINI_API_KEY = "AQ.Ab8RN6IucU0r_c0etYiEizbJCLvyMuG2gsHKslvfY3jXp5Iq5g";

async function test() {
    console.log("=== INICIANDO PRUEBA LOCAL DE ASISTENTE DE VOZ ===");
    
    // Transcripción de prueba simulando la voz de Manuel
    const testTranscript = "Cotízale a Manuel Tejada 2 monitores de signos vitales y un equipo que no existe de prueba con precio de 5000 y costo de 3000";
    console.log(`Entrada de dictado: "${testTranscript}"`);

    try {
        console.log("1. Interpretando intención con Gemini...");
        const intent = await analizarIntencionVoz(testTranscript);
        console.log("Intención interpretada:", JSON.stringify(intent, null, 2));

        // 2. Simular mapeo de base de datos
        console.log("\n2. Mapeando cliente en base de datos...");
        const orgs = await prisma.organization.findMany({ take: 1 });
        if (orgs.length === 0) {
            console.log("No hay organizaciones en la base de datos para probar.");
            return;
        }
        const organizationId = orgs[0].id;
        console.log(`Usando Organization ID: ${organizationId}`);

        let matchedClient = null;
        if (intent.clienteNombre) {
            const clientes = await prisma.cliente.findMany({
                where: {
                    organizationId,
                    nombre: { contains: intent.clienteNombre, mode: 'insensitive' }
                },
                take: 1
            });
            if (clientes.length > 0) {
                matchedClient = {
                    id: clientes[0].id,
                    nombre: clientes[0].nombre,
                    found: true
                };
            }
        }
        
        console.log("Cliente mapeado:", matchedClient || "Ninguno encontrado (Consumidor Final)");

        console.log("\n3. Mapeando productos en inventario...");
        for (const item of intent.items) {
            const prod = await prisma.producto.findFirst({
                where: {
                    organizationId,
                    estado: 'ACTIVO',
                    nombre: { contains: item.nombre, mode: 'insensitive' }
                }
            });

            if (prod) {
                console.log(`[ENCONTRADO] Ítem: "${item.nombre}" -> Producto SKU: ${prod.sku}, Stock: ${prod.stockActual}`);
            } else {
                console.log(`[NUEVO] Ítem: "${item.nombre}" -> No existe en el ERP. Se marcará para creación supervisada.`);
            }
        }

        console.log("\n=== PRUEBA DE CONEXIÓN E INTEGRACIÓN FINALIZADA CON ÉXITO ===");
    } catch (error) {
        console.error("Error durante la ejecución del test:", error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
