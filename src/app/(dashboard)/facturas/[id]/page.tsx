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

    let dbUser;
    try {
        dbUser = await getAuthenticatedUser();
    } catch (authError) {
        redirect('/login');
    }

    const allowedModules = dbUser.accessibleModules || [];
    const hasAccess = dbUser.role === 'SUPER_ADMIN' || 
                      dbUser.role === 'ORG_ADMIN' || 
                      allowedModules.includes('/facturas') || 
                      allowedModules.includes('facturas_propias');

    if (!hasAccess) {
        redirect('/unauthorized');
    }

    let org = null;
    let doc = null;
    let userRole = dbUser.role;
    
    try {
        const orgId = dbUser.organizationId;
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
                invoiceSettings: true,
                invoiceTemplates: true
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
                    activo: true,
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
                
                const mainItemPrice = ordenTrabajo.costoReparacion !== null ? Number(ordenTrabajo.costoReparacion) : (Number(ordenTrabajo.costoRevision) || 0);
                
                doc = {
                    tipoDocumento: 'FACTURA',
                    estado: 'BORRADOR',
                    clienteId: ordenTrabajo.clienteId,
                    cliente: ordenTrabajo.cliente,
                    ordenTrabajoId: ordenTrabajo.id,
                    subTotal: 0,
                    total: 0,
                    detalles: [
                        {
                            porcentajeIsv: 15,
                            descripcion: `Servicio de Mantenimiento - ${ordenTrabajo.equipoDano}` +
                                ((ordenTrabajo.marcaModelo || ordenTrabajo.serie)
                                    ? `\n${[
                                        ordenTrabajo.marcaModelo ? `Marca/Modelo: ${ordenTrabajo.marcaModelo}` : null,
                                        ordenTrabajo.serie ? `Serie: ${ordenTrabajo.serie}` : null
                                    ].filter(Boolean).join('\n')}`
                                    : ''),
                            cantidad: 1,
                            precioUnitario: mainItemPrice,
                            totalDescuento: 0,
                            totalLinea: mainItemPrice,
                            activoId: ordenTrabajo.activoId || undefined,
                            activo: {
                                id: ordenTrabajo.activo?.id || undefined,
                                idQr: ordenTrabajo.activo?.idQr || '',
                                descripcionCorta: ordenTrabajo.activo?.descripcionCorta || ordenTrabajo.equipoDano,
                                serie: ordenTrabajo.activo?.serie || ordenTrabajo.serie || null,
                                imagenUrl: ordenTrabajo.fotosTecnico?.[0] || ordenTrabajo.fotosEstadoInicial?.[0] || ordenTrabajo.activo?.imagenUrl || undefined
                            }
                        },
                        ...ordenTrabajo.repuestos.map(r => ({
                            porcentajeIsv: 15,
                            descripcion: r.producto?.nombre || r.activoFijo?.descripcionCorta || 'Repuesto',
                            cantidad: r.cantidad,
                            precioUnitario: r.precioAprobado !== null ? Number(r.precioAprobado) : Number(r.precioSugerido || 0),
                            totalDescuento: 0,
                            totalLinea: r.cantidad * (r.precioAprobado !== null ? Number(r.precioAprobado) : Number(r.precioSugerido || 0)),
                            productoId: r.productoId,
                            activoId: r.activoFijoId,
                            producto: r.producto ? { sku: r.producto.sku } : undefined,
                            activo: r.activoFijo ? {
                              id: r.activoFijo.id,
                              idQr: r.activoFijo.idQr,
                              descripcionCorta: r.activoFijo.descripcionCorta,
                              serie: r.activoFijo.serie,
                              imagenUrl: r.activoFijo.imagenUrl
                            } : undefined
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

    const verSoloPropias = dbUser.role !== 'SUPER_ADMIN' && 
                           dbUser.role !== 'ORG_ADMIN' && 
                           allowedModules.includes('facturas_propias');

    if (verSoloPropias && doc && doc.creadoPorId !== dbUser.id && id !== 'nuevo') {
        redirect('/unauthorized');
    }

    // Restricción: Si el documento es una Factura ya Emitida
    const authSupervisorName = typeof resolvedSearchParams?.authSupervisor === 'string' ? resolvedSearchParams.authSupervisor : undefined;
    const authSupervisorCode = typeof resolvedSearchParams?.authCode === 'string' ? resolvedSearchParams.authCode : undefined;

    if (doc && doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA' && !isClone && !isNotaCredito) {
        const orgSettings = (org?.invoiceSettings as any) || {};
        const segConfig = orgSettings.seguridadFacturas || {};
        const limiteActivo = segConfig.limiteEdicionActivo !== false;
        const horasLimite = Number(segConfig.horasLimiteEdicion ?? 24);

        const fechaEmision = doc.fechaEmision ? new Date(doc.fechaEmision) : new Date();
        const diffHoras = (Date.now() - fechaEmision.getTime()) / (1000 * 60 * 60);
        const estaBloqueadaPorTiempo = limiteActivo && (diffHoras > horasLimite);

        const isSuperAdmin = userRole === 'SUPER_ADMIN' || dbUser.email === 'master@superapp.com';
        const isGerenteIlimitado = isSuperAdmin || 
                                   allowedModules.includes('editar_facturas_sin_limite') ||
                                   dbUser.customRoleName === 'PF_GERENCIA_AVANZADA' ||
                                   ['lucio@paraisofloralhn.com', 'lucio.barahona@paraisofloral.com', 'francis@paraisofloralhn.com', 'francis.carias@paraisofloral.com'].includes(dbUser.email || '');

        const canEdit24h = isGerenteIlimitado || 
                           userRole === 'ORG_ADMIN' || 
                           userRole === 'GERENTE' || 
                           dbUser.customRoleName === 'PF_GERENCIA' || 
                           allowedModules.includes('editar_facturas_emitidas') || 
                           allowedModules.includes('editar_facturas_24h');

        if (estaBloqueadaPorTiempo) {
            if (!isGerenteIlimitado && !authSupervisorName) {
                redirect(`/facturas/ver/${id}?authRequired=true`);
            }
        } else {
            if (!canEdit24h) {
                redirect(`/facturas/ver/${id}`);
            }
        }
    }

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col">
            <FacturacionHeader activeTab={isClone || isNotaCredito ? "creador" : "editar"} isSubPage={true} />
            <div className="p-6 max-w-[1400px] mx-auto w-full">
               <DocumentBuilderClient 
                 organization={org} 
                 initialData={doc} 
                 editMode={!isClone && !isNotaCredito} 
                 isNotaCredito={isNotaCredito} 
                 userRole={userRole} 
                 userAccessibleModules={allowedModules}
                 userEmail={dbUser.email}
                 supervisorAuthName={authSupervisorName}
                 supervisorAuthCode={authSupervisorCode}
               />
            </div>
        </div>
    );
}
