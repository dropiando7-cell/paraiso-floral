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
      Boolean(dbUser.customRoleName?.toUpperCase().includes('ADMIN')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('GERENTE')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('DUEÑ')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('PROPIETARIO')) ||
      dbUser.email === 'dropiando7@gmail.com' ||
      dbUser.email === 'admin@paraisofloral.com';

    // Fetch all users in organization with sales/route roles
    const vendedores = await prisma.user.findMany({
      where: {
        organizationId: dbUser.organizationId,
        isAssignable: true
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        puesto: true,
        rutasAsignadas: true,
        puedeVerTodasCxC: true
      },
      orderBy: { nombre: 'asc' }
    });

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
      vendedores: vendedores.map(v => ({
        id: v.id,
        nombre: `${v.nombre || ''} ${v.apellido || ''}`.trim() || v.email,
        email: v.email,
        puesto: v.puesto || 'Vendedor',
        rutasAsignadas: v.rutasAsignadas || []
      }))
    });
  } catch (error: any) {
    console.error('Error en /api/cxc/vendedores:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
