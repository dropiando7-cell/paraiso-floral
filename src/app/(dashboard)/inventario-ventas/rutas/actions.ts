'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { IRuta, IRutaPedido, IRutaStock, IMerma, IRutaAbono, ITruckCargo, IVentaMovil, ICamion } from '@/types/rutas';

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'inventario-ventas', 'rutas', 'db.json');

// Ensure database file exists and is initialized
// Ensure database file exists and is initialized
async function getDb() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'rutas_db' }
    });
    if (setting) {
      const parsed = JSON.parse(setting.value);
      let needsSave = false;
      
      let localDb: any = null;
      const getLocalFallback = () => {
        if (localDb) return localDb;
        try {
          if (fs.existsSync(DB_FILE_PATH)) {
            const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
            localDb = JSON.parse(raw);
          }
        } catch (err) {
          // ignore
        }
        return localDb;
      };

      if (!parsed.rutas) {
        const fallback = getLocalFallback();
        parsed.rutas = fallback?.rutas || [];
        needsSave = true;
      }
      if (!parsed.logs) {
        const fallback = getLocalFallback();
        parsed.logs = fallback?.logs || [];
        needsSave = true;
      }
      if (!parsed.camiones) {
        const fallback = getLocalFallback();
        parsed.camiones = fallback?.camiones || [
          {
            id: 'cam-1',
            organizationId: '',
            placa: 'TRC-204',
            conductorId: 'default-conductor-id',
            conductorNombre: 'Marcio Vendedor',
            acompanante: 'Juan Ayudante',
            capacidadKilos: 1500,
            volumenM3: 12,
            createdAt: new Date().toISOString()
          }
        ];
        needsSave = true;
      }
      if (!parsed.rutasPredefinidas) {
        const fallback = getLocalFallback();
        parsed.rutasPredefinidas = fallback?.rutasPredefinidas || [
          { id: 'rp-1', origen: 'San Pedro Sula', destino: 'La Esperanza' },
          { id: 'rp-2', origen: 'San Pedro Sula', destino: 'Santa Rosa de Copán' },
          { id: 'rp-3', origen: 'San Pedro Sula', destino: 'Tegucigalpa' }
        ];
        needsSave = true;
      }
      if (needsSave) {
        await saveDb(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error fetching rutas_db from database:', err);
  }

  // Fallback / Seed from local db.json if database fetch failed or returned nothing
  let localDb: any = null;
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      localDb = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading local db.json seed:', err);
  }

  if (!localDb) {
    localDb = {
      rutas: [
        {
          id: '8ed33065-da0c-4e5a-b885-ed034ce84853',
          organizationId: '',
          camionPlaca: 'TRC-204',
          conductorId: 'default-conductor-id',
          conductorNombre: 'Marcio Vendedor',
          conductorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
          rutaNombre: 'San Pedro Sula ➡️ La Esperanza',
          estado: 'EN_RUTA',
          dock: 'Muelle 3',
          fechaSalida: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
          capacidadKilos: 1500,
          volumenM3: 12,
          efectivoInicial: 2500,
          ventasContado: 4500,
          abonosCxC: 1500,
          efectivoEntregado: 0,
          diferenciaFinanciera: 0,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          cargoGrid: [
            { id: '1', rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', bahia: 'A1', facturaNumero: 'FAC-SO000102', contenido: 'Rosas Rojas (100 tallos)' },
            { id: '2', rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', bahia: 'A2', facturaNumero: 'FAC-SO000103', contenido: 'Girasoles Premium (50 tallos)' },
            { id: '3', rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', bahia: 'B1', facturaNumero: 'FAC-SO000104', contenido: 'Lirios Blancos (30 tallos)' },
            { id: '4', rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', bahia: 'C1', contenido: 'Follaje Eucalipto (10 paquetes)' }
          ],
          pedidos: [
            {
              id: 'p1',
              rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853',
              facturaId: 'f1',
              facturaNumero: 'FAC-SO000102',
              clienteNombre: 'FLORISTERÍA ROSALÍA',
              totalFactura: 3500,
              estadoEntrega: 'ENTREGADO',
              montoCobrado: 3500,
              formaPago: 'EFECTIVO',
              firmaUrl: 'firma_mock_1',
              entregadoAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'p2',
              rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853',
              facturaId: 'f2',
              facturaNumero: 'FAC-SO000103',
              clienteNombre: 'EVENTOS ELEGANTES',
              totalFactura: 4800,
              estadoEntrega: 'PENDIETE',
              montoCobrado: 0
            }
          ],
          inventario: [
            {
              id: 'i1',
              rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853',
              productoId: 'prod-rosas',
              productoNombre: 'Rosas Rojas Importadas (Tallo)',
              productoSku: 'FL-ROS-01',
              cantidadCargada: 500,
              cantidadVendida: 120,
              cantidadEntregada: 200,
              cantidadDevuelta: 0,
              cantidadMerma: 10,
              cantidadDiferencia: 0
            },
            {
              id: 'i2',
              rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853',
              productoId: 'prod-girasoles',
              productoNombre: 'Girasoles del Campo',
              productoSku: 'FL-GIR-02',
              cantidadCargada: 200,
              cantidadVendida: 40,
              cantidadEntregada: 100,
              cantidadDevuelta: 0,
              cantidadMerma: 5,
              cantidadDiferencia: 0
            },
            {
              id: 'i3',
              rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853',
              productoId: 'prod-eucalipto',
              productoNombre: 'Follaje Eucalipto (Paquete)',
              productoSku: 'FO-EUC-03',
              cantidadCargada: 100,
              cantidadVendida: 30,
              cantidadEntregada: 50,
              cantidadDevuelta: 0,
              cantidadMerma: 0,
              cantidadDiferencia: 0
            }
          ],
          mermas: [
            { id: 'm1', rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', productoId: 'prod-rosas', productoNombre: 'Rosas Rojas Importadas (Tallo)', cantidad: 10, motivo: 'Maltrato por transporte' },
            { id: 'm2', rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', productoId: 'prod-girasoles', productoNombre: 'Girasoles del Campo', cantidad: 5, motivo: 'Deshidratación' }
          ],
          abonos: [
            {
              id: 'a1',
              rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853',
              clienteId: 'c1',
              clienteNombre: 'DECO FLOR HONDURAS',
              monto: 1500,
              formaPago: 'TRANSFERENCIA',
              referencia: 'TRF-9823412',
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            }
          ]
        }
      ],
      logs: [
        { rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), accion: 'SALIDA', detalle: 'Camión despachado desde CEDI SPS', usuarioNombre: 'Administrador' },
        { rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), accion: 'ESCANEO', detalle: 'Chofer escaneó entrega FAC-SO000102 para Floristería Rosalía', usuarioNombre: 'Marcio Vendedor' },
        { rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), accion: 'ENTREGA', detalle: 'Entrega exitosa de FAC-SO000102 a Floristería Rosalía. Firma recolectada.', usuarioNombre: 'Marcio Vendedor' },
        { rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), accion: 'AUTO-VENTA', detalle: 'Venta directa en ruta registrada a Consumidor Final (15 Rosas Rojas)', usuarioNombre: 'Marcio Vendedor' },
        { rutaId: '8ed33065-da0c-4e5a-b885-ed034ce84853', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), accion: 'COBRO', detalle: 'Abono CxC de L1,500.00 recibido de Deco Flor Honduras', usuarioNombre: 'Marcio Vendedor' }
      ],
      camiones: [
        {
          id: 'cam-1',
          organizationId: '',
          placa: 'TRC-204',
          conductorId: 'default-conductor-id',
          conductorNombre: 'Marcio Vendedor',
          acompanante: 'Juan Ayudante',
          capacidadKilos: 1500,
          volumenM3: 12,
          createdAt: new Date().toISOString()
        }
      ],
      rutasPredefinidas: [
        { id: 'rp-1', origen: 'San Pedro Sula', destino: 'La Esperanza' },
        { id: 'rp-2', origen: 'San Pedro Sula', destino: 'Santa Rosa de Copán' },
        { id: 'rp-3', origen: 'San Pedro Sula', destino: 'Tegucigalpa' }
      ]
    };
  }

  // Save the seed/local database to PostgreSQL
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'rutas_db' },
      update: { value: JSON.stringify(localDb) },
      create: { key: 'rutas_db', value: JSON.stringify(localDb) }
    });
  } catch (err) {
    console.error('Failed to seed/save routes database in Postgres system_settings:', err);
  }

  return localDb;
}

async function saveDb(dbData: any) {
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'rutas_db' },
      update: { value: JSON.stringify(dbData) },
      create: { key: 'rutas_db', value: JSON.stringify(dbData) }
    });
  } catch (err) {
    console.error('Failed to save routes database to Postgres system_settings:', err);
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
    } catch (fsErr) {
      // ignore
    }
  }
}

// Helper to log activities
async function addRouteLog(rutaId: string, accion: string, detalle: string, usuarioNombre: string) {
  const db = await getDb();
  const newLog = {
    rutaId,
    timestamp: new Date().toISOString(),
    accion,
    detalle,
    usuarioNombre
  };
  db.logs = [newLog, ...(db.logs || [])];
  await saveDb(db);
}

// ─── SERVER ACTIONS ──────────────────────────────────────────────────────────

// Get organization ID of user
async function getUserOrg() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, organizationId: true, nombre: true, apellido: true }
    });
    return dbUser;
  } catch (e) {
    return null;
  }
}

// 1. List Routes
export async function getRutas(): Promise<IRuta[]> {
  const user = await getUserOrg();
  const db = await getDb();
  
  // Set default organizationId if empty
  if (user) {
    db.rutas.forEach((r: any) => {
      if (!r.organizationId) r.organizationId = user.organizationId;
    });
    await saveDb(db);
    return db.rutas.filter((r: any) => r.organizationId === user.organizationId);
  }
  
  return db.rutas;
}

// 2. Get Route Detail
export async function getRutaById(id: string): Promise<IRuta | null> {
  const db = await getDb();
  const ruta = db.rutas.find((r: any) => r.id === id);
  return ruta || null;
}

// 3. Get Route Logs
export async function getRutaLogs(rutaId: string) {
  const db = await getDb();
  return (db.logs || []).filter((l: any) => l.rutaId === rutaId);
}

// 4. Create New Route
export async function createRuta(data: {
  camionPlaca: string;
  conductorId: string;
  conductorNombre: string;
  acompanante?: string;
  fotoUrl?: string;
  rutaNombre: string;
  dock?: string;
  capacidadKilos: number;
  volumenM3: number;
  gastosIniciales: { vueltos: number; gasolina: number; comida: number; otros: number };
  pedidos: { facturaId: string; facturaNumero: string; clienteNombre: string; totalFactura: number }[];
  cargamento: { productoId: string; productoNombre: string; productoSku: string; cantidad: number }[];
}) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const db = await getDb();
  const newRutaId = crypto.randomUUID();

  // Create cargo grid automatically for pre-loaded orders
  const cargoGrid: ITruckCargo[] = data.pedidos.map((p, idx) => {
    const bays = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
    return {
      id: crypto.randomUUID(),
      rutaId: newRutaId,
      bahia: bays[idx % bays.length],
      facturaId: p.facturaId,
      facturaNumero: p.facturaNumero,
      contenido: `Factura ${p.facturaNumero} - ${p.clienteNombre}`
    };
  });

  // Load inventory into mobile warehouse
  const inventario: IRutaStock[] = data.cargamento.map(c => ({
    id: crypto.randomUUID(),
    rutaId: newRutaId,
    productoId: c.productoId,
    productoNombre: c.productoNombre,
    productoSku: c.productoSku,
    cantidadCargada: c.cantidad,
    cantidadVendida: 0,
    cantidadEntregada: 0,
    cantidadDevuelta: 0,
    cantidadMerma: 0,
    cantidadDiferencia: 0
  }));

  // Block stock in CEDI database if applicable (Decrement stockActual)
  for (const item of data.cargamento) {
    try {
      await prisma.producto.update({
        where: { id: item.productoId },
        data: {
          stockActual: {
            decrement: item.cantidad
          }
        }
      });
      // Register CEDI stock movement
      await prisma.movimientoInventario.create({
        data: {
          organizationId: user.organizationId,
          productoId: item.productoId,
          tipoMovimiento: 'SALIDA_RUTA',
          cantidad: item.cantidad,
          motivo: `Retenido en camión ${data.camionPlaca} para ruta ${data.rutaNombre}`,
          referencia: `RUTA-${newRutaId.slice(0, 8)}`,
          usuarioId: user.id
        }
      });
    } catch (dbErr) {
      console.warn('Could not decrement real CEDI product stock, using virtual mock:', dbErr);
    }
  }

  const newRuta: IRuta = {
    id: newRutaId,
    organizationId: user.organizationId,
    camionPlaca: data.camionPlaca,
    conductorId: data.conductorId,
    conductorNombre: data.conductorNombre,
    conductorAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.conductorNombre)}`,
    rutaNombre: data.rutaNombre,
    estado: 'CARGANDO',
    dock: data.dock || 'Muelle general',
    acompanante: data.acompanante || undefined,
    fotoUrl: data.fotoUrl || undefined,
    fechaSalida: undefined,
    fechaRetorno: undefined,
    capacidadKilos: Number(data.capacidadKilos),
    volumenM3: Number(data.volumenM3),
    efectivoInicial: Number(data.gastosIniciales.vueltos) + Number(data.gastosIniciales.gasolina) + Number(data.gastosIniciales.comida) + Number(data.gastosIniciales.otros),
    gastosIniciales: data.gastosIniciales,
    ventasContado: 0,
    abonosCxC: 0,
    efectivoEntregado: 0,
    diferenciaFinanciera: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cargoGrid,
    pedidos: data.pedidos.map(p => ({
      id: crypto.randomUUID(),
      rutaId: newRutaId,
      facturaId: p.facturaId,
      facturaNumero: p.facturaNumero,
      clienteNombre: p.clienteNombre,
      totalFactura: p.totalFactura,
      estadoEntrega: 'PENDIENTE',
      montoCobrado: 0
    })),
    inventario,
    mermas: [],
    abonos: []
  };

  db.rutas.push(newRuta);
  await saveDb(db);

  const userName = [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Admin';
  await addRouteLog(newRutaId, 'CREACIÓN', `Ruta de reparto creada y camión asignado a ${data.conductorNombre}`, userName);

  revalidatePath('/inventario-ventas/rutas');
  return { success: true, id: newRutaId };
}

// 5. Despachar Camión (Start Route)
export async function despacharCamion(id: string) {
  const user = await getUserOrg();
  const db = await getDb();
  const idx = db.rutas.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    db.rutas[idx].estado = 'EN_RUTA';
    db.rutas[idx].fechaSalida = new Date().toISOString();
    db.rutas[idx].updatedAt = new Date().toISOString();
    await saveDb(db);

    const userName = user ? [user.nombre, user.apellido].filter(Boolean).join(' ') : 'Admin';
    await addRouteLog(id, 'SALIDA', `Camión despachado desde CEDI con éxito`, userName || 'Admin');
    
    revalidatePath('/inventario-ventas/rutas');
    return { success: true };
  }
  return { success: false, error: 'Ruta no encontrada' };
}

// 6. Confirm Delivery (Mobile App)
export async function registrarEntregaPedido(
  rutaId: string, 
  facturaId: string, 
  data: { 
    estadoEntrega: 'ENTREGADO' | 'RECHAZADO'; 
    motivoRechazo?: string; 
    formaPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO'; 
    montoCobrado: number; 
    firmaUrl?: string; 
    fotoComprobanteUrl?: string 
  }
) {
  const db = await getDb();
  const rIdx = db.rutas.findIndex((r: any) => r.id === rutaId);
  if (rIdx === -1) return { success: false, error: 'Ruta no encontrada' };
  
  const ruta = db.rutas[rIdx];
  const pIdx = ruta.pedidos.findIndex((p: any) => p.facturaId === facturaId);
  if (pIdx === -1) return { success: false, error: 'Pedido no encontrado en la ruta' };

  const pedido = ruta.pedidos[pIdx];
  pedido.estadoEntrega = data.estadoEntrega;
  pedido.motivoRechazo = data.motivoRechazo || null;
  pedido.montoCobrado = Number(data.montoCobrado);
  pedido.formaPago = data.formaPago || null;
  pedido.firmaUrl = data.firmaUrl || null;
  pedido.fotoComprobanteUrl = data.fotoComprobanteUrl || null;
  pedido.entregadoAt = new Date().toISOString();

  // If delivered, update Route stock quantities
  if (data.estadoEntrega === 'ENTREGADO') {
    // Attempt to load invoice items to decrement truck stock
    try {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        include: { detalles: { include: { producto: true } } }
      });
      if (factura) {
        factura.detalles.forEach((det: any) => {
          const stIdx = ruta.inventario.findIndex((st: any) => st.productoId === det.productoId);
          if (stIdx !== -1) {
            ruta.inventario[stIdx].cantidadEntregada += det.cantidad;
          }
        });
      }
    } catch (e) {
      // If invoice not in DB, mock it using truck cargo inventory
      ruta.inventario.forEach((st: any) => {
        if (st.cantidadCargada > st.cantidadEntregada) {
          // Increment delivery mock value
          const amt = Math.min(Math.round(st.cantidadCargada * 0.4), st.cantidadCargada - st.cantidadEntregada);
          st.cantidadEntregada += amt;
        }
      });
    }
    
    // Accumulate cash if paid cash
    if (data.formaPago === 'EFECTIVO') {
      ruta.ventasContado = Number(ruta.ventasContado) + Number(data.montoCobrado);
    }
  }

  ruta.updatedAt = new Date().toISOString();
  db.rutas[rIdx] = ruta;
  await saveDb(db);

  await addRouteLog(
    rutaId, 
    data.estadoEntrega === 'ENTREGADO' ? 'ENTREGADO' : 'RECHAZADO',
    `Entrega de factura ${pedido.facturaNumero} ${data.estadoEntrega === 'ENTREGADO' ? 'EXITOSA' : 'RECHAZADA (' + data.motivoRechazo + ')'}`,
    ruta.conductorNombre
  );

  revalidatePath('/inventario-ventas/rutas');
  return { success: true };
}

// 7. Auto-Venta Directa en Ruta (Mobile POS)
export async function registrarVentaMovil(rutaId: string, venta: IVentaMovil) {
  const db = await getDb();
  const rIdx = db.rutas.findIndex((r: any) => r.id === rutaId);
  if (rIdx === -1) return { success: false, error: 'Ruta no encontrada' };

  const ruta = db.rutas[rIdx];

  // 1. Check stock availability in Truck
  for (const item of venta.items) {
    const st = ruta.inventario.find((i: any) => i.productoId === item.productoId);
    if (!st) {
      return { success: false, error: `El producto ${item.productoNombre} no está cargado en el camión.` };
    }
    const stockDisponible = st.cantidadCargada - (st.cantidadVendida + st.cantidadEntregada + st.cantidadMerma);
    if (stockDisponible < item.cantidad) {
      return { success: false, error: `Stock insuficiente en camión para ${item.productoNombre}. Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}` };
    }
  }

  // 2. Dedact truck stock and register sale
  venta.items.forEach(item => {
    const stIdx = ruta.inventario.findIndex((i: any) => i.productoId === item.productoId);
    if (stIdx !== -1) {
      ruta.inventario[stIdx].cantidadVendida += item.cantidad;
    }
  });

  const facturaNumero = `FAC-SO${String(Math.floor(100000 + Math.random() * 900000))}`;
  
  // Accumulate cash in truck financial totals
  if (venta.formaPago === 'EFECTIVO') {
    ruta.ventasContado = Number(ruta.ventasContado) + Number(venta.total);
  }

  // Add virtual invoice to cargo list or mock invoices
  const dummyFacturaId = crypto.randomUUID();
  ruta.pedidos.push({
    id: crypto.randomUUID(),
    rutaId,
    facturaId: dummyFacturaId,
    facturaNumero,
    clienteNombre: venta.clienteNombre,
    totalFactura: venta.total,
    estadoEntrega: 'ENTREGADO',
    montoCobrado: venta.formaPago === 'EFECTIVO' ? venta.total : 0,
    formaPago: venta.formaPago,
    entregadoAt: new Date().toISOString()
  });

  ruta.updatedAt = new Date().toISOString();
  db.rutas[rIdx] = ruta;
  await saveDb(db);

  await addRouteLog(
    rutaId, 
    'AUTO-VENTA', 
    `Auto-venta de contado emitida a ${venta.clienteNombre} por L${venta.total.toFixed(2)} (${facturaNumero})`,
    ruta.conductorNombre
  );

  // Sync / create real invoice record in Supabase/Prisma as a POS sale in CEDI if possible
  try {
    const user = await getUserOrg();
    if (user) {
      await prisma.factura.create({
        data: {
          organizationId: user.organizationId,
          clienteId: venta.clienteId,
          correlativo: facturaNumero,
          subTotal: Number((venta.total / 1.15).toFixed(2)),
          isv15: Number((venta.total - (venta.total / 1.15)).toFixed(2)),
          total: Number(venta.total.toFixed(2)),
          estado: 'EMITIDA',
          tipoDocumento: 'FACTURA',
          creadoPorId: user.id,
          detalles: {
            create: venta.items.map(item => ({
              productoId: item.productoId,
              descripcion: item.productoNombre,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              totalLinea: item.cantidad * item.precioUnitario
            }))
          }
        }
      });
    }
  } catch (prismaErr) {
    console.warn('Could not register POS invoice in Supabase:', prismaErr);
  }

  revalidatePath('/inventario-ventas/rutas');
  return { success: true, facturaNumero };
}

// 8. Collect CxC payment (Abono)
export async function registrarAbonoCxC(rutaId: string, data: {
  clienteId: string;
  clienteNombre: string;
  monto: number;
  formaPago: 'EFECTIVO' | 'TRANSFERENCIA';
  referencia?: string;
}) {
  const db = await getDb();
  const rIdx = db.rutas.findIndex((r: any) => r.id === rutaId);
  if (rIdx === -1) return { success: false, error: 'Ruta no encontrada' };

  const ruta = db.rutas[rIdx];
  const newAbono: IRutaAbono = {
    id: crypto.randomUUID(),
    rutaId,
    clienteId: data.clienteId,
    clienteNombre: data.clienteNombre,
    monto: Number(data.monto),
    formaPago: data.formaPago,
    referencia: data.referencia || undefined,
    createdAt: new Date().toISOString()
  };

  ruta.abonos.push(newAbono);
  
  // Update CxC financial total
  ruta.abonosCxC = Number(ruta.abonosCxC) + Number(data.monto);
  ruta.updatedAt = new Date().toISOString();
  
  db.rutas[rIdx] = ruta;
  await saveDb(db);

  await addRouteLog(
    rutaId, 
    'COBRO', 
    `Abono CxC de L${data.monto.toFixed(2)} registrado para ${data.clienteNombre} (${data.formaPago})`,
    ruta.conductorNombre
  );

  // Attempt to save real PagoCliente in Supabase
  try {
    const user = await getUserOrg();
    if (user) {
      await prisma.pagoCliente.create({
        data: {
          organizationId: user.organizationId,
          clienteId: data.clienteId,
          monto: Number(data.monto),
          metodoPago: data.formaPago,
          referencia: data.referencia || `ABONO-RUT-${rutaId.slice(0, 6)}`,
          fecha: new Date(),
          notas: `Cobrado por ${ruta.conductorNombre} en ruta ${ruta.rutaNombre}`
        }
      });
    }
  } catch (dbErr) {
    console.warn('Could not register PagoCliente in Supabase:', dbErr);
  }

  revalidatePath('/inventario-ventas/rutas');
  return { success: true };
}

// 9. Register Route Damage/Waste (Merma)
export async function registrarMermaRuta(rutaId: string, data: {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  motivo: string;
  fotoUrl?: string;
}) {
  const db = await getDb();
  const rIdx = db.rutas.findIndex((r: any) => r.id === rutaId);
  if (rIdx === -1) return { success: false, error: 'Ruta no encontrada' };

  const ruta = db.rutas[rIdx];
  
  // Update inventory stock
  const stIdx = ruta.inventario.findIndex((st: any) => st.productoId === data.productoId);
  if (stIdx === -1) return { success: false, error: 'El producto no pertenece a la carga del camión' };

  const st = ruta.inventario[stIdx];
  const stockDisponible = st.cantidadCargada - (st.cantidadVendida + st.cantidadEntregada + st.cantidadMerma);
  if (stockDisponible < data.cantidad) {
    return { success: false, error: `No puedes reportar más mermas de las cargadas. Máximo disponible: ${stockDisponible}` };
  }

  ruta.inventario[stIdx].cantidadMerma += Number(data.cantidad);

  const newMerma: IMerma = {
    id: crypto.randomUUID(),
    rutaId,
    productoId: data.productoId,
    productoNombre: data.productoNombre,
    cantidad: Number(data.cantidad),
    motivo: data.motivo,
    fotoUrl: data.fotoUrl || undefined
  };

  ruta.mermas.push(newMerma);
  ruta.updatedAt = new Date().toISOString();
  db.rutas[rIdx] = ruta;
  await saveDb(db);

  await addRouteLog(
    rutaId, 
    'MERMA', 
    `Merma de ${data.cantidad} tallos registrada en ${data.productoNombre} (${data.motivo})`,
    ruta.conductorNombre
  );

  revalidatePath('/inventario-ventas/rutas');
  return { success: true };
}

// 10. Close and Liquidate Route (CEDI Return & Final Quadre)
export async function liquidarRuta(
  rutaId: string, 
  data: {
    devoluciones: { productoId: string; cantidadDevuelta: number }[];
    ventasFacturadas?: number;
    efectivoEntregado: number;
    gastosReportados: { gasolina: number; comida: number; otros: number };
    gastosExtras?: { concepto: string; monto: number }[];
  }
) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const db = await getDb();
  const rIdx = db.rutas.findIndex((r: any) => r.id === rutaId);
  if (rIdx === -1) return { success: false, error: 'Ruta no encontrada' };

  const ruta = db.rutas[rIdx];
  
  // 1. Financial reconcile
  if (data.ventasFacturadas !== undefined) {
    ruta.ventasContado = Number(data.ventasFacturadas);
  }

  const totalGastosReportados = Number(data.gastosReportados.gasolina) + Number(data.gastosReportados.comida) + Number(data.gastosReportados.otros);
  const totalGastosExtras = data.gastosExtras?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;
  const efectivoEsperado = Number(ruta.efectivoInicial) + Number(ruta.ventasContado) + Number(ruta.abonosCxC) - totalGastosReportados - totalGastosExtras;
  
  ruta.efectivoEntregado = Number(data.efectivoEntregado);
  ruta.diferenciaFinanciera = Number(data.efectivoEntregado) - efectivoEsperado;
  ruta.gastosReportados = {
    vueltos: 0,
    gasolina: Number(data.gastosReportados.gasolina),
    comida: Number(data.gastosReportados.comida),
    otros: Number(data.gastosReportados.otros)
  };
  ruta.gastosExtras = data.gastosExtras || [];

  // 2. Inventory Reconcile
  data.devoluciones.forEach(dev => {
    const stIdx = ruta.inventario.findIndex((st: any) => st.productoId === dev.productoId);
    if (stIdx !== -1) {
      const st = ruta.inventario[stIdx];
      st.cantidadDevuelta = Number(dev.cantidadDevuelta);
      // Diff Formula: Cargada - (Vendida + Entregada + Devuelta + Merma)
      st.cantidadDiferencia = st.cantidadCargada - (st.cantidadVendida + st.cantidadEntregada + st.cantidadDevuelta + st.cantidadMerma);
    }
  });

  // 3. Return remaining stock to CEDI Database, record mermas
  for (const item of ruta.inventario) {
    try {
      // Re-enter returning stock to general CEDI
      if (item.cantidadDevuelta > 0) {
        await prisma.producto.update({
          where: { id: item.productoId },
          data: {
            stockActual: {
              increment: item.cantidadDevuelta
            }
          }
        });
        
        await prisma.movimientoInventario.create({
          data: {
            organizationId: user.organizationId,
            productoId: item.productoId,
            tipoMovimiento: 'RETORNO_RUTA',
            cantidad: item.cantidadDevuelta,
            motivo: `Retorno de sobrantes de camión ${ruta.camionPlaca}`,
            referencia: `RUTA-${rutaId.slice(0, 8)}`,
            usuarioId: user.id
          }
        });
      }

      // Record damage as CEDI inventory reduction
      if (item.cantidadMerma > 0) {
        await prisma.movimientoInventario.create({
          data: {
            organizationId: user.organizationId,
            productoId: item.productoId,
            tipoMovimiento: 'MERMA_RUTA',
            cantidad: item.cantidadMerma,
            motivo: `Mermas registradas durante transporte en ruta ${ruta.rutaNombre}`,
            referencia: `RUTA-${rutaId.slice(0, 8)}`,
            usuarioId: user.id
          }
        });
      }
    } catch (prismaErr) {
      console.warn('Could not update Supabase inventory during closure:', prismaErr);
    }
  }

  // 4. Update route status
  ruta.estado = 'LIQUIDADA';
  ruta.fechaRetorno = new Date().toISOString();
  ruta.updatedAt = new Date().toISOString();

  db.rutas[rIdx] = ruta;
  await saveDb(db);

  const userName = [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Admin';
  await addRouteLog(rutaId, 'LIQUIDACIÓN', `Ruta liquidada de forma definitiva. Diferencia financiera: L${ruta.diferenciaFinanciera.toFixed(2)}`, userName);

  revalidatePath('/inventario-ventas/rutas');
  return { success: true };
}

// 11. Fetch CEDI products for loading/POS search fallback
export async function getCediProductos() {
  try {
    const user = await getUserOrg();
    const orgId = user?.organizationId;
    if (!orgId) return getMockProductos();

    const dbProducts = await prisma.producto.findMany({
      where: { organizationId: orgId, estado: 'ACTIVO' },
      orderBy: { nombre: 'asc' }
    });

    if (dbProducts.length === 0) return getMockProductos();
    return dbProducts.map(p => ({
      id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      precioVenta: Number(p.precioVenta),
      stockActual: p.stockActual,
      categoria: p.categoria || 'Flores'
    }));
  } catch (e) {
    return getMockProductos();
  }
}

// 12. Fetch CEDI clients
export async function getCediClientes() {
  try {
    const user = await getUserOrg();
    const orgId = user?.organizationId;
    if (!orgId) return getMockClientes();

    const dbClients = await prisma.cliente.findMany({
      where: { organizationId: orgId },
      orderBy: { nombre: 'asc' }
    });

    if (dbClients.length === 0) return getMockClientes();
    return dbClients.map(c => ({
      id: c.id,
      nombre: c.nombre,
      rtn: c.rtn || 'N/A',
      telefono: c.telefono || 'N/A',
      direccion: c.direccion || 'N/A'
    }));
  } catch (e) {
    return getMockClientes();
  }
}

// Helper mock data
function getMockProductos() {
  return [
    { id: 'prod-rosas', nombre: 'Rosas Rojas Importadas (Tallo)', sku: 'FL-ROS-01', precioVenta: 25, stockActual: 1200, categoria: 'Flores' },
    { id: 'prod-girasoles', nombre: 'Girasoles del Campo', sku: 'FL-GIR-02', precioVenta: 35, stockActual: 600, categoria: 'Flores' },
    { id: 'prod-eucalipto', nombre: 'Follaje Eucalipto (Paquete)', sku: 'FO-EUC-03', precioVenta: 60, stockActual: 300, categoria: 'Follaje' },
    { id: 'prod-lirios', nombre: 'Lirios Blancos Perfumados', sku: 'FL-LIR-04', precioVenta: 45, stockActual: 250, categoria: 'Flores' },
    { id: 'prod-claveles', nombre: 'Claveles Surtidos (Ramo)', sku: 'FL-CLA-05', precioVenta: 120, stockActual: 400, categoria: 'Ramos' }
  ];
}

function getMockClientes() {
  return [
    { id: 'c1', nombre: 'FLORISTERÍA ROSALÍA', rtn: '08011995123456', telefono: '9988-7766', direccion: 'SPS Barrio Guamilito' },
    { id: 'c2', nombre: 'EVENTOS ELEGANTES', rtn: '05011988654321', telefono: '3344-5566', direccion: 'SPS Col. Trejo' },
    { id: 'c3', nombre: 'DECO FLOR HONDURAS', rtn: '08012003889922', telefono: '8877-6655', direccion: 'Tegucigalpa Las Lomas' },
    { id: 'c4', nombre: 'CONSUMIDOR FINAL', rtn: '00000000000000', telefono: 'N/A', direccion: 'N/A' }
  ];
}

// ─── Camiones Registry Actions ──────────────────────────────────────────────
export async function getCamiones(): Promise<ICamion[]> {
  const user = await getUserOrg();
  const db = await getDb();
  
  if (user) {
    if (!db.camiones) db.camiones = [];
    db.camiones.forEach((c: any) => {
      if (!c.organizationId) c.organizationId = user.organizationId;
    });
    await saveDb(db);
    return db.camiones.filter((c: any) => c.organizationId === user.organizationId);
  }
  
  return db.camiones || [];
}

export async function createCamion(data: {
  placa: string;
  conductorId: string;
  conductorNombre: string;
  acompanante?: string;
  capacidadKilos: number;
  volumenM3: number;
  fotoUrl?: string;
}) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const db = await getDb();
  if (!db.camiones) db.camiones = [];
  
  // Check if plate already exists
  const exists = db.camiones.some((c: any) => c.placa.toLowerCase() === data.placa.toLowerCase() && c.organizationId === user.organizationId);
  if (exists) {
    return { success: false, error: 'Este camión ya se encuentra registrado.' };
  }

  const newCamion: ICamion = {
    id: crypto.randomUUID(),
    organizationId: user.organizationId,
    placa: data.placa.toUpperCase(),
    conductorId: data.conductorId,
    conductorNombre: data.conductorNombre,
    acompanante: data.acompanante || undefined,
    capacidadKilos: Number(data.capacidadKilos),
    volumenM3: Number(data.volumenM3),
    fotoUrl: data.fotoUrl || undefined,
    createdAt: new Date().toISOString()
  };

  db.camiones.push(newCamion);
  await saveDb(db);

  revalidatePath('/inventario-ventas/rutas');
  return { success: true, camion: newCamion };
}

export async function deleteCamion(id: string) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const db = await getDb();
  if (!db.camiones) db.camiones = [];
  db.camiones = db.camiones.filter((c: any) => c.id !== id);
  await saveDb(db);

  revalidatePath('/inventario-ventas/rutas');
  return { success: true };
}

// ─── Predefined Routes CRUD Actions ──────────────────────────────────────────
export async function getRutasPredefinidas(): Promise<{ id: string; origen: string; destino: string }[]> {
  const db = await getDb();
  if (!db.rutasPredefinidas) {
    db.rutasPredefinidas = [
      { id: 'rp-1', origen: 'San Pedro Sula', destino: 'La Esperanza' },
      { id: 'rp-2', origen: 'San Pedro Sula', destino: 'Santa Rosa de Copán' },
      { id: 'rp-3', origen: 'San Pedro Sula', destino: 'Tegucigalpa' }
    ];
    await saveDb(db);
  }
  return db.rutasPredefinidas;
}

export async function createRutaPredefinida(origen: string, destino: string) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const db = await getDb();
  if (!db.rutasPredefinidas) db.rutasPredefinidas = [];

  // Check duplicates
  const exists = db.rutasPredefinidas.some(
    (r: any) =>
      r.origen.toLowerCase().trim() === origen.toLowerCase().trim() &&
      r.destino.toLowerCase().trim() === destino.toLowerCase().trim()
  );
  if (exists) {
    return { success: false, error: 'Esta ruta ya existe.' };
  }

  const newRp = {
    id: crypto.randomUUID(),
    origen: origen.trim(),
    destino: destino.trim()
  };

  db.rutasPredefinidas.push(newRp);
  await saveDb(db);

  revalidatePath('/inventario-ventas/rutas');
  return { success: true, rutaPredefinida: newRp };
}

export async function deleteRutaPredefinida(id: string) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const db = await getDb();
  if (!db.rutasPredefinidas) db.rutasPredefinidas = [];
  db.rutasPredefinidas = db.rutasPredefinidas.filter((r: any) => r.id !== id);
  await saveDb(db);

  revalidatePath('/inventario-ventas/rutas');
  return { success: true };
}

export async function createCediInvoice(data: {
  clienteId: string;
  total: number;
}) {
  const user = await getUserOrg();
  if (!user) return { success: false, error: 'No autorizado' };

  const correlativo = `FAC-SO${String(Math.floor(100000 + Math.random() * 900000))}`;

  const invoice = await prisma.factura.create({
    data: {
      organizationId: user.organizationId,
      clienteId: data.clienteId,
      correlativo,
      total: data.total,
      subTotal: data.total,
      saldoPendiente: data.total,
      estado: 'PENDIENTE',
      tipoDocumento: 'FACTURA',
      estadoPago: 'PENDIENTE'
    },
    include: {
      cliente: true
    }
  });

  return { 
    success: true, 
    invoice: {
      id: invoice.id,
      numeroFactura: invoice.correlativo,
      clienteNombre: invoice.cliente.nombre,
      total: Number(invoice.total)
    }
  };
}
