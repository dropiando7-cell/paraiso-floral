import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { analizarIntencionVoz } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        // 1. Autenticación
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, organizationId: true }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no registrado en la base de datos' }, { status: 404 });
        }

        const { organizationId, id: userId } = dbUser;

        // 2. Leer texto
        const { text, currentItems } = await req.json();
        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'El texto de la transcripción es requerido.' }, { status: 400 });
        }

        // 3. Procesar intención con Gemini 2.5 Flash
        const intent = await analizarIntencionVoz(text, currentItems);

        // 4. Mapear Cliente en base de datos
        let matchedClient = null;
        if (intent.clienteNombre && intent.clienteNombre.toLowerCase() !== 'consumidor final') {
            // Búsqueda aproximada en la tabla Cliente
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
                    rtn: clientes[0].rtn || '',
                    telefono: clientes[0].telefono || '',
                    direccion: clientes[0].direccion || '',
                    found: true
                };
            }
        }

        if (!matchedClient) {
            // Cliente genérico o no encontrado
            matchedClient = {
                id: '',
                nombre: intent.clienteNombre || 'Consumidor Final',
                found: false
            };
        }

        // 5. Mapear Productos en el Inventario (Productos y Activos Fijos)
        const processedItems = [];
        const itemsToProcess = intent.items || [];
        for (const item of itemsToProcess) {
            // Buscar en Productos (Sku o Nombre)
            const prod = await prisma.producto.findFirst({
                where: {
                    organizationId,
                    estado: 'ACTIVO',
                    nombre: { contains: item.nombre, mode: 'insensitive' }
                }
            });

            if (prod) {
                processedItems.push({
                    found: true,
                    name: prod.nombre,
                    quantity: item.cantidad,
                    price: item.precioVenta || Number(prod.precioVenta),
                    cost: item.costoBase || Number(prod.costoBase || 0),
                    type: 'producto',
                    productoId: prod.id,
                    sku: prod.sku,
                    stockActual: prod.stockActual,
                    isUpdate: item.isUpdate || false,
                    isDelete: item.isDelete || false,
                    descuento: item.descuento || 0
                });
                continue;
            }

            // Buscar en Activos Fijos
            const activo = await prisma.activoFijo.findFirst({
                where: {
                    organizationId,
                    estatusContable: 'VIGENTE',
                    descripcionCorta: { contains: item.nombre, mode: 'insensitive' }
                },
                include: { producto: true }
            });

            if (activo) {
                const price = item.precioVenta || Number(activo.producto?.precioVenta || activo.costoAdq || 0);
                processedItems.push({
                    found: true,
                    name: activo.descripcionCorta,
                    quantity: item.cantidad,
                    price,
                    cost: item.costoBase || Number(activo.costoAdq || 0),
                    type: 'activo',
                    activoId: activo.id,
                    sku: activo.idQr,
                    stockActual: activo.stock,
                    isUpdate: item.isUpdate || false,
                    isDelete: item.isDelete || false,
                    descuento: item.descuento || 0
                });
                continue;
            }

            // Item no encontrado
            processedItems.push({
                found: false,
                name: item.nombre,
                quantity: item.cantidad,
                price: item.precioVenta || 0,
                cost: item.costoBase || 0,
                type: 'nuevo',
                isUpdate: item.isUpdate || false,
                isDelete: item.isDelete || false,
                descuento: item.descuento || 0
            });
        }

        // 6. Trazabilidad: Registrar en AsistenteVozLog
        const log = await prisma.asistenteVozLog.create({
            data: {
                organizationId,
                transcripcion: text,
                intentDetectado: JSON.parse(JSON.stringify(intent)),
                creadoPorId: userId,
                estado: 'PROCESADO'
            }
        });

        // 7. Retornar Respuesta
        return NextResponse.json({
            success: true,
            action: intent.action,
            nuevoTipoDocumento: intent.nuevoTipoDocumento,
            notasDocumento: intent.notasDocumento,
            terminosPago: intent.terminosPago,
            metodoPago: intent.metodoPago,
            client: matchedClient,
            items: processedItems,
            logId: log.id
        });

    } catch (error: any) {
        console.error("Error en API de Asistente de Voz:", error);
        return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
