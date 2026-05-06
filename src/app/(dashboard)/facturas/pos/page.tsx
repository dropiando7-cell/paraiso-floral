import POSFacturacion, { POSProduct, POSFacturaPayload } from '@/components/facturacion/POSFacturacion';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getOrganizationId, crearFacturaSegura } from '../actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function POSPage() {
  const orgId = await getOrganizationId();
  const user = await getAuthenticatedUser();

  if (!orgId) redirect('/login');

  // Load all generic products with stock > 0 + services
  const rawProducts = await prisma.producto.findMany({
    where: { 
      organizationId: orgId, 
      estado: 'ACTIVO',
      OR: [
        { stockActual: { gt: 0 } },
        { esServicio: true }
      ]
    },
    orderBy: { nombre: 'asc' }
  });

  // Load serialized assets waiting to be sold
  const rawActivos = await prisma.activoFijo.findMany({
    where: {
      organizationId: orgId,
      estatusContable: 'VIGENTE'
    },
    include: {
      producto: true
    },
    orderBy: { descripcionCorta: 'asc' }
  });

  const categorias: string[] = [];

  const productos: POSProduct[] = [
    ...rawProducts.map(p => ({
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      precioVenta: Number(p.precioVenta),
      stockActual: p.stockActual,
      isvAplicable: p.isvAplicable,
      esServicio: p.esServicio,
      isActivoFijo: false,
      codigoBarras: null
    })),
    ...rawActivos.map(a => ({
      id: a.id,
      sku: a.idQr || a.serie || 'SD',
      nombre: a.descripcionCorta,
      precioVenta: Number(a.producto?.precioVenta || a.costoAdq || 0),
      stockActual: 1, // Unique physical asset
      isvAplicable: a.producto?.isvAplicable ?? 15,
      esServicio: false,
      isActivoFijo: true,
      imageUrl: a.imagenUrl || undefined,
      codigoBarras: a.codigoBarras || null
    }))
  ];

  // Server action wrapper to emit
  async function emitFactura(payload: POSFacturaPayload) {
    'use server';
    try {
      const res = await crearFacturaSegura(payload, payload.detalles, 'FACTURA');
      return res;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-hidden">
      <POSFacturacion 
        productos={productos} 
        categorias={categorias}
        onEmitirFactura={emitFactura}
        cajeroNombre={user.fullName}
      />
    </div>
  );
}
