import { prisma } from '../src/lib/prisma';
import XLSX from 'xlsx';

async function main() {
  console.log('🚀 Configurando usuarios, vendedores y rutas para Paraíso Floral...');

  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('Organización no encontrada');

  const orgId = org.id;

  // 1. Actualizar administradores con acceso total a CxC
  await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'dropiando7@gmail.com' },
        { email: 'admin@paraisofloral.com' },
        { email: { contains: 'barahona' } },
        { email: { contains: 'marcio' } },
        { role: 'SUPER_ADMIN' },
        { role: 'ORG_ADMIN' },
        { role: 'GERENTE' }
      ]
    },
    data: {
      puedeVerTodasCxC: true,
      rutasAsignadas: ['Nacional / Todas las Rutas', 'Ruta Occidente', 'Ruta La Esperanza', 'Ruta Guamilito / Progreso']
    }
  });

  // 2. Crear / Actualizar Vendedor: José Méndez (Ruta Occidente)
  const joseMendez = await prisma.user.upsert({
    where: { email: 'jose.mendez@paraisofloral.com' },
    update: {
      nombre: 'José',
      apellido: 'Méndez',
      puesto: 'Vendedor de Ruta Occidente',
      role: 'USER',
      customRoleName: 'Vendedor',
      accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
      rutasAsignadas: ['Ruta Occidente', 'Occidente', 'Santa Rosa De Copan', 'Ocotepeque', 'San Marcos De Ocotepeque', 'Copan Ruinas', 'Azacualpa', '6 De Mayo', 'Santa Fe', 'San Pedro Sula'],
      puedeVerTodasCxC: false
    },
    create: {
      email: 'jose.mendez@paraisofloral.com',
      nombre: 'José',
      apellido: 'Méndez',
      puesto: 'Vendedor de Ruta Occidente',
      role: 'USER',
      customRoleName: 'Vendedor',
      organizationId: orgId,
      accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
      rutasAsignadas: ['Ruta Occidente', 'Occidente', 'Santa Rosa De Copan', 'Ocotepeque', 'San Marcos De Ocotepeque', 'Copan Ruinas', 'Azacualpa', '6 De Mayo', 'Santa Fe', 'San Pedro Sula'],
      puedeVerTodasCxC: false
    }
  });
  console.log('✅ Vendedor José Méndez configurado:', joseMendez.id);

  // 3. Crear / Actualizar Vendedora: Isamara Vigil (Ruta La Esperanza)
  const isamaraVigil = await prisma.user.upsert({
    where: { email: 'isamara.vigil@paraisofloral.com' },
    update: {
      nombre: 'Isamara',
      apellido: 'Vigil',
      puesto: 'Vendedora de Ruta La Esperanza',
      role: 'USER',
      customRoleName: 'Vendedor',
      accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
      rutasAsignadas: ['Ruta La Esperanza', 'La Esperanza', 'Intibucá', 'Marcala'],
      puedeVerTodasCxC: false
    },
    create: {
      email: 'isamara.vigil@paraisofloral.com',
      nombre: 'Isamara',
      apellido: 'Vigil',
      puesto: 'Vendedora de Ruta La Esperanza',
      role: 'USER',
      customRoleName: 'Vendedor',
      organizationId: orgId,
      accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
      rutasAsignadas: ['Ruta La Esperanza', 'La Esperanza', 'Intibucá', 'Marcala'],
      puedeVerTodasCxC: false
    }
  });
  console.log('✅ Vendedora Isamara Vigil configurada:', isamaraVigil.id);

  // 4. Crear / Actualizar Vendedor: Erick Saavedra (Ruta Guamilito / Progreso)
  const erickSaavedra = await prisma.user.upsert({
    where: { email: 'erick.saavedra@paraisofloral.com' },
    update: {
      nombre: 'Erick',
      apellido: 'Saavedra',
      puesto: 'Vendedor de Ruta Guamilito / Progreso',
      role: 'USER',
      customRoleName: 'Vendedor',
      accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
      rutasAsignadas: ['Ruta Guamilito / Progreso', 'Guamilito', 'Progreso', 'El Progreso', 'Yoro'],
      puedeVerTodasCxC: false
    },
    create: {
      email: 'erick.saavedra@paraisofloral.com',
      nombre: 'Erick',
      apellido: 'Saavedra',
      puesto: 'Vendedor de Ruta Guamilito / Progreso',
      role: 'USER',
      customRoleName: 'Vendedor',
      organizationId: orgId,
      accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
      rutasAsignadas: ['Ruta Guamilito / Progreso', 'Guamilito', 'Progreso', 'El Progreso', 'Yoro'],
      puedeVerTodasCxC: false
    }
  });
  console.log('✅ Vendedor Erick Saavedra configurado:', erickSaavedra.id);

  // 5. Crear / Actualizar Gerente: Lucio Barahona (Gerente General / Nacional)
  const lucioBarahona = await prisma.user.upsert({
    where: { email: 'lucio.barahona@paraisofloral.com' },
    update: {
      nombre: 'Lucio',
      apellido: 'Barahona',
      puesto: 'Gerente General',
      role: 'GERENTE',
      customRoleName: 'Gerente General',
      accessibleModules: ['/cxc', '/inventario', '/inventario-ventas', '/facturas', '/contactos', '/admin/users', '/reportes'],
      rutasAsignadas: ['Nacional / Todas las Rutas', 'Ruta Occidente', 'Ruta La Esperanza', 'Ruta Guamilito / Progreso'],
      puedeVerTodasCxC: true
    },
    create: {
      email: 'lucio.barahona@paraisofloral.com',
      nombre: 'Lucio',
      apellido: 'Barahona',
      puesto: 'Gerente General',
      role: 'GERENTE',
      customRoleName: 'Gerente General',
      organizationId: orgId,
      accessibleModules: ['/cxc', '/inventario', '/inventario-ventas', '/facturas', '/contactos', '/admin/users', '/reportes'],
      rutasAsignadas: ['Nacional / Todas las Rutas', 'Ruta Occidente', 'Ruta La Esperanza', 'Ruta Guamilito / Progreso'],
      puedeVerTodasCxC: true
    }
  });
  console.log('✅ Gerente Lucio Barahona configurado:', lucioBarahona.id);

  // 6. Crear / Actualizar Dirección: Francis Carías (Esposa del Dueño)
  const francisCarias = await prisma.user.upsert({
    where: { email: 'francis.carias@paraisofloral.com' },
    update: {
      nombre: 'Francis',
      apellido: 'Carías',
      puesto: 'Dirección Comercial & Clientes VIP',
      role: 'GERENTE',
      customRoleName: 'Dirección Comercial',
      accessibleModules: ['/cxc', '/inventario', '/inventario-ventas', '/facturas', '/contactos', '/reportes'],
      rutasAsignadas: ['Cartera Francis Carías', 'Nacional / Todas las Rutas'],
      puedeVerTodasCxC: true
    },
    create: {
      email: 'francis.carias@paraisofloral.com',
      nombre: 'Francis',
      apellido: 'Carías',
      puesto: 'Dirección Comercial & Clientes VIP',
      role: 'GERENTE',
      customRoleName: 'Dirección Comercial',
      organizationId: orgId,
      accessibleModules: ['/cxc', '/inventario', '/inventario-ventas', '/facturas', '/contactos', '/reportes'],
      rutasAsignadas: ['Cartera Francis Carías', 'Nacional / Todas las Rutas'],
      puedeVerTodasCxC: true
    }
  });
  console.log('✅ Dirección Francis Carías configurada:', francisCarias.id);

  // 7. Asignar los 55 clientes del Excel de José Méndez a "Ruta Occidente" y vendedorId = joseMendez.id
  const wb = XLSX.readFile('referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx', { raw: true });
  let asignadosCount = 0;

  for (const sheetName of wb.SheetNames) {
    if (['Hoja2', 'Hoja3', 'RESUMIDO'].includes(sheetName.trim())) continue;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    let headerName = '';
    let lugar = '';
    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toUpperCase();
        if (val.includes('CLIENTE')) {
          headerName = String(row[c+1] || row[c]).replace(/CLIENTE:?/i, '').trim();
        }
        if (val.includes('LUGAR')) {
          lugar = String(row[c+1] || row[c]).replace(/LUGAR:?/i, '').trim();
        }
      }
    }

    const cleanSheet = sheetName.trim();
    const cleanHeader = headerName.trim();

    const dbClients = await prisma.cliente.findMany({
      where: { organizationId: orgId }
    });

    const matchedClient = dbClients.find(c => {
      const dbN = c.nombre.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
      const sN = cleanSheet.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
      const hN = cleanHeader.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
      return dbN === sN || dbN === hN || (sN.length > 4 && dbN.includes(sN)) || (hN.length > 4 && dbN.includes(hN));
    });

    if (matchedClient) {
      await prisma.cliente.update({
        where: { id: matchedClient.id },
        data: {
          ruta: 'Ruta Occidente',
          vendedorId: joseMendez.id,
          departamento: lugar || matchedClient.departamento || 'Santa Rosa De Copan'
        }
      });
      asignadosCount++;
      console.log(`  🔗 [${matchedClient.nombre}] -> Ruta Occidente (José Méndez)`);
    }
  }

  console.log(`\n🎉 Total de clientes asignados a Ruta Occidente (José Méndez): ${asignadosCount}`);
}

main()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
