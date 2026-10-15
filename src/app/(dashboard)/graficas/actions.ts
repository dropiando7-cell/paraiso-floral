'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { isEnvioItem } from '@/utils/facturaUtils';

export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) throw new Error("Usuario no encontrado en base de datos");

    const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Usuario';
    return { ...dbUser, fullName };
}

function extractCleanProductName(raw: string): string {
    if (!raw) return 'Variedad General';
    const firstLine = raw.split('\n')[0].trim();
    return firstLine.replace(/__METADATA__.*$/, '').trim();
}

function detectFlowerCategory(name: string): string {
    const upper = name.toUpperCase();
    if (upper.includes('ROSA') || upper.includes('FREEDOM') || upper.includes('EXPLORER') || upper.includes('MONDIAL') || upper.includes('SURTID')) {
        return 'Rosas';
    }
    if (upper.includes('POMPON') || upper.includes('MARGARITA') || upper.includes('FUJI') || upper.includes('CRISANTEMO')) {
        return 'Pompones y Crisantemos';
    }
    if (upper.includes('GERBERA') || upper.includes('TULIPAN') || upper.includes('GIRASOL') || upper.includes('LIRIO') || upper.includes('CLAVEL') || upper.includes('ALSTROEMERIA') || upper.includes('DRAGON') || upper.includes('MANZANILLA') || upper.includes('ORQUIDEA')) {
        return 'Flores Exóticas y Corte';
    }
    if (upper.includes('ERUL') || upper.includes('EUCALIPTO') || upper.includes('SOLIDAGO') || upper.includes('RUSCUS') || upper.includes('PINOCHO') || upper.includes('HELECHO') || upper.includes('GYPSO') || upper.includes('BABY')) {
        return 'Follajes y Rellenos';
    }
    return 'Otras Variedades';
}

export type TimeRangeType = '15d' | '30d' | 'month' | 'all';

export async function getGraficasReportData(
    period: TimeRangeType = '15d',
    month?: number,
    year?: number
) {
    try {
        const user = await getAuthenticatedUser();
        const orgId = user.organizationId;

        const now = new Date();
        const selMonth = month || (now.getMonth() + 1);
        const selYear = year || now.getFullYear();

        let startDate: Date;
        let endDate: Date = new Date();

        if (period === '15d') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 15);
            startDate.setHours(0, 0, 0, 0);
        } else if (period === '30d') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
            startDate = new Date(selYear, selMonth - 1, 1, 0, 0, 0, 0);
            endDate = new Date(selYear, selMonth, 0, 23, 59, 59, 999);
        } else {
            // All-time or last 90 days
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 90);
            startDate.setHours(0, 0, 0, 0);
        }

        const daysSpan = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

        // 1. Fetch Invoices with details, client, seller
        const facturas = await prisma.factura.findMany({
            where: {
                organizationId: orgId,
                fechaEmision: {
                    gte: startDate,
                    lte: endDate
                },
                estado: { not: 'ANULADA' },
                tipoDocumento: { in: ['FACTURA', 'NOTA_CREDITO'] }
            },
            include: {
                detalles: {
                    include: {
                        producto: {
                            select: {
                                id: true,
                                nombre: true,
                                stockActual: true,
                                precioVenta: true,
                                costoBase: true,
                                categoria: true,
                                imagenWeb: true
                            }
                        }
                    }
                },
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        telefono: true,
                        direccion: true,
                        limiteCredito: true,
                        saldoInicial: true,
                        saldoFavor: true
                    }
                },
                creadoPor: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
                    }
                },
                pagosMixtos: true
            },
            orderBy: {
                fechaEmision: 'desc'
            }
        });

        // 2. Fetch Mermas in the same period
        const mermas = await prisma.registroMerma.findMany({
            where: {
                organizationId: orgId,
                fecha: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        // 3. Fetch Master Products for stock matching & suggestions
        const masterProducts = await prisma.producto.findMany({
            where: {
                organizationId: orgId,
                estado: 'ACTIVO'
            },
            select: {
                id: true,
                nombre: true,
                stockActual: true,
                stockMinimo: true,
                precioVenta: true,
                costoBase: true,
                categoria: true,
                imagenWeb: true
            }
        });

        // ==========================================
        // AGGREGATIONS & METRICS
        // ==========================================

        const totalVentasMonto = facturas.reduce((sum, f) => sum + Number(f.total), 0);
        const facturasCount = facturas.length;
        const ticketPromedio = facturasCount > 0 ? (totalVentasMonto / facturasCount) : 0;

        let totalPaquetesVendidos = 0;
        let totalVentasContado = 0;
        let totalVentasCredito = 0;

        // Payment methods tracking
        const metodosPagoMap: Record<string, number> = {
            'Efectivo': 0,
            'Transferencia': 0,
            'Crédito': 0,
            'Otros': 0
        };

        // Aggregation maps
        const productStatsMap = new Map<string, {
            nombre: string;
            categoria: string;
            cantidadVendida: number;
            montoTotal: number;
            facturasSet: Set<string>;
            imagenWeb?: string | null;
            productoId?: string | null;
            dbStockActual?: number;
            dbPrecio?: number;
        }>();

        const vendedorStatsMap = new Map<string, {
            vendedorId?: string;
            nombre: string;
            facturasCount: number;
            montoTotal: number;
            unidadesVendidas: number;
            montoContado: number;
            montoCredito: number;
        }>();

        const clienteStatsMap = new Map<string, {
            clienteId: string;
            nombre: string;
            telefono?: string | null;
            direccion?: string | null;
            facturasCount: number;
            montoTotal: number;
            saldoPendiente: number;
            ultimaCompra: string;
        }>();

        // Process Facturas & Details
        facturas.forEach(f => {
            const isCredito = Number(f.saldoPendiente) > 0 || (f.metodoPago && f.metodoPago.toLowerCase().includes('credito'));
            if (isCredito) {
                totalVentasCredito += Number(f.total);
            } else {
                totalVentasContado += Number(f.total);
            }

            // Metodo de pago
            if (f.pagosMixtos && f.pagosMixtos.length > 0) {
                f.pagosMixtos.forEach(p => {
                    const mp = p.metodoPago || 'Otros';
                    metodosPagoMap[mp] = (metodosPagoMap[mp] || 0) + Number(p.monto);
                });
            } else {
                const mp = f.metodoPago || (isCredito ? 'Crédito' : 'Efectivo');
                metodosPagoMap[mp] = (metodosPagoMap[mp] || 0) + Number(f.total);
            }

            // Vendedor
            const sellerName = f.vendedorNombre?.trim() || 
                ([f.creadoPor?.nombre, f.creadoPor?.apellido].filter(Boolean).join(' ').trim()) || 
                'Ventas Central';

            const sellerKey = sellerName.toUpperCase();
            if (!vendedorStatsMap.has(sellerKey)) {
                vendedorStatsMap.set(sellerKey, {
                    vendedorId: f.creadoPorId || undefined,
                    nombre: sellerName,
                    facturasCount: 0,
                    montoTotal: 0,
                    unidadesVendidas: 0,
                    montoContado: 0,
                    montoCredito: 0
                });
            }
            const sData = vendedorStatsMap.get(sellerKey)!;
            sData.facturasCount += 1;
            sData.montoTotal += Number(f.total);
            if (isCredito) {
                sData.montoCredito += Number(f.total);
            } else {
                sData.montoContado += Number(f.total);
            }

            // Cliente
            if (f.cliente) {
                const cKey = f.cliente.id;
                if (!clienteStatsMap.has(cKey)) {
                    clienteStatsMap.set(cKey, {
                        clienteId: f.cliente.id,
                        nombre: f.cliente.nombre,
                        telefono: f.cliente.telefono,
                        direccion: f.cliente.direccion,
                        facturasCount: 0,
                        montoTotal: 0,
                        saldoPendiente: 0,
                        ultimaCompra: f.fechaEmision.toISOString()
                    });
                }
                const cData = clienteStatsMap.get(cKey)!;
                cData.facturasCount += 1;
                cData.montoTotal += Number(f.total);
                cData.saldoPendiente += Number(f.saldoPendiente || 0);
                if (new Date(f.fechaEmision) > new Date(cData.ultimaCompra)) {
                    cData.ultimaCompra = f.fechaEmision.toISOString();
                }
            }

            // Detalle Factura (Productos / Flores)
            f.detalles.forEach(d => {
                const cleanName = extractCleanProductName(d.descripcion);
                const cant = Number(d.cantidad) || 0;
                const monto = Number(d.totalLinea) || 0;
                if (!isEnvioItem(cleanName)) {
                    totalPaquetesVendidos += cant;
                    sData.unidadesVendidas += cant;
                }

                const prodKey = cleanName.toUpperCase();
                if (!productStatsMap.has(prodKey)) {
                    productStatsMap.set(prodKey, {
                        nombre: cleanName,
                        categoria: detectFlowerCategory(cleanName),
                        cantidadVendida: 0,
                        montoTotal: 0,
                        facturasSet: new Set(),
                        imagenWeb: d.producto?.imagenWeb || null,
                        productoId: d.productoId,
                        dbStockActual: d.producto?.stockActual,
                        dbPrecio: d.producto?.precioVenta ? Number(d.producto.precioVenta) : undefined
                    });
                }
                const pData = productStatsMap.get(prodKey)!;
                pData.cantidadVendida += cant;
                pData.montoTotal += monto;
                pData.facturasSet.add(f.id);
                if (!pData.imagenWeb && d.producto?.imagenWeb) {
                    pData.imagenWeb = d.producto.imagenWeb;
                }
            });
        });

        // Connect masterProducts stock to productStatsMap if not connected
        masterProducts.forEach(mp => {
            const key = mp.nombre.trim().toUpperCase();
            if (productStatsMap.has(key)) {
                const item = productStatsMap.get(key)!;
                item.dbStockActual = mp.stockActual;
                item.dbPrecio = Number(mp.precioVenta);
                if (!item.imagenWeb && mp.imagenWeb) item.imagenWeb = mp.imagenWeb;
            }
        });

        // 4. Products Array & Rankings
        const productsList = Array.from(productStatsMap.values()).map(p => ({
            nombre: p.nombre,
            categoria: p.categoria,
            cantidadVendida: p.cantidadVendida,
            montoTotal: p.montoTotal,
            precioPromedio: p.cantidadVendida > 0 ? (p.montoTotal / p.cantidadVendida) : 0,
            frecuenciaFacturas: p.facturasSet.size,
            imagenWeb: p.imagenWeb || null,
            stockActual: p.dbStockActual ?? 0,
            // Run-rate per day in current period
            velocidadDiaria: Number((p.cantidadVendida / daysSpan).toFixed(1)),
            // Days of stock left based on current sales speed
            diasCobertura: (p.cantidadVendida > 0 && (p.dbStockActual ?? 0) > 0)
                ? Number(((p.dbStockActual ?? 0) / (p.cantidadVendida / daysSpan)).toFixed(1))
                : 0
        }));

        // Sortings
        const topProductosPorVolumen = [...productsList].sort((a, b) => b.cantidadVendida - a.cantidadVendida);
        const topProductosPorMonto = [...productsList].sort((a, b) => b.montoTotal - a.montoTotal);

        // 5. Categorías Breakdown (Donut)
        const categoriaTotals: Record<string, { cantidad: number; monto: number }> = {};
        productsList.forEach(p => {
            if (!categoriaTotals[p.categoria]) {
                categoriaTotals[p.categoria] = { cantidad: 0, monto: 0 };
            }
            categoriaTotals[p.categoria].cantidad += p.cantidadVendida;
            categoriaTotals[p.categoria].monto += p.montoTotal;
        });

        const categoriasList = Object.entries(categoriaTotals).map(([categoria, val]) => ({
            categoria,
            cantidad: val.cantidad,
            monto: val.monto,
            pctMonto: totalVentasMonto > 0 ? Number(((val.monto / totalVentasMonto) * 100).toFixed(1)) : 0,
            pctVolumen: totalPaquetesVendidos > 0 ? Number(((val.cantidad / totalPaquetesVendidos) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.monto - a.monto);

        // 6. Intelligent Reorder Suggestions (¿Qué pedir más?)
        const sugerenciasReabastecimiento = productsList.map(p => {
            const rotacion = p.velocidadDiaria;
            let nivelPrioridad: 'CRITICA' | 'ALTA' | 'MODERADA' | 'ESTABLE' | 'EXCESO' = 'MODERADA';
            let sugerenciaTexto = 'Stock normal';
            let cantidadRecomendadaPedir = Math.ceil(rotacion * 7); // Pedir para 7 días

            if (p.stockActual <= 0 && rotacion > 0) {
                nivelPrioridad = 'CRITICA';
                sugerenciaTexto = 'Agotado con alta demanda. Pedir prioritariamente.';
            } else if (p.diasCobertura > 0 && p.diasCobertura < 3) {
                nivelPrioridad = 'ALTA';
                sugerenciaTexto = `Quedan ~${p.diasCobertura} días de stock. Solicitar reabastecimiento urgente.`;
            } else if (p.diasCobertura >= 3 && p.diasCobertura <= 7) {
                nivelPrioridad = 'MODERADA';
                sugerenciaTexto = `Cobertura de ${p.diasCobertura} días. Planificar próximo envío.`;
            } else if (p.diasCobertura > 15) {
                nivelPrioridad = 'EXCESO';
                sugerenciaTexto = `Sobre-inventario (~${p.diasCobertura} días). Pausar compras y promocionar.`;
                cantidadRecomendadaPedir = 0;
            } else {
                nivelPrioridad = 'ESTABLE';
                sugerenciaTexto = 'Flujo balanceado de inventario.';
            }

            return {
                ...p,
                nivelPrioridad,
                sugerenciaTexto,
                cantidadRecomendadaPedir
            };
        }).sort((a, b) => {
            const rank: Record<string, number> = { 'CRITICA': 5, 'ALTA': 4, 'MODERADA': 3, 'ESTABLE': 2, 'EXCESO': 1 };
            return (rank[b.nivelPrioridad] || 0) - (rank[a.nivelPrioridad] || 0);
        });

        // 7. Vendedores Ranking
        const vendedoresList = Array.from(vendedorStatsMap.values()).map(v => ({
            ...v,
            ticketPromedio: v.facturasCount > 0 ? (v.montoTotal / v.facturasCount) : 0,
            pctTotal: totalVentasMonto > 0 ? Number(((v.montoTotal / totalVentasMonto) * 100).toFixed(1)) : 0,
            pctContado: v.montoTotal > 0 ? Number(((v.montoContado / v.montoTotal) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.montoTotal - a.montoTotal);

        // 8. Clientes Ranking & Pareto (80/20)
        let accumulatedMonto = 0;
        const clientesSorted = Array.from(clienteStatsMap.values()).sort((a, b) => b.montoTotal - a.montoTotal);
        const clientesList = clientesSorted.map((c, index) => {
            accumulatedMonto += c.montoTotal;
            const pctAcumulado = totalVentasMonto > 0 ? (accumulatedMonto / totalVentasMonto) * 100 : 0;
            return {
                ...c,
                ranking: index + 1,
                ticketPromedio: c.facturasCount > 0 ? (c.montoTotal / c.facturasCount) : 0,
                pctDelTotal: totalVentasMonto > 0 ? Number(((c.montoTotal / totalVentasMonto) * 100).toFixed(1)) : 0,
                esPareto80: pctAcumulado <= 85 // Part of the 80% key volume
            };
        });

        // 9. Timeline Spline Chart (Ventas día por día)
        const dailyTimelineMap = new Map<string, { fecha: string; diaLabel: string; totalVentas: number; facturasCount: number; unidades: number }>();
        
        // Populate all days in the range
        const iterDate = new Date(startDate);
        while (iterDate <= endDate) {
            const key = iterDate.toISOString().split('T')[0];
            const diaNum = iterDate.getDate();
            const mesNombre = iterDate.toLocaleDateString('es-HN', { month: 'short' });
            dailyTimelineMap.set(key, {
                fecha: key,
                diaLabel: `${diaNum} ${mesNombre}`,
                totalVentas: 0,
                facturasCount: 0,
                unidades: 0
            });
            iterDate.setDate(iterDate.getDate() + 1);
        }

        facturas.forEach(f => {
            const key = new Date(f.fechaEmision).toISOString().split('T')[0];
            if (dailyTimelineMap.has(key)) {
                const item = dailyTimelineMap.get(key)!;
                item.totalVentas += Number(f.total);
                item.facturasCount += 1;
                f.detalles.forEach(d => {
                    item.unidades += (Number(d.cantidad) || 0);
                });
            }
        });

        const timelineStats = Array.from(dailyTimelineMap.values());

        // 10. Mermas Analysis
        const totalMermasUnidades = mermas.reduce((sum, m) => sum + m.cantidad, 0);
        const mermasPorFlorMap: Record<string, number> = {};
        mermas.forEach(m => {
            const name = extractCleanProductName(m.nombreProducto);
            mermasPorFlorMap[name] = (mermasPorFlorMap[name] || 0) + m.cantidad;
        });
        const topMermasFlores = Object.entries(mermasPorFlorMap)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10);

        // 11. Raw Facturas for detail modal
        const rawFacturas = facturas.slice(0, 100).map(f => ({
            id: f.id,
            correlativo: f.correlativo,
            total: Number(f.total),
            fechaEmision: f.fechaEmision.toISOString(),
            estado: f.estado,
            estadoPago: f.estadoPago,
            metodoPago: f.metodoPago,
            saldoPendiente: Number(f.saldoPendiente || 0),
            cliente: f.cliente?.nombre || 'Cliente General',
            vendedor: f.vendedorNombre || [f.creadoPor?.nombre, f.creadoPor?.apellido].filter(Boolean).join(' ') || 'Ventas',
            itemsCount: f.detalles.length,
            detalles: f.detalles.map(d => ({
                descripcion: extractCleanProductName(d.descripcion),
                cantidad: d.cantidad,
                precioUnitario: Number(d.precioUnitario),
                totalLinea: Number(d.totalLinea)
            }))
        }));

        return {
            period,
            daysSpan,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            responsable: user.fullName,
            // KPIs
            totalVentasMonto,
            facturasCount,
            ticketPromedio,
            totalPaquetesVendidos,
            totalVentasContado,
            totalVentasCredito,
            pctContado: totalVentasMonto > 0 ? Number(((totalVentasContado / totalVentasMonto) * 100).toFixed(1)) : 0,
            pctCredito: totalVentasMonto > 0 ? Number(((totalVentasCredito / totalVentasMonto) * 100).toFixed(1)) : 0,
            metodosPago: Object.entries(metodosPagoMap).map(([metodo, total]) => ({ metodo, total })).filter(m => m.total > 0),
            // Charts & Tables
            timelineStats,
            topProductosPorVolumen: topProductosPorVolumen.slice(0, 20),
            topProductosPorMonto: topProductosPorMonto.slice(0, 20),
            categoriasList,
            sugerenciasReabastecimiento: sugerenciasReabastecimiento.slice(0, 25),
            vendedoresList,
            clientesList: clientesList.slice(0, 30),
            clientesParetoCount: clientesList.filter(c => c.esPareto80).length,
            // Mermas
            totalMermasUnidades,
            topMermasFlores,
            // Raw list for drilldown
            rawFacturas
        };
    } catch (e: any) {
        console.error("Error in getGraficasReportData:", e);
        throw new Error(e.message || "Error al generar reporte de inteligencia comercial");
    }
}

export async function anularFactura(facturaId: string, motivo: string) {
    try {
        const user = await getAuthenticatedUser();
        const factura = await prisma.factura.findUnique({
            where: { id: facturaId },
            include: { detalles: true }
        });

        if (!factura) throw new Error("Factura no encontrada");
        if (factura.estado === 'ANULADA') throw new Error("La factura ya se encuentra anulada");

        await prisma.factura.update({
            where: { id: facturaId },
            data: {
                estado: 'ANULADA',
                anuladaPorId: user.id,
                anuladaAt: new Date(),
                notas: factura.notas ? `${factura.notas} | Motivo de anulación: ${motivo}` : `Motivo de anulación: ${motivo}`
            }
        });

        revalidatePath('/graficas');
        revalidatePath('/facturas');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
