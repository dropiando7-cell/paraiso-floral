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
