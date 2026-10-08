'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getR2UploadUrl } from '@/lib/storage/r2';
import { Prisma } from '@prisma/client';

export async function getCajaVentasStatus(organizationId: string) {
  try {
    const active = await prisma.corteCajaSession.findFirst({
      where: {
        organizationId,
        estado: 'ABIERTA'
      },
      include: {
        facturas: {
          where: {
            estado: { not: 'ANULADA' },
            tipoDocumento: 'FACTURA'
          },
          include: {
            pagosMixtos: true
          }
        },
        rentasPagos: true,
        ordenesTrabajo: true,
        movimientos: {
          where: {
            anuladaAt: null
          }
        },
        pagosCliente: {
          where: {
            anulado: false
          }
        }
      }
    });

    if (!active) {
      return {
        success: true,
        abierta: false,
        message: 'La caja de ventas no está aperturada.',
        session: null
      };
    }

    const saldoInicial = Number(active.saldoInicial);

    let ventasEfectivo = 0;
    active.facturas.forEach((f) => {
      let metodo = f.metodoPago || 'Efectivo';
      if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
      if (metodo === 'Transferencia' && f.transferenciaConfirmada === false) return;

      if (metodo === 'MIXTO' && f.pagosMixtos && f.pagosMixtos.length > 0) {
        f.pagosMixtos.forEach((p: any) => {
          let pMetodo = p.metodoPago;
          if (pMetodo === 'Efectivo') {
            ventasEfectivo += Number(p.monto);
          }
        });
      } else if (metodo === 'Efectivo') {
        ventasEfectivo += Number(f.total);
      }
    });

    let rentasEfectivo = 0;
    active.rentasPagos.forEach((r) => {
      let metodo = r.metodoPago || 'Efectivo';
      if (metodo === 'Efectivo') {
        rentasEfectivo += Number(r.monto);
      }
    });

    let soporteEfectivo = 0;
    active.ordenesTrabajo.forEach((o) => {
      let metodo = o.metodoPagoRevision || 'Efectivo';
      if (metodo === 'Efectivo') {
        soporteEfectivo += Number(o.costoRevision);
      }
    });

    let abonosEfectivo = 0;
    active.pagosCliente.forEach((p) => {
      let rawMetodo = (p.metodoPago || 'Efectivo').toUpperCase();
      if (rawMetodo.includes('EFECTIVO')) {
        abonosEfectivo += Number(p.monto);
      }
    });

    let ingresosMovimientosEfectivo = 0;
    let egresosMovimientosEfectivo = 0;
    active.movimientos.forEach((m) => {
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

    const disponibleEfectivo = Math.max(
      0,
      saldoInicial +
        ventasEfectivo +
        rentasEfectivo +
        soporteEfectivo +
        abonosEfectivo +
        ingresosMovimientosEfectivo -
        egresosMovimientosEfectivo
    );

    return {
      success: true,
      abierta: true,
      session: {
        id: active.id,
        saldoInicial,
        disponibleEfectivo,
        ventasEfectivo: ventasEfectivo + rentasEfectivo + soporteEfectivo + abonosEfectivo,
        aperturaAt: active.aperturaAt.toISOString()
      }
    };
  } catch (error) {
    console.error('Error in getCajaVentasStatus:', error);
    return { success: false, error: 'Error al consultar estado de la caja de ventas' };
  }
}

export async function getOpenSession(organizationId: string) {
  try {
    const session = await prisma.cajaChicaSession.findFirst({
      where: {
        organizationId,
        estado: 'ABIERTA'
      },
      include: {
        movimientos: {
          where: { estado: 'REGISTRADO' },
          orderBy: { createdAt: 'desc' },
          include: {
            creadoPor: { select: { nombre: true, apellido: true, email: true } },
            anuladaPor: { select: { nombre: true, apellido: true } }
          }
        },
        creadoPor: { select: { nombre: true, apellido: true } }
      }
    });

    return { success: true, session };
  } catch (error) {
    console.error('Error in getOpenSession:', error);
    return { success: false, error: 'Failed to fetch open session' };
  }
}

export async function openCajaChicaSession(organizationId: string, saldoInicial: number, userId: string) {
  try {
    // Check if one is already open
    const openSession = await prisma.cajaChicaSession.findFirst({
      where: { organizationId, estado: 'ABIERTA' }
    });
    
    if (openSession) {
      return { success: false, error: 'Ya existe una caja abierta.' };
    }

    const session = await prisma.cajaChicaSession.create({
      data: {
        organizationId,
        saldoInicial,
        estado: 'ABIERTA',
        creadoPorId: userId
      }
    });

    revalidatePath('/caja-chica');
    return { success: true, session };
  } catch (error) {
    console.error('Error opening session:', error);
    return { success: false, error: 'Error al abrir caja' };
  }
}

export async function openAndFundCajaChicaSession(organizationId: string, data: any, userId: string) {
  try {
    const openSession = await prisma.cajaChicaSession.findFirst({
      where: { organizationId, estado: 'ABIERTA' }
    });
    
    if (openSession) {
      return { success: false, error: 'Ya existe una caja abierta.' };
    }

    const montoNum = Number(data.total || data.importe || 0);
    const esDeCajaVentas =
      data.categoria === 'Cobro de venta' ||
      (data.origenFondos && (
        data.origenFondos.toLowerCase().includes('caja de ventas') ||
        data.origenFondos.toLowerCase().includes('cobro') ||
        data.origenFondos.toLowerCase().includes('ventas')
      ));

    if (esDeCajaVentas) {
      const estadoVentas = await getCajaVentasStatus(organizationId);
      if (!estadoVentas.success || !estadoVentas.abierta || !estadoVentas.session) {
        return {
          success: false,
          error: 'No se puede fondear desde la caja de ventas: La Caja de Ventas no está aperturada. Primero abre el turno en Cierre de Caja.'
        };
      }

      const disponible = estadoVentas.session.disponibleEfectivo;
      if (montoNum > disponible) {
        return {
          success: false,
          error: `Fondos insuficientes en la Caja de Ventas. El efectivo disponible actual en el turno es L. ${disponible.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, y el monto a asignar es L. ${montoNum.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
        };
      }

      const session = await prisma.$transaction(async (tx) => {
        const ses = await tx.cajaChicaSession.create({
          data: {
            organizationId,
            saldoInicial: montoNum,
            estado: 'ABIERTA',
            creadoPorId: userId,
            movimientos: {
              create: {
                tipo: 'APERTURA',
                categoria: data.categoria || 'Apertura de caja',
                descripcion: data.descripcion || 'Fondo inicial asignado desde Caja de Ventas',
                documento: data.documento || 'RECIBO',
                nroDoc: data.nroDoc || null,
                adjuntoUrl: data.adjuntoUrl || null,
                importe: montoNum,
                moneda: data.moneda || 'HNL',
                tipoCambio: data.tipoCambio || 1,
                total: montoNum,
                beneficiario: 'Caja Chica',
                creadoPorId: userId
              }
            }
          },
          include: { movimientos: true }
        });

        const movChica = ses.movimientos[0];

        await tx.corteCajaMovimiento.create({
          data: {
            organizationId,
            sessionId: estadoVentas.session.id,
            tipo: 'EGRESO',
            concepto: 'TRASPASO_CAJA_CHICA',
            descripcion: `Traslado a Caja Chica (Apertura de Fondo): ${data.descripcion || 'Apertura de caja chica'}`,
            monto: new Prisma.Decimal(montoNum),
            metodoPago: data.metodoPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo',
            referenciaId: movChica?.id || null,
            creadoPorId: userId
          }
        });

        return ses;
      });

      revalidatePath('/caja-chica');
      revalidatePath('/cierre-caja');
      return { success: true, session };
    }

    const session = await prisma.cajaChicaSession.create({
      data: {
        organizationId,
        saldoInicial: montoNum,
        estado: 'ABIERTA',
        creadoPorId: userId,
        movimientos: {
          create: {
            tipo: 'APERTURA',
            categoria: data.categoria || 'Apertura de caja',
            descripcion: data.descripcion || 'Fondo inicial asignado a la caja chica',
            documento: data.documento || 'RECIBO',
            nroDoc: data.nroDoc || null,
            adjuntoUrl: data.adjuntoUrl || null,
            importe: montoNum,
            moneda: data.moneda || 'HNL',
            tipoCambio: data.tipoCambio || 1,
            total: montoNum,
            beneficiario: data.beneficiario || null,
            creadoPorId: userId
          }
        }
      }
    });

    revalidatePath('/caja-chica');
    return { success: true, session };
  } catch (error) {
    console.error('Error opening and funding session:', error);
    return { success: false, error: 'Error al abrir caja con fondo' };
  }
}

export async function closeCajaChicaSession(sessionId: string, saldoReal: number, observaciones: string, userId: string) {
  try {
    const session = await prisma.cajaChicaSession.findUnique({
      where: { id: sessionId },
      include: { movimientos: { where: { estado: 'REGISTRADO' } } }
    });

    if (!session) return { success: false, error: 'Sesión no encontrada' };
    if (session.estado === 'CERRADA') return { success: false, error: 'La caja ya está cerrada' };

    let totalIngresos = 0;
    let totalSalidas = 0;

    session.movimientos.forEach(mov => {
      if (mov.tipo === 'INGRESO') totalIngresos += mov.total;
      if (mov.tipo === 'SALIDA') totalSalidas += mov.total;
    });

    const saldoCalculado = session.saldoInicial + totalIngresos - totalSalidas;
    const diferencia = saldoReal - saldoCalculado;

    await prisma.cajaChicaSession.update({
      where: { id: sessionId },
      data: {
        estado: 'CERRADA',
        saldoFinal: saldoCalculado,
        saldoReal: saldoReal,
        diferencia: diferencia,
        observaciones,
        cerradoPorId: userId,
        cerradaAt: new Date()
      }
    });

    revalidatePath('/caja-chica');
    return { success: true };
  } catch (error) {
    console.error('Error closing session:', error);
    return { success: false, error: 'Error al cerrar caja' };
  }
}

export async function registerCajaChicaMovimiento(
  sessionId: string,
  tipo: 'INGRESO' | 'SALIDA',
  data: any,
  userId: string
) {
  try {
    const session = await prisma.cajaChicaSession.findUnique({ where: { id: sessionId } });
    if (!session || session.estado !== 'ABIERTA') {
      return { success: false, error: 'La caja chica no está abierta.' };
    }

    const montoNum = Number(data.total || data.importe || 0);
    if (isNaN(montoNum) || montoNum <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0.' };
    }

    const esDeCajaVentas =
      tipo === 'INGRESO' &&
      (data.categoria === 'Cobro de venta' ||
        (data.origenFondos && (
          data.origenFondos.toLowerCase().includes('caja de ventas') ||
          data.origenFondos.toLowerCase().includes('cobro') ||
          data.origenFondos.toLowerCase().includes('ventas')
        )));

    if (esDeCajaVentas) {
      // 1. Check if Caja de Ventas is open
      const estadoVentas = await getCajaVentasStatus(session.organizationId);
      if (!estadoVentas.success || !estadoVentas.abierta || !estadoVentas.session) {
        return {
          success: false,
          error: 'No se puede recargar desde la caja de ventas: La Caja de Ventas no está aperturada. Primero abre el turno en Cierre de Caja.'
        };
      }

      // 2. Check if sufficient cash funds exist in Caja de Ventas
      const disponible = estadoVentas.session.disponibleEfectivo;
      if (montoNum > disponible) {
        return {
          success: false,
          error: `Fondos insuficientes en la Caja de Ventas. El efectivo disponible actual en el turno es L. ${disponible.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, y el monto a recargar es L. ${montoNum.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
        };
      }

      // 3. Register in both modules inside a transaction
      const result = await prisma.$transaction(async (tx) => {
        const movChica = await tx.cajaChicaMovimiento.create({
          data: {
            sessionId,
            tipo,
            categoria: data.categoria || 'Cobro de venta',
            descripcion: data.descripcion || 'Recarga de fondo desde Caja de Ventas',
            documento: data.documento || 'RECIBO',
            nroDoc: data.nroDoc || null,
            importe: montoNum,
            moneda: data.moneda || 'HNL',
            tipoCambio: data.tipoCambio || 1,
            total: montoNum,
            adjuntoUrl: data.adjuntoUrl || null,
            beneficiario: data.beneficiario || 'Caja Chica',
            creadoPorId: userId
          }
        });

        await tx.corteCajaMovimiento.create({
          data: {
            organizationId: session.organizationId,
            sessionId: estadoVentas.session.id,
            tipo: 'EGRESO',
            concepto: 'TRASPASO_CAJA_CHICA',
            descripcion: `Traslado a Caja Chica: ${data.categoria || 'Recarga'}${data.descripcion ? ' - ' + data.descripcion : ''}`,
            monto: new Prisma.Decimal(montoNum),
            metodoPago: data.metodoPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo',
            referenciaId: movChica.id,
            creadoPorId: userId
          }
        });

        return movChica;
      });

      revalidatePath('/caja-chica');
      revalidatePath('/cierre-caja');
      return { success: true, movimiento: result };
    }

    // Standard movement (not from Caja de Ventas)
    const movimiento = await prisma.cajaChicaMovimiento.create({
      data: {
        sessionId,
        tipo,
        categoria: data.categoria,
        descripcion: data.descripcion,
        documento: data.documento,
        nroDoc: data.nroDoc || null,
        importe: montoNum,
        moneda: data.moneda || 'HNL',
        tipoCambio: data.tipoCambio || 1,
        total: montoNum,
        adjuntoUrl: data.adjuntoUrl || null,
        beneficiario: data.beneficiario || null,
        creadoPorId: userId
      }
    });

    revalidatePath('/caja-chica');
    return { success: true, movimiento };
  } catch (error: any) {
    console.error('Error registering movement:', error);
    return { success: false, error: error.message || 'Error al registrar el movimiento' };
  }
}

export async function anularCajaChicaMovimiento(movimientoId: string, userId: string) {
  try {
    const mov = await prisma.cajaChicaMovimiento.findUnique({ where: { id: movimientoId }, include: { session: true } });
    if (!mov) return { success: false, error: 'Movimiento no encontrado' };
    if (mov.session.estado === 'CERRADA') return { success: false, error: 'No se puede anular un movimiento de una caja cerrada' };

    await prisma.$transaction(async (tx) => {
      await tx.cajaChicaMovimiento.update({
        where: { id: movimientoId },
        data: {
          estado: 'ANULADO',
          anuladaPorId: userId,
          anuladaAt: new Date()
        }
      });

      // Annul any linked movement in Caja de Ventas
      const corteMov = await tx.corteCajaMovimiento.findFirst({
        where: {
          referenciaId: movimientoId,
          anuladaAt: null
        }
      });

      if (corteMov) {
        await tx.corteCajaMovimiento.update({
          where: { id: corteMov.id },
          data: {
            anuladaAt: new Date(),
            anuladaPorId: userId
          }
        });
      }
    });

    revalidatePath('/caja-chica');
    revalidatePath('/cierre-caja');
    return { success: true };
  } catch (error) {
    console.error('Error anular movement:', error);
    return { success: false, error: 'Error al anular movimiento' };
  }
}

export async function updateCajaChicaSaldoInicial(sessionId: string, nuevoSaldo: number, userId: string) {
  try {
    const session = await prisma.cajaChicaSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) return { success: false, error: 'Sesión no encontrada' };
    if (session.estado === 'CERRADA') return { success: false, error: 'No se puede editar una caja cerrada' };

    await prisma.cajaChicaSession.update({
      where: { id: sessionId },
      data: {
        saldoInicial: nuevoSaldo
      }
    });

    revalidatePath('/caja-chica');
    return { success: true };
  } catch (error) {
    console.error('Error updating session:', error);
    return { success: false, error: 'Error al actualizar saldo' };
  }
}

export async function updateCajaChicaMovimiento(
  movimientoId: string,
  data: any,
  userId: string
) {
  try {
    const mov = await prisma.cajaChicaMovimiento.findUnique({
      where: { id: movimientoId },
      include: { session: true }
    });

    if (!mov) return { success: false, error: 'Movimiento no encontrado' };
    if (mov.session.estado === 'CERRADA') return { success: false, error: 'La caja ya está cerrada' };

    const updatedMovimiento = await prisma.cajaChicaMovimiento.update({
      where: { id: movimientoId },
      data: {
        categoria: data.categoria,
        descripcion: data.descripcion,
        documento: data.documento,
        nroDoc: data.nroDoc || null,
        importe: data.importe,
        moneda: data.moneda || 'HNL',
        tipoCambio: data.tipoCambio || 1,
        total: data.total,
        adjuntoUrl: data.adjuntoUrl !== undefined ? data.adjuntoUrl : mov.adjuntoUrl,
        beneficiario: data.beneficiario || null,
      }
    });

    revalidatePath('/caja-chica');
    return { success: true, movimiento: updatedMovimiento };
  } catch (error) {
    console.error('Error updating movement:', error);
    return { success: false, error: 'Error al actualizar el movimiento' };
  }
}

export async function getUploadUrlCajaChica(fileName: string, contentType: string, userId: string) {
  try {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `caja-chica/${userId}/${Date.now()}-${safeFileName}`;
    const uploadUrl = await getR2UploadUrl(storagePath, contentType);
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${storagePath}`;
    
    return { success: true, uploadUrl, publicUrl };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return { success: false, error: 'Error al generar URL de carga' };
  }
}

export async function getClosedSessions(organizationId: string) {
  try {
    const sessions = await prisma.cajaChicaSession.findMany({
      where: {
        organizationId,
        estado: 'CERRADA'
      },
      include: {
        creadoPor: { select: { nombre: true, apellido: true } },
        cerradoPor: { select: { nombre: true, apellido: true } },
        movimientos: {
          where: { estado: 'REGISTRADO' },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { cerradaAt: 'desc' },
      take: 20
    });

    return { success: true, sessions };
  } catch (error) {
    console.error('Error in getClosedSessions:', error);
    return { success: false, error: 'Error al obtener las sesiones cerradas' };
  }
}
