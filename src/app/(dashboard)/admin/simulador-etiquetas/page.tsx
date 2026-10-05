import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import SimuladorEtiquetasClient, { ProductItem } from './SimuladorEtiquetasClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Entorno de Pruebas: Simulador de Etiquetas | Paraíso Floral',
};

export default async function SimuladorEtiquetasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { organization: true }
  });

  // Acceso exclusivo para SUPER_ADMIN
  if (!dbUser || dbUser.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  // 1. Cargar todas las flores y productos físicos etiquetados con su ID QR real (ej. 000069 - BABY ECUADOR)
  const activos = await prisma.activoFijo.findMany({
    where: {
      organizationId: dbUser.organizationId,
      estatusContable: 'VIGENTE'
    },
    select: {
      id: true,
      idQr: true,
      descripcionCorta: true,
      stock: true,
      area: true,
      modelo: true,
      serie: true,
      costoAdq: true,
      productoId: true,
      producto: {
        select: {
          id: true,
          nombre: true,
          precioVenta: true,
          isvAplicable: true
        }
      }
    },
    orderBy: { idQr: 'asc' }
  });

  // Mapear los activos físicos con su correlativo real de inventario
  const realInventoryItems: ProductItem[] = activos.map(a => ({
    code: a.idQr, // ID QR oficial: 000069, 010043, etc.
    name: a.descripcionCorta,
    price: Number(a.producto?.precioVenta || a.costoAdq || 0),
    category: a.area || 'Cámara Fría',
    unit: a.modelo || 'paq',
    stock: a.stock,
    productoId: a.producto?.id || a.productoId || undefined,
    qtySuggested: 1
  }));

  return (
    <SimuladorEtiquetasClient inventoryProducts={realInventoryItems} />
  );
}
