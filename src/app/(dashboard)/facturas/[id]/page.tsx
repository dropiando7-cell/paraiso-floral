import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../DocumentBuilderClient';
import { getAuthenticatedUser, getDocumentoById } from '../actions';
import { redirect } from 'next/navigation';

import FacturacionHeader from '../FacturacionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditDocumentPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const isClone = resolvedSearchParams?.clone === 'true';
    const isNotaCredito = resolvedSearchParams?.notaCredito === 'true';

    let org = null;
    let doc = null;
    let userRole = 'USER';
    
    try {
        const authUser = await getAuthenticatedUser();
        const orgId = authUser.organizationId;
        userRole = authUser.role;

        org = await prisma.organization.findUnique({ 
            where: { id: orgId },
            select: { 
                name: true, 
                logoUrl: true, 
                direccion: true, 
                rtn: true, 
                telefono: true, 
                correoContacto: true,
                qrPrefix: true,
                invoiceSettings: true
            }
        });
        
        const queryOrdenTrabajoId = resolvedSearchParams?.ordenTrabajoId as string | undefined;
        if (org && id !== 'nuevo') {
            doc = await getDocumentoById(id);
        } else if (org && id === 'nuevo' && queryOrdenTrabajoId) {
            const ordenTrabajo = await prisma.ordenTrabajo.findUnique({
                where: { id: queryOrdenTrabajoId },
                include: {
                    cliente: true,
                    repuestos: {
                        include: {
                            producto: true,
                            activoFijo: true
                        }
                    }
                }
            });
            if (ordenTrabajo) {
                const manoObraArr = Array.isArray(ordenTrabajo.detalleManoObra) ? (ordenTrabajo.detalleManoObra as any[]) : [];
                const esRevisionPagada = Number(ordenTrabajo.costoRevision) > 0 && 
                                         ordenTrabajo.metodoPagoRevision && 
                                         ordenTrabajo.metodoPagoRevision !== 'Ninguno';
                
                doc = {
                    tipoDocumento: 'FACTURA',
                    estado: 'BORRADOR',
                    clienteId: ordenTrabajo.clienteId,
                    cliente: ordenTrabajo.cliente,
                    ordenTrabajoId: ordenTrabajo.id,
                    subTotal: 0,
                    total: 0,
                    detalles: [
                        ...ordenTrabajo.repuestos.map(r => ({
                            porcentajeIsv: 15,
                            descripcion: r.producto?.nombre || r.activoFijo?.descripcionCorta || 'Repuesto',
                            cantidad: r.cantidad,
                            precioUnitario: r.precioAprobado !== null ? Number(r.precioAprobado) : Number(r.precioSugerido || 0),
                            totalDescuento: 0,
                            totalLinea: r.cantidad * (r.precioAprobado !== null ? Number(r.precioAprobado) : Number(r.precioSugerido || 0)),
                            productoId: r.productoId,
                            activoId: r.activoFijoId
                        })),
                        ...manoObraArr.map(m => ({
                            porcentajeIsv: 15,
                            descripcion: m.descripcion || 'Mano de Obra',
                            cantidad: m.horas || 1,
                            precioUnitario: Number(m.tarifa || 0),
                            totalDescuento: 0,
                            totalLinea: (m.horas || 1) * Number(m.tarifa || 0)
                        })),
                        ...(esRevisionPagada ? [{
                            porcentajeIsv: 0,
                            descripcion: 'Abono/Crédito por Costo de Revisión Ya Pagado',
                            cantidad: 1,
                            precioUnitario: -Number(ordenTrabajo.costoRevision),
                            totalDescuento: 0,
                            totalLinea: -Number(ordenTrabajo.costoRevision)
                        }] : [])
                    ]
                };
            }
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org) redirect('/dashboard');
    if (!doc && id !== 'nuevo') redirect('/facturas');

    // Restricción: Si el documento es una Factura ya Emitida y no es admin, redirigir a ver
    if (doc && doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA' && !isClone && !isNotaCredito) {
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'ORG_ADMIN') {
            redirect(`/facturas/ver/${id}`);
        }
    }

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col">
            <FacturacionHeader activeTab={isClone || isNotaCredito ? "creador" : "editar"} isSubPage={true} />
            <div className="p-6 max-w-[1400px] mx-auto w-full">
               <DocumentBuilderClient organization={org} initialData={doc} editMode={!isClone && !isNotaCredito} isNotaCredito={isNotaCredito} userRole={userRole} />
            </div>
        </div>
    );
}
