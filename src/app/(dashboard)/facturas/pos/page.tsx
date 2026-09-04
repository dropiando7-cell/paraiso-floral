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

  // Check if there is an active session
  const activeSession = await prisma.corteCajaSession.findFirst({
    where: {
      organizationId: orgId,
      estado: 'ABIERTA'
    }
  });

  if (!activeSession) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[110] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl border border-slate-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-950">Apertura de Caja Requerida</h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Para poder facturar en el Punto de Venta (POS), es necesario abrir el turno de caja diaria con un saldo inicial en efectivo para dar cambio.
          </p>
          <div className="mt-8 space-y-3">
            <a
              href="/cierre-caja"
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition duration-150 text-sm cursor-pointer"
            >
              Abrir Caja Ahora
            </a>
            <a
              href="/facturas"
              className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition duration-150 text-sm cursor-pointer"
            >
              Volver a Facturas
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Load all generic products with stock > 0 + services
  const rawProducts = await prisma.producto.findMany({
    where: { 
      organizationId: orgId, 
      estado: 'ACTIVO',
      OR: [
        { 
          stockActual: { gt: 0 },
          activosFijos: { none: {} }
        },
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
      stockActual: a.stock, // Use the real stock of the asset (for both unique assets and consumables)
      isvAplicable: a.producto?.isvAplicable ?? 15,
      esServicio: a.area === 'SERVICIOS' || a.stock === 9999 || a.producto?.esServicio === true,
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

  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-hidden">
      <POSFacturacion 
        productos={productos} 
        categorias={categorias}
        onEmitirFactura={emitFactura}
        cajeroNombre={user.fullName}
        organization={org ? {
          name: org.name || undefined,
          direccion: org.direccion || undefined,
          telefono: org.telefono || undefined,
          correoContacto: org.correoContacto || undefined,
          rtn: org.rtn || undefined,
          logoUrl: org.logoUrl || undefined
        } : undefined}
      />
    </div>
  );
}
