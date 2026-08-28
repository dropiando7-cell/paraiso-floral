import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { withRoleGuard } from '@/utils/rbac';
import { getPedidoById } from '../../actions';
import { getCediProductos } from '../../../rutas/actions';
import PrepararPedidoClient from './PrepararPedidoClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PrepararPage({ params }: PageProps) {
  const { id } = await params;
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

  const pedido = await getPedidoById(id);
  if (!pedido) {
    return notFound();
  }

  const products = await getCediProductos();
  const serializedUser = JSON.parse(JSON.stringify(dbUser));

  return (
    <PrepararPedidoClient
      dbUser={serializedUser}
      initialPedido={pedido as any}
      products={products}
    />
  );
}

export default withRoleGuard('/inventario-ventas/pedidos/preparar', PrepararPage);
