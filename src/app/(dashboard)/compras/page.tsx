import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ComprasExcelGrid from '@/components/compras/ComprasExcelGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Libro de Compras | Paraíso Floral',
  description: 'Gestión de compras y gastos de la distribuidora',
};

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect('/login');
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true, accessibleModules: true }
  });

  const isAllowed = 
    dbUser?.role === 'SUPER_ADMIN' ||
    dbUser?.role === 'ORG_ADMIN' ||
    dbUser?.role === 'GERENTE' ||
    (dbUser?.accessibleModules || []).includes('/compras');

  if (!isAllowed) {
    redirect('/');
  }
  return (
    <div className="px-2 py-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Módulo de Compras
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Libro de registro para todas las compras y gastos de la empresa.
          </p>
        </div>
      </div>

      <ComprasExcelGrid />
    </div>
  );
}
