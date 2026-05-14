import { Metadata } from 'next';
import CajaChicaClient from './CajaChicaClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Caja Chica | Bioelectrónica Honduras',
  description: 'Control de caja chica y gastos menores',
};

export default async function CajaChicaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect('/auth/login');
  
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { organization: true }
  });
  
  if (!dbUser) redirect('/auth/login');

  return <CajaChicaClient dbUser={dbUser} />;
}
