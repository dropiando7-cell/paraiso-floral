import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        puesto: true,
        organizationId: true,
        rutasAsignadas: true,
        puedeVerTodasCxC: true,
        accessibleModules: true,
        customRoleName: true
      }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const esAdminOGerente =
      dbUser.role === 'SUPER_ADMIN' ||
      dbUser.role === 'GERENTE' ||
      dbUser.role === 'ORG_ADMIN' ||
      dbUser.puedeVerTodasCxC === true ||
      Boolean(dbUser.accessibleModules?.includes('cxc_global')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('ADMIN')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('GERENTE')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('GERENCIA')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('DUEÑ')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('PROPIETARIO')) ||
      dbUser.email === 'dropiando7@gmail.com' ||
      dbUser.email === 'admin@paraisofloral.com';

    // Lista oficial de los 4 vendedores asignados en Facturación y CxC
    const VENDEDORES_OFICIALES = [
      {
        id: 'Jose Mendez',
        nombre: 'Jose Mendez',
        email: 'jose.mendez@paraisofloral.com',
        puesto: 'Ruta Occidente',
        rutasAsignadas: ['Ruta Occidente']
      },
      {
        id: 'Isamara Vigil',
        nombre: 'Isamara Vigil',
        email: 'isamara.vigil@paraisofloral.com',
        puesto: 'Ruta La Esperanza',
        rutasAsignadas: ['Ruta La Esperanza']
      },
      {
        id: 'Erick Saavedra',
        nombre: 'Erick Saavedra',
        email: 'erick.saavedra@paraisofloral.com',
        puesto: 'Ruta Guamilito / Progreso',
        rutasAsignadas: ['Ruta Guamilito / Progreso']
      },
      {
        id: 'Francis Carias',
        nombre: 'Francis Carias',
        email: 'francis.carias@paraisofloral.com',
        puesto: 'Cartera Francis Carías',
        rutasAsignadas: ['Cartera Francis Carías']
      }
    ];

    return NextResponse.json({
      currentUser: {
        id: dbUser.id,
        nombre: `${dbUser.nombre || ''} ${dbUser.apellido || ''}`.trim() || dbUser.email,
        email: dbUser.email,
        role: dbUser.role,
        puesto: dbUser.puesto,
        rutasAsignadas: dbUser.rutasAsignadas || [],
        puedeVerTodasCxC: esAdminOGerente
      },
      vendedores: VENDEDORES_OFICIALES
    });
  } catch (error: any) {
    console.error('Error en /api/cxc/vendedores:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
