import { getRutas, getCediProductos, getCediClientes } from '../actions';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PosMovilClient from './PosMovilClient';

export const dynamic = 'force-dynamic';

export default async function PosMovilPage() {
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

  // Fetch only active routes that driver can select
  const routes = await getRutas();
  const activeRoutes = routes.filter(r => r.estado === 'EN_RUTA' || r.estado === 'CARGANDO');

  // Fetch CEDI products and clients
  const products = await getCediProductos();
  const clients = await getCediClientes();

  const serializedRoutes = JSON.parse(JSON.stringify(activeRoutes));
  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedClients = JSON.parse(JSON.stringify(clients));

  return (
    <PosMovilClient
      dbUser={JSON.parse(JSON.stringify(dbUser))}
      activeRoutes={serializedRoutes}
      cediProducts={serializedProducts}
      cediClients={serializedClients}
    />
  );
}
