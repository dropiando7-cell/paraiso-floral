import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

async function getNextSixDigitCode(organizationId: string): Promise<string> {
  const todos = await prisma.activoFijo.findMany({
    where: { organizationId },
    select: { idQr: true }
  });

  let maxCorrelativo = 0;
  for (const act of todos) {
    if (!act.idQr) continue;
    let numStr = act.idQr;
    if (act.idQr.includes('-')) {
      const parts = act.idQr.split('-');
      numStr = parts[parts.length - 1];
    }
    const num = Number(numStr);
    if (!isNaN(num) && num > maxCorrelativo && num < 900000) {
      maxCorrelativo = num;
    }
  }

  return String(maxCorrelativo + 1).padStart(6, '0');
}

/**
 * Resuelve y sincroniza Producto + ActivoFijo bajo el MISMO código padre (ej. 010055)
 * para que nunca se dupliquen códigos padres al ingresar mercadería.
 */
async function resolveAndSyncParentProductAndAsset(
  tx: any,
  orgId: string,
  userId: string,
  input: {
    productoId?: string | null;
    sku?: string | null;
    nombreProducto?: string | null;
    categoria?: string | null;
    area?: string | null;
  }
) {
  let productoDb: any = null;
  let activoDb: any = null;

  // 1. Buscar si input.productoId es un Producto o un ActivoFijo
  if (input.productoId) {
    productoDb = await tx.producto.findFirst({
      where: { id: input.productoId, organizationId: orgId }
    });

    if (productoDb) {
      activoDb = await tx.activoFijo.findFirst({
        where: {
          organizationId: orgId,
          estatusContable: { notIn: ['DE BAJA', 'ELIMINADO'] },
          OR: [
            { productoId: productoDb.id },
            { idQr: { equals: productoDb.sku, mode: 'insensitive' } },
            { codigoBarras: { equals: productoDb.sku, mode: 'insensitive' } },
            { descripcionCorta: { equals: productoDb.nombre, mode: 'insensitive' } }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      // Podría ser directamente el ID de un ActivoFijo
      activoDb = await tx.activoFijo.findFirst({
        where: { id: input.productoId, organizationId: orgId },
        include: { producto: true }
      });
      if (activoDb?.producto) {
        productoDb = activoDb.producto;
      }
    }
  }

  // 2. Fallback por SKU o Nombre si aún no se encontró
  if (!productoDb && !activoDb && (input.sku || input.nombreProducto)) {
    const cleanSku = String(input.sku || '').trim();
    const cleanNombre = String(input.nombreProducto || '').trim();

    if (cleanSku) {
      productoDb = await tx.producto.findFirst({
        where: { organizationId: orgId, sku: { equals: cleanSku, mode: 'insensitive' } }
      });
      activoDb = await tx.activoFijo.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { idQr: { equals: cleanSku, mode: 'insensitive' } },
            { codigoBarras: { equals: cleanSku, mode: 'insensitive' } }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
    }

    if (!productoDb && cleanNombre) {
      productoDb = await tx.producto.findFirst({
        where: { organizationId: orgId, nombre: { equals: cleanNombre, mode: 'insensitive' } }
      });
    }
    if (!activoDb && cleanNombre) {
      activoDb = await tx.activoFijo.findFirst({
        where: { organizationId: orgId, descripcionCorta: { equals: cleanNombre, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' }
      });
    }
  }

  // 3. Si existe ActivoFijo pero no Producto -> crear o enlazar Producto con el mismo código (idQr)
  if (activoDb && !productoDb) {
    const parentCode = (activoDb.idQr || activoDb.codigoBarras || input.sku || '000001').trim().toUpperCase();
    const parentName = (activoDb.descripcionCorta || input.nombreProducto || 'PRODUCTO FLORAL').trim().toUpperCase();

    productoDb = await tx.producto.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { sku: { equals: parentCode, mode: 'insensitive' } },
          { nombre: { equals: parentName, mode: 'insensitive' } }
        ]
      }
    });

    if (!productoDb) {
      const collision = await tx.producto.findUnique({ where: { sku: parentCode }, select: { id: true } });
      const safeSku = collision ? `${parentCode}-${orgId.slice(0, 4).toUpperCase()}` : parentCode;
      productoDb = await tx.producto.create({
        data: {
          organizationId: orgId,
          sku: safeSku,
          nombre: parentName,
          descripcion: activoDb.descripcionDetallada || parentName,
          categoria: activoDb.marca || input.categoria || 'Misceláneo',
          marca: activoDb.marca || input.categoria || 'Misceláneo',
          precioVenta: 0,
          costoBase: activoDb.costoAdq ? Number(activoDb.costoAdq) : 0,
          stockActual: activoDb.stock ?? 0,
          estado: 'ACTIVO'
        }
      });
    }

    await tx.activoFijo.update({
      where: { id: activoDb.id },
      data: { productoId: productoDb.id }
    });
  }

  // 4. Si existe Producto pero no ActivoFijo -> crear o enlazar ActivoFijo con el mismo código padre
  if (productoDb && !activoDb) {
    const areaDefault = (input.area || 'CUARTO FRÍO').trim().toUpperCase();
    let candidateQr = (productoDb.sku || '').trim().toUpperCase();
    const existingQr = candidateQr
      ? await tx.activoFijo.findFirst({ where: { organizationId: orgId, idQr: candidateQr } })
      : null;

    if (existingQr) {
      activoDb = existingQr;
      if (!activoDb.productoId) {
        await tx.activoFijo.update({
          where: { id: activoDb.id },
          data: { productoId: productoDb.id }
        });
      }
    } else {
      if (!candidateQr) {
        candidateQr = await getNextSixDigitCode(orgId);
      }
      activoDb = await tx.activoFijo.create({
        data: {
          organizationId: orgId,
          idQr: candidateQr,
          codigoBarras: candidateQr,
          codigoGrupo: '001',
          area: areaDefault,
          descripcionCorta: productoDb.nombre.toUpperCase(),
          descripcionDetallada: productoDb.descripcion || productoDb.nombre.toUpperCase(),
          marca: productoDb.categoria || productoDb.marca || input.categoria || 'FLORISTERIA',
          cuentaAct: 'INVENTARIO',
          estatusContable: 'VIGENTE',
          esConsumible: true,
          stock: productoDb.stockActual ?? 0,
          costoAdq: productoDb.costoBase ? Number(productoDb.costoBase) : 0,
          productoId: productoDb.id,
          createdById: userId,
          updatedById: userId
        }
      });
    }
  }

  return { productoDb, activoDb };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes'); // YYYY-MM o TODOS
    const q = searchParams.get('q')?.trim() || '';
    const motivoParam = searchParams.get('motivo') || 'TODOS';

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMes = mesParam && mesParam !== 'TODOS' ? mesParam : (mesParam === 'TODOS' ? null : currentYearMonth);

    let dateFilter: any = {};
    if (selectedMes) {
      const [yearStr, monthStr] = selectedMes.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      dateFilter = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    const whereClause: any = {
      organizationId: orgId,
      tipoMovimiento: 'ENTRADA',
      ...dateFilter
    };

    if (motivoParam && motivoParam !== 'TODOS') {
      whereClause.motivo = { contains: motivoParam, mode: 'insensitive' };
    }

    if (q) {
      whereClause.OR = [
        { referencia: { contains: q, mode: 'insensitive' } },
        { motivo: { contains: q, mode: 'insensitive' } },
        { producto: { nombre: { contains: q, mode: 'insensitive' } } },
        { producto: { sku: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [movimientos, areasDb] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          producto: {
            include: {
              activosFijos: {
                where: { estatusContable: { notIn: ['DE BAJA', 'ELIMINADO'] } },
                orderBy: { createdAt: 'asc' },
                take: 1,
                select: {
                  id: true,
                  idQr: true,
                  codigoBarras: true,
                  area: true,
                  stock: true,
                  marca: true
                }
              }
            }
          },
          usuario: {
            select: { id: true, nombre: true, apellido: true, email: true }
          }
        }
      }),
      prisma.area.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
        select: { name: true }
      })
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let totalPaquetesMes = 0;
    let totalPaquetesHoy = 0;
    const conteoPorFlor: Record<string, number> = {};

    const items = movimientos.map((m) => {
      const activo = m.producto?.activosFijos?.[0] || null;
      const codigoPadre = activo?.idQr || m.producto?.sku || 'S/C';
      const nombreProducto = m.producto?.nombre || 'PRODUCTO';
      const categoria = m.producto?.categoria || activo?.marca || 'Misceláneo';
      const area = activo?.area || 'CUARTO FRÍO';
      const stockActual = activo?.stock ?? m.producto?.stockActual ?? 0;
      const cant = Number(m.cantidad || 0);

      totalPaquetesMes += cant;
      if (new Date(m.createdAt) >= startOfToday && new Date(m.createdAt) <= endOfToday) {
        totalPaquetesHoy += cant;
      }
      conteoPorFlor[nombreProducto] = (conteoPorFlor[nombreProducto] || 0) + cant;

      return {
        id: m.id,
        fecha: m.createdAt.toISOString(),
        productoId: m.productoId,
        activoFijoId: activo?.id || null,
        codigoPadre,
        nombreProducto,
        categoria,
        area,
        cantidad: cant,
        stockActual,
        motivo: m.motivo || 'Ingreso CEDI',
        referencia: m.referencia || '',
        usuario: m.usuario
      };
    });

    let florMayorIngreso = { nombre: 'Ninguna', cantidad: 0 };
    for (const [nombre, cant] of Object.entries(conteoPorFlor)) {
      if (cant > florMayorIngreso.cantidad) {
        florMayorIngreso = { nombre, cantidad: cant };
      }
    }

    return NextResponse.json({
      ingresos: items,
      areas: areasDb.map(a => a.name),
      nextSuggestedCode: await getNextSixDigitCode(orgId),
      kpis: {
        totalPaquetesMes,
        totalPaquetesHoy,
        totalRegistros: items.length,
        florMayorIngreso,
        mesSeleccionado: selectedMes || 'TODOS'
      }
    });
  } catch (error: any) {
    console.error('Error al listar planilla de ingresos:', error);
    return NextResponse.json({ error: error.message || 'Error al cargar planilla de ingresos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const body = await request.json();

    // Acción especial: Crear producto nuevo en catálogo (Producto + ActivoFijo con el mismo código padre 6 dígitos)
    if (body.action === 'CREATE_NEW_PRODUCT') {
      const nombre = String(body.nombre || '').trim().toUpperCase();
      const categoria = String(body.categoria || 'FLORISTERIA').trim().toUpperCase();
      const area = String(body.area || 'CUARTO FRÍO').trim().toUpperCase();
      const costoBase = Number(body.costoBase || 0);
      const precioVenta = Number(body.precioVenta || 0);

      if (!nombre) {
        return NextResponse.json({ error: 'El nombre del producto es obligatorio.' }, { status: 400 });
      }

      const codigoPadre = body.codigo
        ? String(body.codigo).trim().toUpperCase()
        : await getNextSixDigitCode(orgId);

      const created = await prisma.$transaction(async (tx) => {
        const dupQr = await tx.activoFijo.findFirst({
          where: { organizationId: orgId, idQr: codigoPadre }
        });
        const finalCode = dupQr ? await getNextSixDigitCode(orgId) : codigoPadre;

        const nuevoProd = await tx.producto.create({
          data: {
            organizationId: orgId,
            sku: finalCode,
            nombre,
            descripcion: nombre,
            categoria,
            marca: categoria,
            costoBase,
            precioVenta,
            stockActual: 0,
            estado: 'ACTIVO'
          }
        });

        const nuevoActivo = await tx.activoFijo.create({
          data: {
            organizationId: orgId,
            idQr: finalCode,
            codigoBarras: finalCode,
            codigoGrupo: '001',
            area,
            descripcionCorta: nombre,
            descripcionDetallada: nombre,
            marca: categoria,
            cuentaAct: 'INVENTARIO',
            estatusContable: 'VIGENTE',
            esConsumible: true,
            stock: 0,
            costoAdq: costoBase,
            productoId: nuevoProd.id,
            createdById: dbUser.id,
            updatedById: dbUser.id
          }
        });

        return { producto: nuevoProd, activo: nuevoActivo };
      });

      revalidatePath('/inventario');
      revalidatePath('/inventario/entradas');

      return NextResponse.json({
        success: true,
        producto: {
          id: created.producto.id,
          activoFijoId: created.activo.id,
          sku: created.producto.sku,
          nombre: created.producto.nombre,
          categoria: created.producto.categoria || 'FLORISTERIA',
          costoBase: Number(created.producto.costoBase || 0)
        }
      });
    }

    // Registro de ingreso rápido (suma al mismo código padre en ActivoFijo + Producto)
    const cantidad = Math.max(1, parseInt(String(body.cantidad || '1'), 10) || 1);
    const motivo = String(body.motivo || 'Ingreso Rápido Planilla').trim();
    const referencia = String(body.referencia || '').trim() || null;
    const areaInput = String(body.area || '').trim().toUpperCase() || null;

    if (!body.productoId && !body.sku && !body.nombreProducto) {
      return NextResponse.json(
        { error: 'Selecciona un producto del catálogo o créalo como producto nuevo.' },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const { productoDb, activoDb } = await resolveAndSyncParentProductAndAsset(
        tx,
        orgId,
        dbUser.id,
        {
          productoId: body.productoId,
          sku: body.sku,
          nombreProducto: body.nombreProducto,
          categoria: body.categoria,
          area: areaInput
        }
      );

      if (!productoDb || !activoDb) {
        throw new Error('No se encontró el producto en el catálogo.');
      }

      // 1. Incrementar stock en ActivoFijo (mismo código padre)
      const updatedActivo = await tx.activoFijo.update({
        where: { id: activoDb.id },
        data: {
          stock: { increment: cantidad },
          estatusContable: 'VIGENTE',
          ...(areaInput ? { area: areaInput } : {})
        }
      });

      // 2. Incrementar stock en Producto
      await tx.producto.update({
        where: { id: productoDb.id },
        data: {
          stockActual: { increment: cantidad }
        }
      });

      // 3. Crear el registro en MovimientoInventario
      let fechaCreacion = new Date();
      if (body.fecha) {
        const parts = String(body.fecha).split('T')[0].split('-');
        if (parts.length === 3) {
          const nowTime = new Date();
          fechaCreacion = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10),
            nowTime.getHours(),
            nowTime.getMinutes(),
            nowTime.getSeconds()
          );
        }
      }

      const mov = await tx.movimientoInventario.create({
        data: {
          organizationId: orgId,
          productoId: productoDb.id,
          tipoMovimiento: 'ENTRADA',
          cantidad,
          motivo,
          referencia,
          usuarioId: dbUser.id,
          createdAt: fechaCreacion
        }
      });

      return {
        movimiento: mov,
        activo: updatedActivo,
        producto: productoDb
      };
    });

    revalidatePath('/inventario');
    revalidatePath('/inventario/entradas');

    return NextResponse.json({
      success: true,
      ingreso: {
        id: resultado.movimiento.id,
        fecha: resultado.movimiento.createdAt.toISOString(),
        productoId: resultado.producto.id,
        activoFijoId: resultado.activo.id,
        codigoPadre: resultado.activo.idQr || resultado.producto.sku,
        nombreProducto: resultado.producto.nombre,
        categoria: resultado.producto.categoria || resultado.activo.marca || 'Misceláneo',
        area: resultado.activo.area || 'CUARTO FRÍO',
        cantidad,
        stockActual: resultado.activo.stock,
        motivo,
        referencia: referencia || ''
      }
    });
  } catch (error: any) {
    console.error('Error al registrar ingreso en planilla:', error);
    return NextResponse.json({ error: error.message || 'Error al registrar ingreso' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const body = await request.json();
    const { id, cantidad, motivo, referencia } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de ingreso requerido' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const movActual = await tx.movimientoInventario.findFirst({
        where: { id, organizationId: orgId, tipoMovimiento: 'ENTRADA' }
      });

      if (!movActual) {
        throw new Error('Registro de ingreso no encontrado.');
      }

      const nuevaCantidad = cantidad !== undefined ? Math.max(1, parseInt(String(cantidad), 10) || 1) : movActual.cantidad;
      const delta = nuevaCantidad - movActual.cantidad;

      if (delta !== 0) {
        await tx.producto.update({
          where: { id: movActual.productoId },
          data: { stockActual: { increment: delta } }
        });

        const activo = await tx.activoFijo.findFirst({
          where: {
            organizationId: orgId,
            productoId: movActual.productoId,
            estatusContable: { notIn: ['DE BAJA', 'ELIMINADO'] }
          },
          orderBy: { createdAt: 'asc' }
        });

        if (activo) {
          await tx.activoFijo.update({
            where: { id: activo.id },
            data: { stock: Math.max(0, (activo.stock || 0) + delta) }
          });
        }
      }

      return tx.movimientoInventario.update({
        where: { id },
        data: {
          cantidad: nuevaCantidad,
          ...(motivo !== undefined ? { motivo: String(motivo).trim() } : {}),
          ...(referencia !== undefined ? { referencia: String(referencia).trim() || null } : {})
        }
      });
    });

    revalidatePath('/inventario');
    revalidatePath('/inventario/entradas');

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('Error al actualizar ingreso en planilla:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar ingreso' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const movActual = await tx.movimientoInventario.findFirst({
        where: { id, organizationId: orgId, tipoMovimiento: 'ENTRADA' }
      });

      if (!movActual) {
        throw new Error('Registro no encontrado.');
      }

      // Revertir el stock ingresado
      await tx.producto.update({
        where: { id: movActual.productoId },
        data: { stockActual: { decrement: movActual.cantidad } }
      });

      const activo = await tx.activoFijo.findFirst({
        where: {
          organizationId: orgId,
          productoId: movActual.productoId,
          estatusContable: { notIn: ['DE BAJA', 'ELIMINADO'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (activo) {
        await tx.activoFijo.update({
          where: { id: activo.id },
          data: { stock: Math.max(0, (activo.stock || 0) - movActual.cantidad) }
        });
      }

      await tx.movimientoInventario.delete({
        where: { id }
      });
    });

    revalidatePath('/inventario');
    revalidatePath('/inventario/entradas');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar ingreso de planilla:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar ingreso' }, { status: 500 });
  }
}
