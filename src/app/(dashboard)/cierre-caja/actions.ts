'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

// Auth Helper - Returns current database user & full name
export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) throw new Error("Usuario no encontrado en base de datos");

    const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Usuario';
    return { ...dbUser, fullName };
}

// Auto-close expired sessions JIT
export async function autoCloseExpiredSessions(organizationId: string) {
    try {
        const activeSessions = await prisma.corteCajaSession.findMany({
            where: {
                organizationId,
                estado: 'ABIERTA'
            }
        });

        const now = new Date();

        for (const active of activeSessions) {
            // Honduras local time is UTC-6
            const localApertura = new Date(active.aperturaAt.getTime() - 6 * 60 * 60 * 1000);
            
            // Threshold is 11:00 PM local time on the day of opening
            const localThreshold = new Date(localApertura);
            localThreshold.setHours(23, 0, 0, 0);

            // Convert threshold back to UTC
            const thresholdUtc = new Date(localThreshold.getTime() + 6 * 60 * 60 * 1000);

            if (now > thresholdUtc) {
                console.log(`[Auto-Close] Session ${active.id} is expired. aperturaAt: ${active.aperturaAt}, threshold: ${thresholdUtc}. Auto-closing now.`);

                // Find all facturas and rent payments created BEFORE or AT the threshold
                const facturasBefore = await prisma.factura.findMany({
                    where: {
                        cajaSessionId: active.id,
                        tipoDocumento: 'FACTURA',
                        fechaEmision: { lte: thresholdUtc },
                        estado: { not: 'ANULADA' }
                    }
                });

                const rentasBefore = await prisma.rentaPago.findMany({
                    where: {
                        cajaSessionId: active.id,
                        fechaPago: { lte: thresholdUtc }
                    }
                });

                const ordenesBefore = await prisma.ordenTrabajo.findMany({
                    where: {
                        cajaSessionId: active.id,
                        fechaRecibido: { lte: thresholdUtc }
                    }
                });

                const pagosClienteBefore = await prisma.pagoCliente.findMany({
                    where: {
                        cajaSessionId: active.id,
                        fecha: { lte: thresholdUtc },
                        anulado: false
                    }
                });

                const saldoInicial = Number(active.saldoInicial);
                const ventasEfectivo = facturasBefore
                    .filter(f => (f.metodoPago || 'Efectivo') === 'Efectivo')
                    .reduce((sum, f) => sum + Number(f.total), 0);
                const rentasEfectivo = rentasBefore
                    .filter(r => (r.metodoPago || 'Efectivo') === 'Efectivo')
                    .reduce((sum, r) => sum + Number(r.monto), 0);
                const soporteEfectivo = ordenesBefore
                    .filter(o => (o.metodoPagoRevision || 'Efectivo') === 'Efectivo')
                    .reduce((sum, o) => sum + Number(o.costoRevision), 0);
                const abonosEfectivo = pagosClienteBefore
                    .filter(p => (p.metodoPago || 'Efectivo').toUpperCase().includes('EFECTIVO'))
                    .reduce((sum, p) => sum + Number(p.monto), 0);

                const esperadoEfectivo = saldoInicial + ventasEfectivo + rentasEfectivo + soporteEfectivo + abonosEfectivo;

                // Perform database updates in a transaction
                await prisma.$transaction([
                    // Unlink transactions created AFTER the 11:00 PM threshold
                    prisma.factura.updateMany({
                        where: {
                            cajaSessionId: active.id,
                            fechaEmision: { gt: thresholdUtc }
                        },
                        data: {
                            cajaSessionId: null
                        }
                    }),
                    prisma.rentaPago.updateMany({
                        where: {
                            cajaSessionId: active.id,
                            fechaPago: { gt: thresholdUtc }
                        },
                        data: {
                            cajaSessionId: null
                        }
                    }),
                    prisma.ordenTrabajo.updateMany({
                        where: {
                            cajaSessionId: active.id,
                            fechaRecibido: { gt: thresholdUtc }
                        },
                        data: {
                            cajaSessionId: null
                        }
                    }),
                    prisma.pagoCliente.updateMany({
                        where: {
                            cajaSessionId: active.id,
                            fecha: { gt: thresholdUtc }
                        },
                        data: {
                            cajaSessionId: null
                        }
                    }),
                    // Close the session
                    prisma.corteCajaSession.update({
                        where: { id: active.id },
                        data: {
                            estado: 'CERRADA',
                            saldoFinalEfectivo: new Prisma.Decimal(esperadoEfectivo),
                            diferencia: new Prisma.Decimal(0),
                            observaciones: "Cierre automático del sistema a las 11:00 PM por turno no cerrado por el operador.",
                            cierreAt: thresholdUtc,
                            cerradoPorId: active.creadoPorId,
                            modificadoPorId: active.creadoPorId
                        }
                    })
                ]);
                console.log(`[Auto-Close] Session ${active.id} auto-closed successfully.`);
            }
        }
    } catch (e) {
        console.error("Error in autoCloseExpiredSessions:", e);
    }
}

// Active Session Helper - Returns open session if any (fully serialized)
export async function getActiveCajaSession() {
    try {
        const user = await getAuthenticatedUser();

        // Auto-close expired sessions
        await autoCloseExpiredSessions(user.organizationId);

        const active = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId: user.organizationId,
                estado: 'ABIERTA'
            },
            include: {
                creadoPor: true,
                modificadoPor: true,
                facturas: true,
                rentasPagos: true,
                ordenesTrabajo: true,
                pagosCliente: true
            }
        });
        
        if (!active) return null;

        return {
            id: active.id,
            estado: active.estado,
            saldoInicial: Number(active.saldoInicial),
            saldoFinalEfectivo: active.saldoFinalEfectivo ? Number(active.saldoFinalEfectivo) : null,
            diferencia: active.diferencia ? Number(active.diferencia) : null,
            observaciones: active.observaciones,
            aperturaAt: active.aperturaAt.toISOString(),
            cierreAt: active.cierreAt ? active.cierreAt.toISOString() : null,
            createdAt: active.createdAt.toISOString(),
            updatedAt: active.updatedAt.toISOString(),
            creadoPor: active.creadoPor ? {
                nombre: active.creadoPor.nombre,
                apellido: active.creadoPor.apellido,
                email: active.creadoPor.email
            } : null,
            modificadoPor: active.modificadoPor ? {
                nombre: active.modificadoPor.nombre,
                apellido: active.modificadoPor.apellido,
                email: active.modificadoPor.email
            } : null
        };
    } catch (e) {
        console.error("Error en getActiveCajaSession:", e);
        return null;
    }
}

// Open Session Action (fully serialized)
export async function abrirCaja(saldoInicial: number) {
    const user = await getAuthenticatedUser();

    // Auto-close expired sessions first
    await autoCloseExpiredSessions(user.organizationId);

    // Check if there is an active session already
    const existing = await prisma.corteCajaSession.findFirst({
        where: {
            organizationId: user.organizationId,
            estado: 'ABIERTA'
        }
    });

    if (existing) {
        throw new Error("Ya existe una sesión de caja abierta para esta organización.");
    }

    const nuevaSesion = await prisma.corteCajaSession.create({
        data: {
            organizationId: user.organizationId,
            estado: 'ABIERTA',
            saldoInicial: new Prisma.Decimal(saldoInicial),
            creadoPorId: user.id
        }
    });

    // Auto-link any transactions created today (since 00:00:00 local time / UTC-6) that are unlinked
    const localNow = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const localStartOfToday = new Date(localNow);
    localStartOfToday.setHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(localStartOfToday.getTime() + 6 * 60 * 60 * 1000);

    const localEndOfToday = new Date(localNow);
    localEndOfToday.setHours(23, 59, 59, 999);
    const endOfTodayUtc = new Date(localEndOfToday.getTime() + 6 * 60 * 60 * 1000);

    await prisma.factura.updateMany({
        where: {
            organizationId: user.organizationId,
            cajaSessionId: null,
            tipoDocumento: 'FACTURA',
            createdAt: { gte: startOfTodayUtc },
            fechaEmision: { gte: startOfTodayUtc, lte: endOfTodayUtc },
            NOT: {
                correlativo: {
                    startsWith: 'FAC-OCC'
                }
            }
        },
        data: {
            cajaSessionId: nuevaSesion.id
        }
    });

    await prisma.rentaPago.updateMany({
        where: {
            organizationId: user.organizationId,
            cajaSessionId: null,
            createdAt: { gte: startOfTodayUtc },
            fechaPago: { gte: startOfTodayUtc, lte: endOfTodayUtc }
        },
        data: {
            cajaSessionId: nuevaSesion.id
        }
    });

    await prisma.ordenTrabajo.updateMany({
        where: {
            organizationId: user.organizationId,
            cajaSessionId: null,
            metodoPagoRevision: { not: 'Ninguno' },
            fechaRecibido: { gte: startOfTodayUtc, lte: endOfTodayUtc }
        },
        data: {
            cajaSessionId: nuevaSesion.id
        }
    });

    await prisma.pagoCliente.updateMany({
        where: {
            organizationId: user.organizationId,
            cajaSessionId: null,
            createdAt: { gte: startOfTodayUtc },
            fecha: { gte: startOfTodayUtc, lte: endOfTodayUtc },
            NOT: {
                referencia: {
                    startsWith: 'ABONO EXCEL'
                }
            }
        },
        data: {
            cajaSessionId: nuevaSesion.id
        }
    });

    revalidatePath('/cierre-caja');
    revalidatePath('/facturas/pos');

    return {
        id: nuevaSesion.id,
        estado: nuevaSesion.estado,
        saldoInicial: Number(nuevaSesion.saldoInicial),
        aperturaAt: nuevaSesion.aperturaAt.toISOString()
    };
}

// Update Initial Balance of an open session (fully serialized)
export async function actualizarSaldoInicial(sessionId: string, nuevoSaldoInicial: number) {
    const user = await getAuthenticatedUser();

    // Check if there is an active session for the user's organization
    const active = await prisma.corteCajaSession.findFirst({
        where: {
            id: sessionId,
            organizationId: user.organizationId,
            estado: 'ABIERTA'
        }
    });

    if (!active) {
        throw new Error("No se encontró una sesión de caja abierta para actualizar.");
    }

    const updated = await prisma.corteCajaSession.update({
        where: {
            id: sessionId
        },
        data: {
            saldoInicial: new Prisma.Decimal(nuevoSaldoInicial),
            modificadoPorId: user.id
        }
    });

    revalidatePath('/cierre-caja');
    revalidatePath('/facturas/pos');

    return {
        id: updated.id,
        saldoInicial: Number(updated.saldoInicial)
    };
}


// Summary Calculation Helper (fully serialized)
export async function getCajaSessionSummary(sessionId: string) {
    const user = await getAuthenticatedUser();

    // Auto-close expired sessions
    await autoCloseExpiredSessions(user.organizationId);

    const session = await prisma.corteCajaSession.findUnique({
        where: {
            id: sessionId,
            organizationId: user.organizationId
        },
        include: {
            creadoPor: true,
            modificadoPor: true,
            cerradoPor: true,
            facturas: {
                where: { 
                    estado: { not: 'ANULADA' },
                    tipoDocumento: 'FACTURA'
                },
                include: {
                    cliente: true,
                    pagosMixtos: true
                }
            },
            rentasPagos: {
                include: {
                    renta: {
                        include: {
                            cliente: true,
                            activoFijo: true
                        }
                    }
                }
            },
            ordenesTrabajo: {
                include: {
                    cliente: true
                }
            },
            movimientos: {
                include: {
                    creadoPor: true,
                    anuladaPor: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            pagosCliente: {
                include: {
                    cliente: true
                }
            }
        }
    });

    if (!session) {
        throw new Error("Sesión de caja no encontrada.");
    }

    // Default structure for classification
    const metodos = ['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'];
    const summary = {
        ventas: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
        rentas: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
        soporte: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
        abonos: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
        egresos: 0
    };

    // Classify Facturas
    session.facturas.forEach(f => {
        let metodo = f.metodoPago || 'Efectivo';
        if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
        
        const total = Number(f.total);
        
        // Exclude unconfirmed transfers from totals
        if (metodo === 'Transferencia' && f.transferenciaConfirmada === false) {
            return;
        }

        if (metodo === 'MIXTO' && f.pagosMixtos && f.pagosMixtos.length > 0) {
            f.pagosMixtos.forEach((p: any) => {
                let pMetodo = p.metodoPago;
                if (pMetodo === 'Tarjeta de Crédito/Débito') pMetodo = 'Tarjeta';
                const pTotal = Number(p.monto);
                
                // Exclude unconfirmed transfers inside mixed payments
                if (pMetodo === 'Transferencia' && f.transferenciaConfirmada === false) {
                    return;
                }

                if (summary.ventas[pMetodo] !== undefined) {
                    summary.ventas[pMetodo] += pTotal;
                } else {
                    summary.ventas[pMetodo] = pTotal;
                }
            });
        } else {
            if (summary.ventas[metodo] !== undefined) {
                summary.ventas[metodo] += total;
            } else {
                summary.ventas[metodo] = total;
            }
        }
    });

    // Classify RentaPagos
    session.rentasPagos.forEach(p => {
        let metodo = p.metodoPago || 'Efectivo';
        if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
        const total = Number(p.monto);
        if (summary.rentas[metodo] !== undefined) {
            summary.rentas[metodo] += total;
        } else {
            summary.rentas[metodo] = total;
        }
    });

    // Classify OrdenTrabajo (Revisiones/Diagnostico)
    session.ordenesTrabajo.forEach(o => {
        let metodo = o.metodoPagoRevision || 'Efectivo';
        if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
        const total = Number(o.costoRevision);
        if (summary.soporte[metodo] !== undefined) {
            summary.soporte[metodo] += total;
        } else {
            summary.soporte[metodo] = total;
        }
    });

    // Classify PagosCliente (Abonos Cuentas por Cobrar)
    session.pagosCliente.forEach(p => {
        if (p.anulado) return;
        let rawMetodo = (p.metodoPago || 'Efectivo').toUpperCase();
        let metodo = 'Efectivo'; // Default
        
        if (rawMetodo.includes('TARJETA')) metodo = 'Tarjeta';
        else if (rawMetodo.includes('TRANSFERENCIA')) metodo = 'Transferencia';
        else if (rawMetodo.includes('CHEQUE')) metodo = 'Cheque';
        else if (rawMetodo.includes('OCCIDENTE') || rawMetodo.includes('LINK')) metodo = 'Link de pago de Occidente';
        
        const total = Number(p.monto);
        if (summary.abonos[metodo] !== undefined) {
            summary.abonos[metodo] += total;
        } else {
            summary.abonos[metodo] = total;
        }
    });

    const totalVentas = Object.values(summary.ventas).reduce((sum, v) => sum + v, 0);
    const totalRentas = Object.values(summary.rentas).reduce((sum, r) => sum + r, 0);
    const totalSoporte = Object.values(summary.soporte).reduce((sum, s) => sum + s, 0);
    const totalAbonos = Object.values(summary.abonos).reduce((sum, a) => sum + a, 0);

    const saldoInicial = Number(session.saldoInicial);
    const ventasEfectivo = summary.ventas['Efectivo'] || 0;
    const rentasEfectivo = summary.rentas['Efectivo'] || 0;
    const soporteEfectivo = summary.soporte['Efectivo'] || 0;
    const abonosEfectivo = summary.abonos['Efectivo'] || 0;

    let ingresosMovimientosEfectivo = 0;
    let egresosMovimientosEfectivo = 0;
    session.movimientos.forEach(m => {
        if (m.anuladaAt) return;
        if (m.metodoPago === 'Efectivo') {
            if (m.tipo === 'INGRESO') {
                ingresosMovimientosEfectivo += Number(m.monto);
            } else if (m.tipo === 'EGRESO') {
                if (m.concepto !== 'REEMBOLSO_GARANTIA') {
                    egresosMovimientosEfectivo += Number(m.monto);
                }
            }
        }
    });

    // Expected cash in register (adjusted for bank drops/withdrawals)
    const esperadoEfectivo = saldoInicial + ventasEfectivo + rentasEfectivo + soporteEfectivo + abonosEfectivo + ingresosMovimientosEfectivo - egresosMovimientosEfectivo;

    const serializedSession = {
        id: session.id,
        estado: session.estado,
        saldoInicial: Number(session.saldoInicial),
        saldoFinalEfectivo: session.saldoFinalEfectivo ? Number(session.saldoFinalEfectivo) : null,
        diferencia: session.diferencia ? Number(session.diferencia) : null,
        observaciones: session.observaciones,
        aperturaAt: session.aperturaAt.toISOString(),
        cierreAt: session.cierreAt ? session.cierreAt.toISOString() : null,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        creadoPor: session.creadoPor ? {
            nombre: session.creadoPor.nombre,
            apellido: session.creadoPor.apellido,
            email: session.creadoPor.email
        } : null,
        modificadoPor: session.modificadoPor ? {
            nombre: session.modificadoPor.nombre,
            apellido: session.modificadoPor.apellido,
            email: session.modificadoPor.email
        } : null,
        cerradoPor: session.cerradoPor ? {
            nombre: session.cerradoPor.nombre,
            apellido: session.cerradoPor.apellido,
            email: session.cerradoPor.email
        } : null,
        facturas: session.facturas.map(f => ({
            id: f.id,
            correlativo: f.correlativo,
            total: Number(f.total),
            metodoPago: f.metodoPago === 'Tarjeta de Crédito/Débito' ? 'Tarjeta' : f.metodoPago,
            fechaEmision: f.fechaEmision.toISOString(),
            clienteNombre: f.cliente?.nombre || 'Cliente General',
            transferenciaConfirmada: f.transferenciaConfirmada,
            pagosMixtos: f.pagosMixtos ? f.pagosMixtos.map((p: any) => ({
                id: p.id,
                metodoPago: p.metodoPago === 'Tarjeta de Crédito/Débito' ? 'Tarjeta' : p.metodoPago,
                monto: Number(p.monto)
            })) : []
        })),
        rentasPagos: session.rentasPagos.map(p => ({
            id: p.id,
            monto: Number(p.monto),
            metodoPago: p.metodoPago === 'Tarjeta de Crédito/Débito' ? 'Tarjeta' : p.metodoPago,
            fechaPago: p.fechaPago.toISOString(),
            clienteNombre: p.renta?.cliente?.nombre || 'Cliente General',
            equipoNombre: p.renta?.activoFijo?.descripcionCorta || 'Equipo',
            notas: p.notas || ''
        })),
        ordenesTrabajo: session.ordenesTrabajo.map(o => ({
            id: o.id,
            codigoSeguridad: o.codigoSeguridad,
            total: Number(o.costoRevision),
            metodoPago: o.metodoPagoRevision === 'Tarjeta de Crédito/Débito' ? 'Tarjeta' : o.metodoPagoRevision,
            fechaRecibido: o.fechaRecibido.toISOString(),
            clienteNombre: o.cliente?.nombre || 'Cliente General',
            equipoDano: o.equipoDano || 'Equipo'
        })),
        movimientos: session.movimientos.map(m => ({
            id: m.id,
            tipo: m.tipo,
            concepto: m.concepto,
            descripcion: m.descripcion,
            monto: Number(m.monto),
            metodoPago: m.metodoPago === 'Tarjeta de Crédito/Débito' ? 'Tarjeta' : m.metodoPago,
            referenciaId: m.referenciaId,
            createdAt: m.createdAt.toISOString(),
            anuladaAt: m.anuladaAt ? m.anuladaAt.toISOString() : null,
            creadoPor: m.creadoPor ? { nombre: m.creadoPor.nombre, email: m.creadoPor.email } : null,
            anuladaPor: m.anuladaPor ? { nombre: m.anuladaPor.nombre, email: m.anuladaPor.email } : null
        })),
        pagosCliente: session.pagosCliente.map(p => ({
            id: p.id,
            monto: Number(p.monto),
            metodoPago: p.metodoPago === 'Tarjeta de Crédito/Débito' ? 'Tarjeta' : p.metodoPago,
            fecha: p.fecha.toISOString(),
            clienteNombre: p.cliente?.nombre || 'Cliente General',
            notas: p.notas || '',
            anulado: p.anulado
        }))
    };

    return {
        session: serializedSession,
        summary,
        totals: {
            saldoInicial,
            totalVentas,
            totalRentas,
            totalSoporte,
            ventasEfectivo,
            rentasEfectivo,
            soporteEfectivo,
            abonosEfectivo,
            esperadoEfectivo,
            totalIngresos: totalVentas + totalRentas + totalSoporte + totalAbonos
        }
    };
}

// Close Session Action (fully serialized)
export async function cerrarCaja(sessionId: string, saldoReal: number, observaciones: string) {
    const user = await getAuthenticatedUser();

    // 1. Calculate expected total
    const summaryData = await getCajaSessionSummary(sessionId);
    const esperadoEfectivo = summaryData.totals.esperadoEfectivo;

    // 2. Discrepancy
    const diferencia = saldoReal - esperadoEfectivo;

    // 3. Update DB
    const sessionCerrada = await prisma.corteCajaSession.update({
        where: {
            id: sessionId,
            organizationId: user.organizationId
        },
        data: {
            estado: 'CERRADA',
            saldoFinalEfectivo: new Prisma.Decimal(saldoReal),
            diferencia: new Prisma.Decimal(diferencia),
            observaciones,
            cierreAt: new Date(),
            cerradoPorId: user.id,
            modificadoPorId: user.id
        }
    });

    revalidatePath('/cierre-caja');
    revalidatePath('/facturas/pos');

    return {
        id: sessionCerrada.id,
        estado: sessionCerrada.estado
    };
}

// Star Products & Services rotation report
export async function getProductRotationReport(sessionId: string) {
    const user = await getAuthenticatedUser();

    const facturas = await prisma.factura.findMany({
        where: {
            cajaSessionId: sessionId,
            organizationId: user.organizationId,
            estado: { not: 'ANULADA' }
        },
        include: {
            detalles: true
        }
    });

    const productsMap: Record<string, { sku: string; nombre: string; cantidad: number; total: number; esServicio: boolean }> = {};

    facturas.forEach(f => {
        f.detalles.forEach(d => {
            const key = d.productoId || d.activoId || d.descripcion;
            if (!productsMap[key]) {
                productsMap[key] = {
                    sku: d.productoId ? 'PROD' : d.activoId ? 'ACTIVO' : 'SERV',
                    nombre: d.descripcion,
                    cantidad: 0,
                    total: 0,
                    esServicio: d.productoId ? false : true
                };
            }
            productsMap[key].cantidad += d.cantidad;
            productsMap[key].total += Number(d.totalLinea);
        });
    });

    const rotationList = Object.values(productsMap).sort((a, b) => b.cantidad - a.cantidad);
    return rotationList;
}

// Historial of previous closed sessions (fully serialized)
export async function getHistorialCortes() {
    try {
        const user = await getAuthenticatedUser();
        const cortes = await prisma.corteCajaSession.findMany({
            where: {
                organizationId: user.organizationId,
                estado: 'CERRADA'
            },
            include: {
                creadoPor: true,
                modificadoPor: true,
                cerradoPor: true
            },
            orderBy: {
                cierreAt: 'desc'
            },
            take: 50
        });

        return cortes.map(c => ({
            id: c.id,
            estado: c.estado,
            saldoInicial: Number(c.saldoInicial),
            saldoFinalEfectivo: c.saldoFinalEfectivo ? Number(c.saldoFinalEfectivo) : null,
            diferencia: c.diferencia ? Number(c.diferencia) : null,
            observaciones: c.observaciones,
            aperturaAt: c.aperturaAt.toISOString(),
            cierreAt: c.cierreAt ? c.cierreAt.toISOString() : null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            creadoPor: c.creadoPor ? { nombre: c.creadoPor.nombre, apellido: c.creadoPor.apellido, email: c.creadoPor.email } : null,
            modificadoPor: c.modificadoPor ? { nombre: c.modificadoPor.nombre, apellido: c.modificadoPor.apellido, email: c.modificadoPor.email } : null,
            cerradoPor: c.cerradoPor ? { nombre: c.cerradoPor.nombre, apellido: c.cerradoPor.apellido, email: c.cerradoPor.email } : null
        }));
    } catch (e) {
        console.error("Error en getHistorialCortes:", e);
        return [];
    }
}

// Get rent contracts with pending guarantees
export async function getPendingDeposits() {
    try {
        const user = await getAuthenticatedUser();
        const rentas = await prisma.rentaEquipo.findMany({
            where: {
                organizationId: user.organizationId,
                deposito: { gt: 0 }
            },
            include: {
                cliente: true,
                activoFijo: true
            }
        });
        
        return rentas.filter(r => {
            const dep = Number(r.deposito);
            const dev = r.depositoDevuelto ? Number(r.depositoDevuelto) : 0;
            return dev < dep;
        }).map(r => ({
            id: r.id,
            clienteNombre: r.cliente?.nombre || 'Cliente General',
            equipoNombre: r.activoFijo?.descripcionCorta || 'Equipo',
            equipoSerie: r.activoFijo?.serie || 'S/N',
            equipoIdQr: r.activoFijo?.idQr || 'Sin QR',
            deposito: Number(r.deposito),
            depositoDevuelto: r.depositoDevuelto ? Number(r.depositoDevuelto) : 0,
            saldoPendiente: Number(r.deposito) - (r.depositoDevuelto ? Number(r.depositoDevuelto) : 0)
        }));
    } catch (e) {
        console.error("Error en getPendingDeposits:", e);
        return [];
    }
}

// Register a cash register movement (Withdrawal/Remittance, Guarantee Refund, or Transfer to Caja Chica)
export async function registrarCorteMovimiento(payload: {
    sessionId: string;
    tipo: 'INGRESO' | 'EGRESO';
    concepto: 'RETIRO_BANCARIO' | 'REEMBOLSO_GARANTIA' | 'TRASPASO_CAJA_CHICA' | 'OTRO' | string;
    descripcion: string;
    monto: number;
    metodoPago: string;
    referenciaId?: string;
}) {
    const user = await getAuthenticatedUser();

    const session = await prisma.corteCajaSession.findUnique({
        where: {
            id: payload.sessionId,
            organizationId: user.organizationId,
            estado: 'ABIERTA'
        }
    });

    if (!session) {
        throw new Error("No se encontró una sesión de caja abierta.");
    }

    if (payload.monto <= 0) {
        throw new Error("El monto debe ser mayor a 0.");
    }

    // Business rules for Refund
    if (payload.concepto === 'REEMBOLSO_GARANTIA') {
        if (!payload.referenciaId) {
            throw new Error("Se requiere la referencia del contrato de renta original.");
        }

        const renta = await prisma.rentaEquipo.findUnique({
            where: {
                id: payload.referenciaId,
                organizationId: user.organizationId
            }
        });

        if (!renta) {
            throw new Error("No se encontró el contrato de renta especificado.");
        }

        const dep = Number(renta.deposito);
        const dev = renta.depositoDevuelto ? Number(renta.depositoDevuelto) : 0;
        const maxReembolso = dep - dev;

        if (payload.monto > maxReembolso) {
            throw new Error(`El monto a reembolsar (L. ${payload.monto.toFixed(2)}) supera el saldo de garantía pendiente (L. ${maxReembolso.toFixed(2)}).`);
        }

        if (payload.metodoPago === 'Efectivo' && payload.monto >= 2000) {
            throw new Error("Los reembolsos mayores o iguales a L. 2,000.00 deben realizarse mediante Transferencia Bancaria para evitar descapitalizar la caja.");
        }

        // Perform updates inside a transaction
        await prisma.$transaction(async (tx) => {
            await tx.rentaEquipo.update({
                where: { id: renta.id },
                data: {
                    depositoDevuelto: new Prisma.Decimal(dev + payload.monto)
                }
            });

            // Create negative RentaPago
            await tx.rentaPago.create({
                data: {
                    organizationId: user.organizationId,
                    rentaId: renta.id,
                    monto: new Prisma.Decimal(-payload.monto),
                    metodoPago: payload.metodoPago,
                    notas: `Reembolso de Garantía (${payload.descripcion || 'Caja Diario'})`,
                    creadoPorId: user.id,
                    cajaSessionId: session.id
                }
            });

            // Create CorteCajaMovimiento
            await tx.corteCajaMovimiento.create({
                data: {
                    organizationId: user.organizationId,
                    sessionId: session.id,
                    tipo: payload.tipo,
                    concepto: payload.concepto,
                    descripcion: payload.descripcion,
                    monto: new Prisma.Decimal(payload.monto),
                    metodoPago: payload.metodoPago,
                    referenciaId: renta.id,
                    creadoPorId: user.id
                }
            });
        });
    } else if (payload.concepto === 'TRASPASO_CAJA_CHICA') {
        // Find active Caja Chica session
        const openCajaChica = await prisma.cajaChicaSession.findFirst({
            where: {
                organizationId: user.organizationId,
                estado: 'ABIERTA'
            }
        });

        if (!openCajaChica) {
            throw new Error("No se puede realizar el traslado porque no hay una sesión de Caja Chica abierta.");
        }

        await prisma.$transaction(async (tx) => {
            const movChica = await tx.cajaChicaMovimiento.create({
                data: {
                    sessionId: openCajaChica.id,
                    tipo: 'INGRESO',
                    categoria: 'Cobro de venta',
                    descripcion: payload.descripcion || 'Traslado de fondos desde Caja de Ventas',
                    documento: 'RECIBO',
                    importe: payload.monto,
                    moneda: 'HNL',
                    tipoCambio: 1,
                    total: payload.monto,
                    beneficiario: 'Caja Chica',
                    creadoPorId: user.id
                }
            });

            await tx.corteCajaMovimiento.create({
                data: {
                    organizationId: user.organizationId,
                    sessionId: session.id,
                    tipo: payload.tipo,
                    concepto: payload.concepto,
                    descripcion: payload.descripcion,
                    monto: new Prisma.Decimal(payload.monto),
                    metodoPago: payload.metodoPago,
                    referenciaId: movChica.id,
                    creadoPorId: user.id
                }
            });
        });

        revalidatePath('/caja-chica');
    } else {
        // Register standard movement (e.g. Bank withdrawal/drop)
        await prisma.corteCajaMovimiento.create({
            data: {
                organizationId: user.organizationId,
                sessionId: session.id,
                tipo: payload.tipo,
                concepto: payload.concepto,
                descripcion: payload.descripcion,
                monto: new Prisma.Decimal(payload.monto),
                metodoPago: payload.metodoPago,
                referenciaId: payload.referenciaId || null,
                creadoPorId: user.id
            }
        });
    }

    revalidatePath('/cierre-caja');
    return { success: true };
}

// Annul a cash register movement
export async function anularCorteMovimiento(movimientoId: string) {
    const user = await getAuthenticatedUser();

    const mov = await prisma.corteCajaMovimiento.findUnique({
        where: {
            id: movimientoId,
            organizationId: user.organizationId
        }
    });

    if (!mov) {
        throw new Error("No se encontró el movimiento de caja.");
    }

    if (mov.anuladaAt) {
        throw new Error("El movimiento ya está anulado.");
    }

    // Check if session is closed
    const session = await prisma.corteCajaSession.findUnique({
        where: { id: mov.sessionId }
    });

    if (session?.estado === 'CERRADA') {
        throw new Error("No se pueden anular movimientos de un turno de caja cerrado.");
    }

    await prisma.$transaction(async (tx) => {
        if (mov.concepto === 'REEMBOLSO_GARANTIA' && mov.referenciaId) {
            const renta = await tx.rentaEquipo.findUnique({
                where: { id: mov.referenciaId }
            });

            if (renta) {
                const dev = renta.depositoDevuelto ? Number(renta.depositoDevuelto) : 0;
                const nuevoDev = Math.max(0, dev - Number(mov.monto));
                await tx.rentaEquipo.update({
                    where: { id: renta.id },
                    data: {
                        depositoDevuelto: new Prisma.Decimal(nuevoDev)
                    }
                });
            }

            // Find and delete the negative RentaPago
            const pagoNegativo = await tx.rentaPago.findFirst({
                where: {
                    rentaId: mov.referenciaId,
                    cajaSessionId: mov.sessionId,
                    monto: new Prisma.Decimal(-Number(mov.monto))
                }
            });

            if (pagoNegativo) {
                await tx.rentaPago.delete({
                    where: { id: pagoNegativo.id }
                });
            }
        } else if (mov.concepto === 'TRASPASO_CAJA_CHICA' && mov.referenciaId) {
            // Find and annul linked CajaChicaMovimiento
            const movChica = await tx.cajaChicaMovimiento.findUnique({
                where: { id: mov.referenciaId }
            });

            if (movChica && movChica.estado !== 'ANULADO') {
                await tx.cajaChicaMovimiento.update({
                    where: { id: movChica.id },
                    data: {
                        estado: 'ANULADO',
                        anuladaAt: new Date(),
                        anuladaPorId: user.id
                    }
                });
            }
        }

        // Logical delete of the movement
        await tx.corteCajaMovimiento.update({
            where: { id: mov.id },
            data: {
                anuladaAt: new Date(),
                anuladaPorId: user.id
            }
        });
    });

    revalidatePath('/cierre-caja');
    revalidatePath('/caja-chica');
    return { success: true };
}
