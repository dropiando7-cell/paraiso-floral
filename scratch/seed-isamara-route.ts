import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const ORG_ID = 'a0287245-6cad-4df5-a32a-f214b7b72e04';
const DB_FILE_PATH = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'inventario-ventas', 'rutas', 'db.json');

async function main() {
  console.log('=== 1. CREATING OR ENSURING ISAMARA USER ===');
  let isamara = await prisma.user.findFirst({
    where: {
      organizationId: ORG_ID,
      nombre: { contains: 'Isamara', mode: 'insensitive' }
    }
  });

  if (!isamara) {
    isamara = await prisma.user.create({
      data: {
        organizationId: ORG_ID,
        nombre: 'Isamara',
        apellido: 'Ruta',
        email: 'isamara@paraisofloralhn.com',
        role: 'USER'
      }
    });
    console.log('Usuario Isamara creado:', isamara.id);
  } else {
    console.log('Usuario Isamara ya existe:', isamara.id, isamara.nombre);
  }

  console.log('=== 2. CREATING OR ENSURING MISSING PRODUCTS ===');
  const productsToEnsure = [
    { nombre: 'Rosas Rojas', sku: 'PF-000001', stockActual: 150, precioVenta: 120 },
    { nombre: 'Rosas Colores', sku: 'PF-000002', stockActual: 150, precioVenta: 120 },
    { nombre: 'Rosas Blancas', sku: 'PF-000003', stockActual: 100, precioVenta: 120 },
    { nombre: 'Cotoc / Cotopaxi', sku: 'PF-000216', stockActual: 50, precioVenta: 110 },
    { nombre: 'Mini Rosa', sku: 'PF-000217', stockActual: 60, precioVenta: 120 },
    { nombre: 'Pitosporo', sku: 'PF-000218', stockActual: 40, precioVenta: 90 },
    { nombre: 'Dusty Miller / Dustin', sku: 'PF-000219', stockActual: 40, precioVenta: 90 },
    { nombre: 'Craspedia', sku: 'PF-000220', stockActual: 40, precioVenta: 110 },
    { nombre: 'Pinocho Morado', sku: 'PF-000221', stockActual: 30, precioVenta: 110 },
    { nombre: 'Limonium', sku: 'PF-000222', stockActual: 40, precioVenta: 110 },
    { nombre: 'Baby Ecuatoriano (Gypsophila)', sku: 'PF-000223', stockActual: 100, precioVenta: 130 }
  ];

  for (const item of productsToEnsure) {
    const existing = await prisma.producto.findFirst({
      where: {
        organizationId: ORG_ID,
        OR: [
          { sku: item.sku },
          { nombre: { equals: item.nombre, mode: 'insensitive' } }
        ]
      }
    });

    if (!existing) {
      const created = await prisma.producto.create({
        data: {
          organizationId: ORG_ID,
          nombre: item.nombre,
          sku: item.sku,
          stockActual: item.stockActual,
          precioVenta: item.precioVenta,
          estado: 'ACTIVO'
        }
      });
      console.log(`+ Creado producto: ${created.sku} - ${created.nombre}`);
    } else {
      console.log(`= Producto existente: ${existing.sku} - ${existing.nombre}`);
    }
  }

  // Fetch all products to have exact DB ids
  const allDbProducts = await prisma.producto.findMany({
    where: { organizationId: ORG_ID }
  });

  const getProd = (searchTerm: string, fallbackName: string, fallbackSku: string) => {
    const term = searchTerm.toLowerCase();
    const found = allDbProducts.find(p => p.nombre.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
    if (found) return found;
    return { id: `mock-${fallbackSku}`, nombre: fallbackName, sku: fallbackSku, stockActual: 100, precioVenta: 110 };
  };

  console.log('=== 3. REGISTERING CAMIONETA AND DESPACHO 31 DE AGOSTO ===');
  // Load current rutas_db
  let rutasDb: any = { rutas: [], camiones: [], rutasPredefinidas: [], logs: [] };
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'rutas_db' } });
  if (setting) {
    rutasDb = JSON.parse(setting.value);
  }

  // Ensure Camioneta in camiones list
  let camioneta = rutasDb.camiones.find((c: any) => c.placa === 'CAMIONETA' || c.id === 'cam-camioneta-isamara');
  if (!camioneta) {
    camioneta = {
      id: 'cam-camioneta-isamara',
      organizationId: ORG_ID,
      placa: 'CAMIONETA',
      conductorId: isamara.id,
      conductorNombre: 'Isamara',
      acompanante: 'Auxiliar de Ruta',
      capacidadKilos: 1000,
      volumenM3: 8,
      fotoUrl: '/camion-reparto-icono.png',
      createdAt: new Date('2026-08-31T06:00:00.000Z').toISOString()
    };
    rutasDb.camiones.push(camioneta);
    console.log('+ Vehículo Camioneta registrado');
  }

  // Define Items dispatched on 31 de Agosto
  const itemsCarga = [
    // General
    { name: 'Rosas Rojas', query: 'rosas rojas', qty: 20 },
    { name: 'Solidago', query: 'solidago', qty: 27 },
    { name: 'Rosas Colores', query: 'rosas colores', qty: 33 },
    { name: 'Rosas Blancas', query: 'rosas blancas', qty: 10 },
    { name: 'Pompones Blanco', query: 'pompones blanco', qty: 7 },
    { name: 'Pinocho Verde', query: 'pinocho verde', qty: 1 },
    { name: 'Eucalipto Dólar', query: 'eucalipto d', qty: 2 },
    
    // Pedido 1 & específicos
    { name: 'Minigirasol', query: 'minigirasol', qty: 3 },
    { name: 'Lagrimas', query: 'lagrimas', qty: 1 },
    { name: 'Quinceañeras', query: 'quinceañeras', qty: 2 },
    { name: 'Rosas Colores (Adicional)', query: 'rosas colores', qty: 1 },
    { name: 'Cotoc / Cotopaxi', query: 'cotoc', qty: 2 },
    { name: 'Mini Rosa', query: 'mini rosa', qty: 5 },
    { name: 'Miniclavel Colores', query: 'miniclavel colores', qty: 34 },
    { name: 'Gerberas Colores', query: 'gerberas', qty: 20 },
    { name: 'Astromelias Colores', query: 'astromelias', qty: 4 },
    { name: 'Pitosporo', query: 'pitosporo', qty: 5 },
    { name: 'Dusty Miller / Dustin', query: 'dustin', qty: 2 },
    { name: 'Girasoles', query: 'girasoles', qty: 1 },
    { name: 'Claveles Colores', query: 'claveles colores', qty: 3 },
    { name: 'Margaritas Colores', query: 'margaritas colores', qty: 6 },
    { name: 'Craspedia', query: 'craspedia', qty: 2 },
    { name: 'Pinocho Morado', query: 'pinocho morado', qty: 2 },
    { name: 'Limonium', query: 'limonium', query2: 'limonium', qty: 2 },
    { name: 'Lisianthus Colores', query: 'lisianthus', qty: 1 },
    { name: 'Lirios Colores', query: 'lirios', qty: 3 },
    { name: 'Baby Ecuatoriano (Gypsophila)', query: 'baby ecuatoriano', qty: 15 }
  ];

  const rutaId = 'ruta-isamara-la-esperanza-31ago';

  const inventario: any[] = [];
  const cargoGrid: any[] = [];

  const bayCodes = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3'];
  let bayIdx = 0;

  itemsCarga.forEach((it, idx) => {
    const prod = getProd(it.query, it.name, `PF-GEN-${idx}`);
    inventario.push({
      id: `inv-${idx + 1}`,
      rutaId: rutaId,
      productoId: prod.id,
      productoNombre: prod.nombre,
      productoSku: prod.sku,
      cantidadCargada: it.qty,
      cantidadVendida: 0,
      cantidadEntregada: 0,
      cantidadDevuelta: 0,
      cantidadMerma: 0,
      cantidadDiferencia: 0
    });

    if (bayIdx < bayCodes.length) {
      cargoGrid.push({
        id: `grid-${idx + 1}`,
        rutaId: rutaId,
        bahia: bayCodes[bayIdx],
        contenido: `${prod.nombre} (${it.qty} paq.)`
      });
      bayIdx++;
    }
  });

  const totalTallos = inventario.reduce((acc, curr) => acc + curr.cantidadCargada, 0);

  // Check if route already exists
  const existingRutaIdx = rutasDb.rutas.findIndex((r: any) => r.id === rutaId);

  const nuevaRuta = {
    id: rutaId,
    organizationId: ORG_ID,
    camionPlaca: 'CAMIONETA',
    conductorId: isamara.id,
    conductorNombre: 'Isamara',
    conductorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    rutaNombre: 'San Pedro Sula ➡️ La Esperanza',
    estado: 'EN_RUTA',
    dock: 'Muelle 1 (CEDI SPS)',
    fechaSalida: new Date('2026-08-31T06:00:00.000Z').toISOString(),
    capacidadKilos: 1000,
    volumenM3: 8,
    efectivoInicial: 2000,
    ventasContado: 0,
    abonosCxC: 0,
    efectivoEntregado: 0,
    diferenciaFinanciera: 0,
    acompanante: 'Auxiliar de Bodega',
    fotoUrl: '/camion-reparto-icono.png',
    createdAt: new Date('2026-08-31T05:30:00.000Z').toISOString(),
    updatedAt: new Date().toISOString(),
    cargoGrid,
    pedidos: [
      {
        id: 'ped-la-esperanza-1',
        rutaId: rutaId,
        facturaId: 'FAC-PRE-001',
        facturaNumero: 'PEDIDO 1 - LA ESPERANZA',
        clienteNombre: 'CLIENTE LOCAL LA ESPERANZA',
        totalFactura: 0,
        estadoEntrega: 'PENDIENTE',
        montoCobrado: 0,
        formaPago: 'EFECTIVO'
      }
    ],
    inventario,
    mermas: [],
    abonos: []
  };

  if (existingRutaIdx >= 0) {
    rutasDb.rutas[existingRutaIdx] = nuevaRuta;
    console.log('✓ Ruta de Isamara actualizada');
  } else {
    rutasDb.rutas.unshift(nuevaRuta);
    console.log('✓ Nueva ruta de Isamara agregada');
  }

  // Save to systemSetting and db.json
  await prisma.systemSetting.upsert({
    where: { key: 'rutas_db' },
    update: { value: JSON.stringify(rutasDb) },
    create: { key: 'rutas_db', value: JSON.stringify(rutasDb) }
  });

  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(rutasDb, null, 2), 'utf-8');
  } catch (e) {}

  console.log(`\n🎉 Despacho registrado exitosamente!`);
  console.log(`- Conductora: Isamara`);
  console.log(`- Vehículo: Camioneta`);
  console.log(`- Fecha Salida: 31 de Agosto 2026`);
  console.log(`- Destino: La Esperanza`);
  console.log(`- Total paquetes cargados: ${totalTallos}`);
}

main().finally(() => prisma.$disconnect());
