import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getPedidoById } from '../../actions';
import ImprimirPedidoClient from './ImprimirPedidoClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ImprimirPedidoPage({ params }: PageProps) {
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
  if (!pedido) return notFound();

  const serializedUser = JSON.parse(JSON.stringify(dbUser));

  return (
    <ImprimirPedidoClient
      dbUser={serializedUser}
      pedido={pedido as any}
    />
  );
}
