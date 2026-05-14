'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getR2UploadUrl } from '@/lib/storage/r2';

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

    const session = await prisma.cajaChicaSession.create({
      data: {
        organizationId,
        saldoInicial: data.importe,
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
            importe: data.importe,
            moneda: data.moneda || 'HNL',
            tipoCambio: data.tipoCambio || 1,
            total: data.total || data.importe,
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
      return { success: false, error: 'La caja no está abierta.' };
    }

    const movimiento = await prisma.cajaChicaMovimiento.create({
      data: {
        sessionId,
        tipo,
        categoria: data.categoria,
        descripcion: data.descripcion,
        documento: data.documento,
        nroDoc: data.nroDoc || null,
        importe: data.importe,
        moneda: data.moneda || 'HNL',
        tipoCambio: data.tipoCambio || 1,
        total: data.total,
        adjuntoUrl: data.adjuntoUrl || null,
        beneficiario: data.beneficiario || null,
        creadoPorId: userId
      }
    });

    revalidatePath('/caja-chica');
    return { success: true, movimiento };
  } catch (error) {
    console.error('Error registering movement:', error);
    return { success: false, error: 'Error al registrar el movimiento' };
  }
}

export async function anularCajaChicaMovimiento(movimientoId: string, userId: string) {
  try {
    const mov = await prisma.cajaChicaMovimiento.findUnique({ where: { id: movimientoId }, include: { session: true } });
    if (!mov) return { success: false, error: 'Movimiento no encontrado' };
    if (mov.session.estado === 'CERRADA') return { success: false, error: 'No se puede anular un movimiento de una caja cerrada' };

    await prisma.cajaChicaMovimiento.update({
      where: { id: movimientoId },
      data: {
        estado: 'ANULADO',
        anuladaPorId: userId,
        anuladaAt: new Date()
      }
    });

    revalidatePath('/caja-chica');
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
