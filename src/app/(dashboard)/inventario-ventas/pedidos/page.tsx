import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { withRoleGuard } from '@/utils/rbac';
import { getPedidos, getAuxiliares } from './actions';
import { getCediProductos } from '../rutas/actions';
import PedidosAdminClient from './PedidosAdminClient';

export const dynamic = 'force-dynamic';

async function PedidosPage() {
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

  // Fetch orders, assistants, and catalog products
  const initialPedidos = await getPedidos();
  const assistants = await getAuxiliares();
  const products = await getCediProductos();

  const serializedUser = JSON.parse(JSON.stringify(dbUser));

  return (
    <PedidosAdminClient
      dbUser={serializedUser}
      initialPedidos={initialPedidos as any}
      assistants={assistants}
      products={products}
    />
  );
}

export default withRoleGuard('/inventario-ventas/pedidos', PedidosPage);
