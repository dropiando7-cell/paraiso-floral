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

// Active Session Helper - Returns open session if any (fully serialized)
export async function getActiveCajaSession() {
    try {
        const user = await getAuthenticatedUser();
        const active = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId: user.organizationId,
                estado: 'ABIERTA'
            },
            include: {
                creadoPor: true,
                facturas: true,
                rentasPagos: true
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
            creadoPor: active.creadoPor ? {
                nombre: active.creadoPor.nombre,
                apellido: active.creadoPor.apellido,
                email: active.creadoPor.email
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

    revalidatePath('/cierre-caja');
    revalidatePath('/facturas/pos');

    return {
        id: nuevaSesion.id,
        estado: nuevaSesion.estado,
        saldoInicial: Number(nuevaSesion.saldoInicial),
        aperturaAt: nuevaSesion.aperturaAt.toISOString()
    };
}

// Summary Calculation Helper (fully serialized)
export async function getCajaSessionSummary(sessionId: string) {
    const user = await getAuthenticatedUser();

    const session = await prisma.corteCajaSession.findUnique({
        where: {
            id: sessionId,
            organizationId: user.organizationId
        },
        include: {
            creadoPor: true,
            cerradoPor: true,
            facturas: {
                where: { estado: { not: 'ANULADA' } }
            },
            rentasPagos: true
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
        egresos: 0
    };

    // Classify Facturas
    session.facturas.forEach(f => {
        const metodo = f.metodoPago || 'Efectivo';
        const total = Number(f.total);
        if (summary.ventas[metodo] !== undefined) {
            summary.ventas[metodo] += total;
        } else {
            summary.ventas[metodo] = total;
        }
    });

    // Classify RentaPagos
    session.rentasPagos.forEach(p => {
        const metodo = p.metodoPago || 'Efectivo';
        const total = Number(p.monto);
        if (summary.rentas[metodo] !== undefined) {
            summary.rentas[metodo] += total;
        } else {
            summary.rentas[metodo] = total;
        }
    });

    const totalVentas = Object.values(summary.ventas).reduce((sum, v) => sum + v, 0);
    const totalRentas = Object.values(summary.rentas).reduce((sum, r) => sum + r, 0);

    const saldoInicial = Number(session.saldoInicial);
    const ventasEfectivo = summary.ventas['Efectivo'] || 0;
    const rentasEfectivo = summary.rentas['Efectivo'] || 0;

    // Expected cash in register
    const esperadoEfectivo = saldoInicial + ventasEfectivo + rentasEfectivo;

    const serializedSession = {
        id: session.id,
        estado: session.estado,
        saldoInicial: Number(session.saldoInicial),
        saldoFinalEfectivo: session.saldoFinalEfectivo ? Number(session.saldoFinalEfectivo) : null,
        diferencia: session.diferencia ? Number(session.diferencia) : null,
        observaciones: session.observaciones,
        aperturaAt: session.aperturaAt.toISOString(),
        cierreAt: session.cierreAt ? session.cierreAt.toISOString() : null,
        creadoPor: session.creadoPor ? {
            nombre: session.creadoPor.nombre,
            apellido: session.creadoPor.apellido,
            email: session.creadoPor.email
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
            metodoPago: f.metodoPago,
            fechaEmision: f.fechaEmision.toISOString()
        })),
        rentasPagos: session.rentasPagos.map(p => ({
            id: p.id,
            monto: Number(p.monto),
            metodoPago: p.metodoPago,
            fechaPago: p.fechaPago.toISOString()
        }))
    };

    return {
        session: serializedSession,
        summary,
        totals: {
            saldoInicial,
            totalVentas,
            totalRentas,
            ventasEfectivo,
            rentasEfectivo,
            esperadoEfectivo,
            totalIngresos: totalVentas + totalRentas
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
            creadoPor: c.creadoPor ? { nombre: c.creadoPor.nombre, apellido: c.creadoPor.apellido } : null,
            cerradoPor: c.cerradoPor ? { nombre: c.cerradoPor.nombre, apellido: c.cerradoPor.apellido } : null
        }));
    } catch (e) {
        console.error("Error en getHistorialCortes:", e);
        return [];
    }
}
