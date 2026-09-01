import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { withRoleGuard } from '@/utils/rbac';
import { getAuxiliares } from '../actions';
import { getCediProductos, getCediClientes } from '../../rutas/actions';
import NuevoPedidoParserClient from './NuevoPedidoParserClient';

export const dynamic = 'force-dynamic';

async function NuevoPedidoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { organization: true }
  });

  if (!dbUser) {
    redirect('/unauthorized');
  }

  // If user is restricted to only preparing orders, redirect them to the orders list
  if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN') {
    const allowed = dbUser.accessibleModules || [];
    const canCreate = allowed.includes('/inventario-ventas/pedidos/nuevo') || 
                      allowed.includes('crear_pedidos') || 
                      (!allowed.includes('/inventario-ventas/pedidos/preparar') && allowed.includes('/inventario-ventas/pedidos'));
    if (!canCreate) {
      redirect('/inventario-ventas/pedidos');
    }
  }

  // Fetch data
  const assistants = await getAuxiliares();
  const products = await getCediProductos();
  const clients = await getCediClientes();

  const serializedUser = JSON.parse(JSON.stringify(dbUser));

  return (
    <NuevoPedidoParserClient
      dbUser={serializedUser}
      assistants={assistants}
      products={products}
      clients={clients}
    />
  );
}

export default withRoleGuard('/inventario-ventas/pedidos', NuevoPedidoPage);
