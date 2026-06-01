'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) throw new Error("Usuario no encontrado en base de datos");

    const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Usuario';
    return { ...dbUser, fullName };
}

export async function getGraficasReportData(month: number, year: number) {
    try {
        const user = await getAuthenticatedUser();
        const orgId = user.organizationId;

        // Boundaries of selected month
        const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        // 1. Fetch sales (Factura)
        const facturas = await prisma.factura.findMany({
            where: {
                organizationId: orgId,
                fechaEmision: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            include: {
                creadoPor: {
                    select: { nombre: true, apellido: true }
                },
                anuladaPor: {
                    select: { nombre: true, apellido: true }
                },
                cliente: {
                    select: { nombre: true }
                }
            },
            orderBy: {
                fechaEmision: 'desc'
            }
        });

        // 2. Fetch rental equipment (RentaEquipo)
        const rentas = await prisma.rentaEquipo.findMany({
            where: {
                organizationId: orgId,
                fechaInicio: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            include: {
                creadoPor: {
                    select: { nombre: true, apellido: true }
                },
                cliente: {
                    select: { nombre: true }
                },
                activoFijo: {
                    select: { descripcionCorta: true }
                }
            },
            orderBy: {
                fechaInicio: 'desc'
            }
        });

        // 3. Fetch rental payments (RentaPago) to compute cash flow
        const rentasPagos = await prisma.rentaPago.findMany({
            where: {
                organizationId: orgId,
                fechaPago: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            select: {
                id: true,
                monto: true,
                creadoPorId: true
            }
        });

        // 4. Fetch support tickets (OrdenTrabajo)
        const ordenes = await prisma.ordenTrabajo.findMany({
            where: {
                organizationId: orgId,
                fechaRecibido: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            include: {
                cliente: {
                    select: { nombre: true }
                },
                usuarioRecepcion: {
                    select: { nombre: true, apellido: true }
                },
                tecnicoReparacion: {
                    select: { nombre: true, apellido: true }
                }
            },
            orderBy: {
                fechaRecibido: 'desc'
            }
        });

        // 5. Fetch Petty cash movements (CajaChicaMovimiento)
        const cajaMovimientos = await prisma.cajaChicaMovimiento.findMany({
            where: {
                session: {
                    organizationId: orgId
                },
                estado: { not: 'ANULADO' },
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            select: {
                id: true,
                tipo: true,
                categoria: true,
                descripcion: true,
                total: true,
                createdAt: true,
                creadoPorId: true,
                creadoPor: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 6. Fetch all employees (User)
        const employees = await prisma.user.findMany({
            where: {
                organizationId: orgId
            },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                role: true
            }
        });

        // Calculations & aggregates (excluding 'ANULADA' status)
        const activeFacturas = facturas.filter(f => f.estado !== 'ANULADA' && f.tipoDocumento === 'FACTURA');
        const activeRentas = rentas.filter(r => r.estado !== 'ANULADA');
        const activeOrdenes = ordenes.filter(o => o.estado !== 'ANULADA');

        // Cotizaciones
        const activeCotizaciones = facturas.filter(f => f.tipoDocumento === 'COTIZACION' && f.estado !== 'ANULADA');
        const totalCotizaciones = activeCotizaciones.reduce((sum, f) => sum + Number(f.total), 0);
        const convertedCotizacionesCount = activeCotizaciones.filter(c => c.estado === 'CONVERTIDA').length;

        const totalVentas = activeFacturas.reduce((sum, f) => sum + Number(f.total), 0);
        const totalRentas = activeRentas.reduce((sum, r) => sum + Number(r.costoRenta), 0);
        
        let totalSoporte = 0;
        activeOrdenes.forEach(o => {
            totalSoporte += Number(o.costoRevision);
            if (o.aprobado && o.costoReparacion) {
                totalSoporte += Number(o.costoReparacion);
            }
        });

        let totalCajaSalidas = 0;
        let totalCajaIngresos = 0;
        const cajaGastosPorCategoria: Record<string, number> = {};

        cajaMovimientos.forEach(m => {
            if (m.tipo === 'SALIDA') {
                totalCajaSalidas += m.total;
                cajaGastosPorCategoria[m.categoria] = (cajaGastosPorCategoria[m.categoria] || 0) + m.total;
            } else if (m.tipo === 'INGRESO') {
                totalCajaIngresos += m.total;
            }
        });

        // Compute daily breakdown for line chart
        const totalDays = new Date(year, month, 0).getDate();
        const dailyStats = Array.from({ length: totalDays }, (_, i) => ({
            dia: i + 1,
            ventas: 0,
            rentas: 0,
            soporte: 0
        }));

        activeFacturas.forEach(f => {
            const day = new Date(f.fechaEmision).getDate();
            if (day >= 1 && day <= totalDays) {
                dailyStats[day - 1].ventas += Number(f.total);
            }
        });

        activeRentas.forEach(r => {
            const day = new Date(r.fechaInicio).getDate();
            if (day >= 1 && day <= totalDays) {
                dailyStats[day - 1].rentas += Number(r.costoRenta);
            }
        });

        activeOrdenes.forEach(o => {
            const day = new Date(o.fechaRecibido).getDate();
            if (day >= 1 && day <= totalDays) {
                let revenue = Number(o.costoRevision);
                if (o.aprobado && o.costoReparacion) {
                    revenue += Number(o.costoReparacion);
                }
                dailyStats[day - 1].soporte += revenue;
            }
        });

        // Compute employee performance matrix
        const employeeStats = employees.map(emp => {
            const empFacturas = activeFacturas.filter(f => f.creadoPorId === emp.id);
            const empRentas = activeRentas.filter(r => r.creadoPorId === emp.id);
            const empRecepcion = activeOrdenes.filter(o => o.usuarioRecepcionId === emp.id);
            const empReparaciones = activeOrdenes.filter(o => o.tecnicoReparacionId === emp.id && ['REPARADA', 'LISTO', 'ENTREGADO'].includes(o.estado));
            const empCaja = cajaMovimientos.filter(m => m.creadoPorId === emp.id);

            const vTotal = empFacturas.reduce((sum, f) => sum + Number(f.total), 0);
            const rTotal = empRentas.reduce((sum, r) => sum + Number(r.costoRenta), 0);

            let sTotal = 0;
            activeOrdenes.filter(o => o.tecnicoReparacionId === emp.id).forEach(o => {
                if (o.aprobado && o.costoReparacion) {
                    sTotal += Number(o.costoReparacion);
                }
            });

            return {
                id: emp.id,
                nombre: [emp.nombre, emp.apellido].filter(Boolean).join(' ') || emp.email.split('@')[0],
                email: emp.email,
                role: emp.role,
                ventasCount: empFacturas.length,
                ventasMonto: vTotal,
                rentasCount: empRentas.length,
                rentasMonto: rTotal,
                soporteCount: empRecepcion.length + empReparaciones.length,
                soporteMonto: sTotal,
                cajaChicaCount: empCaja.length
            };
        });

        // Serialize full data including raw list for details modals
        return {
            responsable: user.fullName,
            ventasCount: activeFacturas.length,
            ventasMonto: totalVentas,
            cotizacionesCount: activeCotizaciones.length,
            cotizacionesMonto: totalCotizaciones,
            cotizacionesConvertidasCount: convertedCotizacionesCount,
            rentasCount: activeRentas.length,
            rentasMonto: totalRentas,
            soporteCount: activeOrdenes.length,
            soporteMonto: totalSoporte,
            cajaChicaIngresos: totalCajaIngresos,
            cajaChicaEgresos: totalCajaSalidas,
            dailyStats,
            employeeStats,
            cajaGastosPorCategoria: Object.entries(cajaGastosPorCategoria).map(([categoria, total]) => ({
                categoria,
                total
            })),
            // Raw arrays for modals
            rawFacturas: facturas.filter(f => f.tipoDocumento === 'FACTURA' || f.tipoDocumento === 'NOTA_CREDITO').map(f => ({
                id: f.id,
                correlativo: f.correlativo,
                total: Number(f.total),
                fechaEmision: f.fechaEmision.toISOString(),
                estado: f.estado,
                creadoPor: f.creadoPor ? [f.creadoPor.nombre, f.creadoPor.apellido].filter(Boolean).join(' ') : 'Usuario',
                anuladaPor: f.anuladaPor ? [f.anuladaPor.nombre, f.anuladaPor.apellido].filter(Boolean).join(' ') : null,
                anuladaAt: f.anuladaAt ? f.anuladaAt.toISOString() : null,
                cliente: f.cliente?.nombre || 'Cliente General'
            })),
            rawCotizaciones: facturas.filter(f => f.tipoDocumento === 'COTIZACION').map(f => ({
                id: f.id,
                correlativo: f.correlativo,
                total: Number(f.total),
                fechaEmision: f.fechaEmision.toISOString(),
                estado: f.estado,
                creadoPor: f.creadoPor ? [f.creadoPor.nombre, f.creadoPor.apellido].filter(Boolean).join(' ') : 'Usuario',
                anuladaPor: f.anuladaPor ? [f.anuladaPor.nombre, f.anuladaPor.apellido].filter(Boolean).join(' ') : null,
                anuladaAt: f.anuladaAt ? f.anuladaAt.toISOString() : null,
                cliente: f.cliente?.nombre || 'Cliente General',
                convertidoAt: f.convertidoAt ? f.convertidoAt.toISOString() : null
            })),
            rawRentas: rentas.map(r => ({
                id: r.id,
                equipo: r.activoFijo?.descripcionCorta || 'Equipo',
                costoRenta: Number(r.costoRenta),
                deposito: Number(r.deposito),
                fechaInicio: r.fechaInicio.toISOString(),
                estado: r.estado,
                creadoPor: r.creadoPor ? [r.creadoPor.nombre, r.creadoPor.apellido].filter(Boolean).join(' ') : 'Usuario',
                cliente: r.cliente?.nombre || 'Cliente General'
            })),
            rawOrdenes: ordenes.map(o => ({
                id: o.id,
                equipo: o.equipoDano,
                costoRevision: Number(o.costoRevision),
                costoReparacion: o.costoReparacion ? Number(o.costoReparacion) : 0,
                aprobado: o.aprobado,
                estado: o.estado,
                fechaRecibido: o.fechaRecibido.toISOString(),
                cliente: o.cliente?.nombre || 'Cliente General',
                recepcionadoPor: o.usuarioRecepcion ? [o.usuarioRecepcion.nombre, o.usuarioRecepcion.apellido].filter(Boolean).join(' ') : 'Usuario',
                tecnico: o.tecnicoReparacion ? [o.tecnicoReparacion.nombre, o.tecnicoReparacion.apellido].filter(Boolean).join(' ') : 'Sin asignar'
            })),
            cajaChicaMovimientos: cajaMovimientos.map(m => ({
                id: m.id,
                tipo: m.tipo,
                categoria: m.categoria,
                descripcion: m.descripcion,
                total: m.total,
                createdAt: m.createdAt.toISOString(),
                creadorPor: m.creadoPor ? [m.creadoPor.nombre, m.creadoPor.apellido].filter(Boolean).join(' ') : 'Usuario'
            }))
        };
    } catch (e) {
        console.error("Error en getGraficasReportData:", e);
        throw e;
    }
}

export async function anularFactura(id: string) {
    try {
        const user = await getAuthenticatedUser();
        await prisma.factura.update({
            where: { id, organizationId: user.organizationId },
            data: {
                estado: 'ANULADA',
                anuladaPorId: user.id,
                anuladaAt: new Date()
            }
        });
        revalidatePath('/graficas');
        return { success: true };
    } catch (e: any) {
        console.error("Error al anular factura:", e);
        return { success: false, error: e.message };
    }
}

export async function anularRenta(id: string) {
    try {
        const user = await getAuthenticatedUser();
        await prisma.rentaEquipo.update({
            where: { id, organizationId: user.organizationId },
            data: {
                estado: 'ANULADA'
            }
        });
        revalidatePath('/graficas');
        return { success: true };
    } catch (e: any) {
        console.error("Error al anular renta:", e);
        return { success: false, error: e.message };
    }
}

export async function anularOrden(id: string) {
    try {
        const user = await getAuthenticatedUser();
        await prisma.ordenTrabajo.update({
            where: { id, organizationId: user.organizationId },
            data: {
                estado: 'ANULADA'
            }
        });
        revalidatePath('/graficas');
        return { success: true };
    } catch (e: any) {
        console.error("Error al anular orden de trabajo:", e);
        return { success: false, error: e.message };
    }
}
