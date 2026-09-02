'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { formatNombreProductoRecepcion } from '@/utils/recepcionHelpers';

async function getAuthContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, nombre: true, apellido: true, organizationId: true, role: true, customRoleName: true, accessibleModules: true },
    });
    if (!dbUser) redirect('/unauthorized');

    const allowed = dbUser.role === 'SUPER_ADMIN' || 
                    dbUser.role === 'ORG_ADMIN' || 
                    dbUser.role === 'INVENTARIO_EDITOR' ||
                    dbUser.role === 'GERENTE' ||
                    dbUser.role === 'AUXILIAR_BODEGA' ||
                    dbUser.role === 'RECEPCION' ||
                    (dbUser.customRoleName || '').toUpperCase().includes('GEREN') ||
                    (dbUser.customRoleName || '').toUpperCase().includes('BODEG') ||
                    (dbUser.accessibleModules || []).includes('/inventario') ||
                    (dbUser.accessibleModules || []).includes('/inventario/recepcion');

    if (!allowed) redirect('/unauthorized');

    return dbUser;
}

// 1. Obtener listado de lotes de recepción
export async function getLotesRecepcion() {
    try {
        const user = await getAuthContext();

        const lotes = await prisma.recepcionLote.findMany({
            where: { organizationId: user.organizationId },
            include: {
                cajas: {
                    select: {
                        id: true,
                        numeroCaja: true,
                        estado: true,
                        items: {
                            select: {
                                descripcion: true,
                                cultivoOriginal: true,
                                bonchesEsperados: true,
                                bonchesRecibidos: true,
                                bonchesDanados: true,
                                verificado: true,
                                activoFijo: {
                                    select: {
                                        descripcionCorta: true,
                                        idQr: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return {
            success: true,
            lotes: JSON.parse(JSON.stringify(lotes.map(l => {
                let itemsTotal = 0;
                let itemsVerificados = 0;
                let totalDanados = 0;
                const productosSet = new Set<string>();

                l.cajas.forEach(c => {
                    c.items.forEach(i => {
                        itemsTotal++;
                        if (i.verificado) itemsVerificados++;
                        totalDanados += i.bonchesDanados || 0;
                        if (i.descripcion) productosSet.add(i.descripcion);
                        if (i.cultivoOriginal) productosSet.add(i.cultivoOriginal);
                        if (i.activoFijo?.descripcionCorta) productosSet.add(i.activoFijo.descripcionCorta);
                        if (i.activoFijo?.idQr) productosSet.add(i.activoFijo.idQr);
                    });
                });

                const porcentaje = itemsTotal > 0 ? Math.round((itemsVerificados / itemsTotal) * 100) : 0;

                return {
                    id: l.id,
                    numeroEnvio: l.numeroEnvio,
                    proveedor: l.proveedor,
                    estado: l.estado,
                    totalCajas: l.totalCajas,
                    cajasVerificadas: l.cajas.filter(c => c.estado === 'VERIFICADA').length,
                    totalBonches: l.totalBonches,
                    totalDanados,
                    itemsTotal,
                    itemsVerificados,
                    productosLista: Array.from(productosSet),
                    porcentaje,
                    fechaLlegada: l.fechaLlegada,
                    createdAt: l.createdAt
                };
            })))
        };
    } catch (error: any) {
        console.error('Error al obtener lotes de recepción:', error);
        return { success: false, error: error.message || 'Error cargando recepciones.' };
    }
}

// 2. Obtener detalle de un lote específico con cálculo de resumen de discrepancias
export async function getLoteRecepcionDetalle(loteId: string) {
    try {
        const user = await getAuthContext();

        const lote = await prisma.recepcionLote.findUnique({
            where: { id: loteId },
            include: {
                cajas: {
                    orderBy: { numeroCaja: 'asc' },
                    include: {
                        items: {
                            orderBy: { descripcion: 'asc' },
                            include: {
                                activoFijo: {
                                    select: {
                                        id: true,
                                        idQr: true,
                                        codigoBarras: true,
                                        descripcionCorta: true,
                                        stock: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!lote || lote.organizationId !== user.organizationId) {
            throw new Error('Lote de recepción no encontrado.');
        }

        // Calcular discrepancias y mermas para el resumen
        let totalBonchesEsperados = 0;
        let totalBonchesRecibidos = 0;
        let totalBonchesDanados = 0;
        const discrepancias: any[] = [];

        lote.cajas.forEach(caja => {
            caja.items.forEach(item => {
                totalBonchesEsperados += item.bonchesEsperados;
                totalBonchesRecibidos += item.bonchesRecibidos;
                totalBonchesDanados += item.bonchesDanados || 0;

                const diferencia = item.bonchesEsperados - item.bonchesRecibidos;
                const tieneDano = (item.bonchesDanados || 0) > 0;
                const tieneFaltante = diferencia !== 0;

                if (item.verificado && (tieneDano || tieneFaltante)) {
                    discrepancias.push({
                        cajaNumero: caja.numeroCaja,
                        codigoProveedor: caja.codigoProveedor,
                        descripcion: item.activoFijo?.descripcionCorta || item.descripcion,
                        idQr: item.activoFijo?.idQr || 'N/A',
                        bonchesEsperados: item.bonchesEsperados,
                        bonchesRecibidos: item.bonchesRecibidos,
                        bonchesDanados: item.bonchesDanados || 0,
                        motivoDano: item.motivoDano || null,
                        fotosDano: Array.isArray(item.fotosDano) ? item.fotosDano : [],
                        diferencia
                    });
                }
            });
        });

        const matcheoPerfecto = lote.cajas.every(c => c.items.every(i => i.verificado && i.bonchesRecibidos === i.bonchesEsperados && (i.bonchesDanados || 0) === 0));

        const usuarioNombre = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.id;

        return {
            success: true,
            usuarioNombre,
            lote: JSON.parse(JSON.stringify(lote)),
            resumen: JSON.parse(JSON.stringify({
                totalBonchesEsperados,
                totalBonchesRecibidos,
                totalBonchesDanados,
                matcheoPerfecto,
                discrepancias
            }))
        };
    } catch (error: any) {
        console.error('Error al obtener detalle del lote:', error);
        return { success: false, error: error.message || 'Error cargando detalle del lote.' };
    }
}

// 3. Marcar o desmarcar un item de caja individual (con daños/mermas)
export async function toggleVerificacionItem(
    itemId: string,
    verificado: boolean,
    tipoEmpaque?: string,
    bonchesRecibidos?: number,
    bonchesDanados?: number,
    motivoDano?: string,
    fotosDano?: string[],
    codigoBarras?: string
) {
    try {
        const user = await getAuthContext();

        const item = await prisma.recepcionItem.findUnique({
            where: { id: itemId },
            include: { caja: true }
        });

        if (!item) throw new Error('Item de recepción no encontrado.');

        const cantidad = bonchesRecibidos !== undefined ? bonchesRecibidos : (verificado ? item.bonchesEsperados : 0);
        const danados = bonchesDanados !== undefined ? bonchesDanados : 0;
        const empaque = tipoEmpaque || item.tipoEmpaque || 'Cartón';

        // Actualizar item
        await prisma.recepcionItem.update({
            where: { id: itemId },
            data: {
                verificado,
                bonchesRecibidos: cantidad,
                bonchesDanados: danados,
                motivoDano: motivoDano !== undefined ? motivoDano : item.motivoDano,
                fotosDano: fotosDano !== undefined ? (fotosDano as any) : (item.fotosDano ?? undefined),
                tipoEmpaque: empaque,
                codigoBarras: codigoBarras !== undefined ? codigoBarras : item.codigoBarras
            }
        });

        // Actualizar estado de la caja si todos sus items están verificados
        const itemsDeCaja = await prisma.recepcionItem.findMany({
            where: { cajaId: item.cajaId }
        });

        const todosVerificados = itemsDeCaja.every(i => i.verificado);
        const algunoVerificado = itemsDeCaja.some(i => i.verificado);

        let nuevoEstadoCaja = 'PENDIENTE';
        if (todosVerificados) nuevoEstadoCaja = 'VERIFICADA';
        else if (algunoVerificado) nuevoEstadoCaja = 'INCOMPLETA';

        await prisma.recepcionCaja.update({
            where: { id: item.cajaId },
            data: {
                estado: nuevoEstadoCaja,
                verificadaAt: todosVerificados ? new Date() : null,
                verificadaPorId: todosVerificados ? user.id : null
            }
        });

        // Actualizar estado del lote a EN_RECEPCION si estaba EN_TRANSITO (y no COMPLETADO)
        const loteActual = await prisma.recepcionLote.findUnique({
            where: { id: item.caja.recepcionId },
            select: { estado: true }
        });
        if (loteActual && loteActual.estado !== 'COMPLETADO' && loteActual.estado !== 'INGRESADO_CEDI') {
            await prisma.recepcionLote.update({
                where: { id: item.caja.recepcionId },
                data: { estado: 'EN_RECEPCION' }
            });
        }

        revalidatePath(`/inventario/recepcion/${item.caja.recepcionId}`);
        revalidatePath('/inventario/recepcion');

        return { success: true };
    } catch (error: any) {
        console.error('Error al actualizar item de recepción:', error);
        return { success: false, error: error.message || 'Error al actualizar item.' };
    }
}

// 4. Marcar toda una caja como verificada (o pendiente)
export async function verificarCajaCompleta(cajaId: string, verificado: boolean) {
    try {
        const user = await getAuthContext();

        const caja = await prisma.recepcionCaja.findUnique({
            where: { id: cajaId },
            include: { items: true, recepcion: { select: { estado: true } } }
        });

        if (!caja) throw new Error('Caja no encontrada.');

        await prisma.$transaction(async (tx) => {
            for (const item of caja.items) {
                await tx.recepcionItem.update({
                    where: { id: item.id },
                    data: {
                        verificado,
                        bonchesRecibidos: verificado ? item.bonchesEsperados : 0,
                        bonchesDanados: verificado ? item.bonchesDanados : 0
                    }
                });
            }

            await tx.recepcionCaja.update({
                where: { id: cajaId },
                data: {
                    estado: verificado ? 'VERIFICADA' : 'PENDIENTE',
                    verificadaAt: verificado ? new Date() : null,
                    verificadaPorId: verificado ? user.id : null
                }
            });

            if (caja.recepcion?.estado !== 'COMPLETADO' && caja.recepcion?.estado !== 'INGRESADO_CEDI') {
                await tx.recepcionLote.update({
                    where: { id: caja.recepcionId },
                    data: { estado: 'EN_RECEPCION' }
                });
            }
        });

        revalidatePath(`/inventario/recepcion/${caja.recepcionId}`);
        revalidatePath('/inventario/recepcion');

        return { success: true };
    } catch (error: any) {
        console.error('Error al verificar caja completa:', error);
        return { success: false, error: error.message || 'Error al verificar caja.' };
    }
}

// 5. Finalizar recepción de lote, abonar inventario y descontar mermas/dañados
export async function finalizarRecepcionLote(loteId: string) {
    try {
        const user = await getAuthContext();

        const lote = await prisma.recepcionLote.findUnique({
            where: { id: loteId },
            include: {
                cajas: {
                    include: {
                        items: {
                            include: {
                                activoFijo: true
                            }
                        }
                    }
                }
            }
        });

        if (!lote || lote.organizationId !== user.organizationId) {
            throw new Error('Lote no encontrado.');
        }

        if (lote.estado === 'COMPLETADO' || lote.estado === 'INGRESADO_CEDI') {
            throw new Error('Este lote ya fue ingresado al CEDI previamente. No se puede duplicar la carga de stock.');
        }

        await prisma.$transaction(async (tx) => {
            for (const caja of lote.cajas) {
                for (const item of caja.items) {
                    if (item.verificado && item.activoFijoId) {
                        const activo = item.activoFijo;
                        if (!activo) continue;

                        const netoRecibido = Math.max(0, item.bonchesRecibidos - (item.bonchesDanados || 0));

                        // 1. Incrementar stock neto disponible en ActivoFijo
                        if (netoRecibido > 0) {
                            await tx.activoFijo.update({
                                where: { id: item.activoFijoId },
                                data: {
                                    stock: { increment: netoRecibido },
                                    lote: lote.numeroEnvio,
                                    tipoEmpaque: item.tipoEmpaque || 'Cartón',
                                    estatusContable: 'VIGENTE',
                                    ...(item.codigoBarras ? { codigoBarras: item.codigoBarras } : {})
                                }
                            });

                            if (activo.productoId) {
                                await tx.producto.update({
                                    where: { id: activo.productoId },
                                    data: { stockActual: { increment: netoRecibido } }
                                });

                                await tx.movimientoInventario.create({
                                    data: {
                                        organizationId: user.organizationId,
                                        productoId: activo.productoId,
                                        tipoMovimiento: 'ENTRADA',
                                        cantidad: netoRecibido,
                                        motivo: `Recepción Packing List ${lote.proveedor} (Caja ${caja.numeroCaja})`,
                                        referencia: `ENVIO ${lote.numeroEnvio}`,
                                        usuarioId: user.id
                                    }
                                });
                            }
                        }

                        // 2. Si hubo producto dañado / merma en recepción, registrar el reporte de merma
                        if ((item.bonchesDanados || 0) > 0 && activo.productoId) {
                            await tx.movimientoInventario.create({
                                data: {
                                    organizationId: user.organizationId,
                                    productoId: activo.productoId,
                                    tipoMovimiento: 'MERMA',
                                    cantidad: item.bonchesDanados,
                                    motivo: `Merma en Recepción de Lote ${lote.numeroEnvio}: ${item.motivoDano || 'Producto dañado/mal estado al recibir'}`,
                                    referencia: `ENVIO ${lote.numeroEnvio}`,
                                    usuarioId: user.id
                                }
                            });
                        }
                    }
                }
            }

            // Cambiar estado del lote a COMPLETADO
            await tx.recepcionLote.update({
                where: { id: loteId },
                data: { estado: 'COMPLETADO' }
            });
        });

        revalidatePath('/inventario');
        revalidatePath('/inventario/recepcion');
        revalidatePath(`/inventario/recepcion/${loteId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Error al finalizar recepción del lote:', error);
        return { success: false, error: error.message || 'Error al finalizar la recepción.' };
    }
}

// 6. Imprimir etiquetas de una caja específica con pre-visualización y soporte de código 1D
export async function encolarImpresionCaja(
    cajaId: string, 
    impresora: string = 'Vorttek', 
    tamano: string = '50x25',
    itemsCustom?: Array<{ idQr: string; descripcion: string; codigoBarras: string; cantidad: number; activoFijoId?: string }>
) {
    try {
        const user = await getAuthContext();

        const caja = await prisma.recepcionCaja.findUnique({
            where: { id: cajaId },
            include: {
                items: {
                    include: { activoFijo: true }
                }
            }
        });

        if (!caja) throw new Error('Caja no encontrada.');

        const host = process.env.NEXT_PUBLIC_APP_URL || 'https://paraiso-floral.vercel.app';
        const printJobs: any[] = [];

        if (itemsCustom && itemsCustom.length > 0) {
            for (const itemCustom of itemsCustom) {
                const cantidad = Math.max(0, itemCustom.cantidad || 0);
                if (cantidad === 0) continue;

                const params = new URLSearchParams({
                    idQr: itemCustom.idQr || '000000',
                    descripcion: formatNombreProductoRecepcion(itemCustom.descripcion),
                    codigoBarras: itemCustom.codigoBarras || itemCustom.idQr || '',
                    size: tamano
                });
                const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

                for (let i = 0; i < cantidad; i++) {
                    printJobs.push({
                        organizationId: user.organizationId,
                        activoId: itemCustom.activoFijoId || null,
                        urlImagen,
                        estado: 'PENDIENTE',
                        impresora,
                        tamano
                    });
                }
            }
        } else {
            for (const item of caja.items) {
                const activo = item.activoFijo;
                const descLive = formatNombreProductoRecepcion(activo?.descripcionCorta || item.descripcion);
                const codBarrasLive = item.codigoBarras || activo?.codigoBarras || activo?.idQr || '';
                const idQrLive = activo?.idQr || '000000';

                const cantidadEtiquetas = item.verificado && item.bonchesRecibidos > 0 ? item.bonchesRecibidos : item.bonchesEsperados;

                const params = new URLSearchParams({
                    idQr: idQrLive,
                    descripcion: descLive,
                    area: activo?.area || 'BODEGA',
                    cuenta: activo?.cuentaAct || 'INVENTARIO',
                    marca: activo?.marca || '',
                    modelo: activo?.modelo || '',
                    codigoBarras: codBarrasLive,
                    serie: activo?.serie || '',
                    size: tamano
                });
                const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

                for (let i = 0; i < cantidadEtiquetas; i++) {
                    printJobs.push({
                        organizationId: user.organizationId,
                        activoId: activo?.id || null,
                        urlImagen,
                        estado: 'PENDIENTE',
                        impresora,
                        tamano
                    });
                }
            }
        }

        if (printJobs.length === 0) {
            return { success: false, error: 'No hay etiquetas seleccionadas para encolar en esta caja.' };
        }

        const countPayload = await prisma.colaImpresion.createMany({
            data: printJobs
        });

        return { success: true, count: countPayload.count };
    } catch (error: any) {
        console.error('Error al encolar impresión por caja:', error);
        return { success: false, error: error.message || 'Error al encolar etiquetas.' };
    }
}

// 7. Imprimir etiquetas de todo el packing list completo con pre-visualización y soporte 1D
export async function encolarImpresionLoteCompleto(
    loteId: string, 
    impresora: string = 'Vorttek', 
    tamano: string = '50x25',
    itemsCustom?: Array<{ idQr: string; descripcion: string; codigoBarras: string; cantidad: number; activoFijoId?: string }>
) {
    try {
        const user = await getAuthContext();

        const lote = await prisma.recepcionLote.findUnique({
            where: { id: loteId },
            include: {
                cajas: {
                    include: {
                        items: {
                            include: { activoFijo: true }
                        }
                    }
                }
            }
        });

        if (!lote || lote.organizationId !== user.organizationId) {
            throw new Error('Lote no encontrado.');
        }

        const host = process.env.NEXT_PUBLIC_APP_URL || 'https://paraiso-floral.vercel.app';
        const printJobs: any[] = [];

        if (itemsCustom && itemsCustom.length > 0) {
            for (const itemCustom of itemsCustom) {
                const cantidad = Math.max(0, itemCustom.cantidad || 0);
                if (cantidad === 0) continue;

                const params = new URLSearchParams({
                    idQr: itemCustom.idQr || '000000',
                    descripcion: formatNombreProductoRecepcion(itemCustom.descripcion),
                    codigoBarras: itemCustom.codigoBarras || itemCustom.idQr || '',
                    size: tamano
                });
                const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

                for (let i = 0; i < cantidad; i++) {
                    printJobs.push({
                        organizationId: user.organizationId,
                        activoId: itemCustom.activoFijoId || null,
                        urlImagen,
                        estado: 'PENDIENTE',
                        impresora,
                        tamano
                    });
                }
            }
        } else {
            for (const caja of lote.cajas) {
                for (const item of caja.items) {
                    const activo = item.activoFijo;
                    const descLive = formatNombreProductoRecepcion(activo?.descripcionCorta || item.descripcion);
                    const codBarrasLive = item.codigoBarras || activo?.codigoBarras || activo?.idQr || '';
                    const idQrLive = activo?.idQr || '000000';

                    const cantidadEtiquetas = item.verificado && item.bonchesRecibidos > 0 ? item.bonchesRecibidos : item.bonchesEsperados;

                    const params = new URLSearchParams({
                        idQr: idQrLive,
                        descripcion: descLive,
                        area: activo?.area || 'BODEGA',
                        cuenta: activo?.cuentaAct || 'INVENTARIO',
                        marca: activo?.marca || '',
                        modelo: activo?.modelo || '',
                        codigoBarras: codBarrasLive,
                        serie: activo?.serie || '',
                        size: tamano
                    });
                    const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

                    for (let i = 0; i < cantidadEtiquetas; i++) {
                        printJobs.push({
                            organizationId: user.organizationId,
                            activoId: activo?.id || null,
                            urlImagen,
                            estado: 'PENDIENTE',
                            impresora,
                            tamano
                        });
                    }
                }
            }
        }

        if (printJobs.length === 0) {
            return { success: false, error: 'No hay etiquetas seleccionadas para encolar en este lote.' };
        }

        const countPayload = await prisma.colaImpresion.createMany({
            data: printJobs
        });

        return { success: true, count: countPayload.count };
    } catch (error: any) {
        console.error('Error al encolar impresión por lote completo:', error);
        return { success: false, error: error.message || 'Error al encolar etiquetas del lote.' };
    }
}

// 8. Limpiar cola de impresión pendiente (Debug Tool)
export async function limpiarColaImpresion() {
    try {
        const user = await getAuthContext();
        const deleted = await prisma.colaImpresion.deleteMany({
            where: { organizationId: user.organizationId, estado: 'PENDIENTE' }
        });
        return { success: true, count: deleted.count };
    } catch (error: any) {
        console.error('Error al limpiar cola de impresión:', error);
        return { success: false, error: error.message || 'Error al limpiar la cola de impresión.' };
    }
}

// 9. Obtener catálogo de activos para agregar productos extras/sobrantes en caja
export async function getActivosCatalogoParaRecepcion() {
    try {
        const user = await getAuthContext();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: user.organizationId },
            select: {
                id: true,
                idQr: true,
                descripcionCorta: true,
                marca: true,
                codigoBarras: true
            },
            orderBy: { idQr: 'asc' }
        });
        return { success: true, activos };
    } catch (error: any) {
        console.error('Error al obtener catálogo de activos:', error);
        return { success: false, activos: [], error: error.message };
    }
}

// 10. Agregar producto extra no planificado a una caja de recepción
export async function agregarItemExtraACaja(cajaId: string, activoFijoId: string, bonches: number, cultivoCustom?: string) {
    try {
        const user = await getAuthContext();

        const caja = await prisma.recepcionCaja.findUnique({
            where: { id: cajaId }
        });
        if (!caja) throw new Error('Caja no encontrada.');

        const activo = await prisma.activoFijo.findUnique({
            where: { id: activoFijoId, organizationId: user.organizationId }
        });
        if (!activo) throw new Error('Producto no encontrado en el catálogo.');

        const nuevoItem = await prisma.recepcionItem.create({
            data: {
                cajaId,
                activoFijoId: activo.id,
                cultivoOriginal: cultivoCustom || activo.marca || `ROSA - ${activo.descripcionCorta}`,
                descripcion: activo.descripcionCorta,
                bonchesEsperados: 0, // 0 esperados porque es un sobrante/extra no planificado
                bonchesRecibidos: bonches,
                verificado: true,
                notas: 'Producto de más / extra no incluido en el packing list original'
            }
        });

        // Actualizar total de bonches del lote
        await prisma.recepcionLote.update({
            where: { id: caja.recepcionId },
            data: { totalBonches: { increment: bonches } }
        });

        revalidatePath(`/inventario/recepcion/${caja.recepcionId}`);
        revalidatePath('/inventario/recepcion');

        return { success: true, item: nuevoItem };
    } catch (error: any) {
        console.error('Error al agregar item extra a la caja:', error);
        return { success: false, error: error.message || 'Error al agregar producto extra.' };
    }
}

// 11. Crear un lote completo de recepción a partir de la interpretación IA de un PDF/Imagen
export async function crearLoteDesdeSubidaAI(data: {
    numeroEnvio: string;
    proveedor: string;
    cajas: Array<{
        numeroCaja: number;
        codigoProveedor?: string | null;
        items: Array<{
            descripcion: string;
            cultivo: string;
            bonches: number;
            activoFijoId?: string | null;
        }>;
    }>;
}) {
    try {
        const user = await getAuthContext();

        if (!data.numeroEnvio || !data.proveedor || !data.cajas || data.cajas.length === 0) {
            throw new Error('Datos de envío o cajas incompletos.');
        }

        // Verificar si el envío ya existe
        const existente = await prisma.recepcionLote.findFirst({
            where: { organizationId: user.organizationId, numeroEnvio: data.numeroEnvio }
        });
        if (existente) {
            throw new Error(`El número de envío #${data.numeroEnvio} ya se encuentra registrado en el sistema.`);
        }

        let totalBonchesCalculado = 0;
        let totalCajasCalculado = data.cajas.length;

        data.cajas.forEach(c => {
            c.items.forEach(i => {
                totalBonchesCalculado += i.bonches || 0;
            });
        });

        // Crear el lote de recepción
        const nuevoLote = await prisma.recepcionLote.create({
            data: {
                organizationId: user.organizationId,
                numeroEnvio: data.numeroEnvio,
                proveedor: data.proveedor,
                totalCajas: totalCajasCalculado,
                totalBonches: totalBonchesCalculado,
                estado: 'EN_RECEPCION',
                fechaLlegada: new Date()
            }
        });

        // Crear cada caja e ítems
        for (const c of data.cajas) {
            const nuevaCaja = await prisma.recepcionCaja.create({
                data: {
                    recepcionId: nuevoLote.id,
                    numeroCaja: c.numeroCaja,
                    codigoProveedor: c.codigoProveedor || null,
                    estado: 'PENDIENTE'
                }
            });

            for (const item of c.items) {
                // Si no vino activoFijoId, buscar uno coincidente o usar null
                let activoIdToLink = item.activoFijoId;
                if (!activoIdToLink) {
                    const itemClean = (item.descripcion || '').toLowerCase();
                    const match = await prisma.activoFijo.findFirst({
                        where: {
                            organizationId: user.organizationId,
                            OR: [
                                { descripcionCorta: { contains: item.descripcion, mode: 'insensitive' } },
                                { marca: { contains: item.descripcion, mode: 'insensitive' } },
                                ...((itemClean.includes('gyp') || itemClean.includes('baby')) ? [
                                    { descripcionCorta: { contains: 'Baby', mode: 'insensitive' as const } },
                                    { descripcionCorta: { contains: 'Gyp', mode: 'insensitive' as const } }
                                ] : []),
                                ...((itemClean.includes('hyd') || itemClean.includes('horten')) ? [
                                    { descripcionCorta: { contains: 'Hortensia', mode: 'insensitive' as const } },
                                    { descripcionCorta: { contains: 'Hyd', mode: 'insensitive' as const } }
                                ] : [])
                            ]
                        }
                    });
                    if (match) {
                        activoIdToLink = match.id;
                    }
                }

                await prisma.recepcionItem.create({
                    data: {
                        cajaId: nuevaCaja.id,
                        activoFijoId: activoIdToLink || null,
                        cultivoOriginal: item.cultivo || item.descripcion,
                        descripcion: item.descripcion,
                        bonchesEsperados: item.bonches || 1,
                        bonchesRecibidos: 0,
                        verificado: false,
                        tipoEmpaque: 'Cartón'
                    }
                });
            }
        }

        revalidatePath('/inventario/recepcion');

        return { success: true, loteId: nuevoLote.id, numeroEnvio: nuevoLote.numeroEnvio };
    } catch (error: any) {
        console.error('Error al crear lote desde IA:', error);
        return { success: false, error: error.message || 'Error al crear el lote de recepción.' };
    }
}



