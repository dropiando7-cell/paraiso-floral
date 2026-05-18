import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AutoPrint from './AutoPrint';
import Image from 'next/image';

export default async function ContratoRentaPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    
    const renta = await prisma.rentaEquipo.findUnique({
        where: { id },
        include: {
            cliente: true,
            activoFijo: true,
            organization: true,
        }
    });

    if (!renta) return notFound();

    const { cliente, activoFijo, organization } = renta;
    const createdAt = new Date(renta.createdAt);
    const day = createdAt.getDate().toString().padStart(2, '0');
    const monthIndex = createdAt.getMonth();
    const year = createdAt.getFullYear();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <div className="bg-white min-h-screen font-sans text-black">
            <AutoPrint />
            
            <div className="max-w-[800px] mx-auto p-8 bg-white print:p-0 print:w-full print:max-w-full">
                
                {/* Encabezado */}
                <div className="flex items-center gap-4 mb-4">
                    {/* Logo */}
                    {organization.logoUrl ? (
                        <div className="w-20 h-20 relative overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                            <img src={organization.logoUrl} alt="Logo de la Empresa" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-teal-800 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                            BEA
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-blue-900 tracking-wide uppercase">BIOELECTRÓNICA - A</h1>
                        <p className="text-xs text-slate-700">Barrio Guamilito, 7 calle. 9 avenida, San Pedro Sula, Cortes, Honduras.</p>
                        <p className="text-xs font-semibold text-blue-800">TEL: (504) 2552 04 91. Cel. 3178 2368. e-mail: ventas@bioelectronicahn.com</p>
                    </div>
                </div>

                <h2 className="text-lg font-bold text-center underline mb-4 tracking-wide">CONTRATO DE ALQUILER DE EQUIPO MEDICO</h2>

                {/* Datos Arrendador */}
                <div className="space-y-2 mb-4 text-sm">
                    <div className="flex gap-2">
                        <span className="whitespace-nowrap font-semibold">Nombre del arrendador:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900 font-medium">{cliente.nombre}</span>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex gap-2 flex-1">
                            <span className="whitespace-nowrap font-semibold">Numero de identidad:</span>
                            <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900 font-medium">{cliente.rtn || ''}</span>
                        </div>
                        <div className="flex gap-2 flex-1">
                            <span className="whitespace-nowrap font-semibold">Teléfono:</span>
                            <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900 font-medium">{cliente.telefono || ''}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className="whitespace-nowrap font-semibold">Dirección:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900 font-medium">{cliente.direccion || ''}</span>
                    </div>
                    
                    <div className="flex items-center gap-6 pt-1">
                        <span className="font-semibold">Tipo de alquiler:</span>
                        <label className="flex items-center gap-1">Quincenal <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold`}>{renta.tipoAlquiler === 'Quincenal' && 'X'}</div></label>
                        <label className="flex items-center gap-1">Mensual <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold`}>{renta.tipoAlquiler === 'Mensual' && 'X'}</div></label>
                        <label className="flex items-center gap-1">Anual <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold`}>{renta.tipoAlquiler === 'Anual' && 'X'}</div></label>
                        <div className="flex gap-1 items-center">
                            <span>Otro</span>
                            <span className="w-20 border-b border-slate-400 text-center font-bold">{renta.tipoAlquiler === 'Otro' ? 'X' : ''}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 w-1/2 pt-1">
                        <span className="whitespace-nowrap font-semibold">Deposito:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 font-bold text-emerald-800">{Number(renta.deposito).toFixed(2)}</span>
                    </div>
                </div>

                <p className="text-xs font-bold leading-snug mb-4 text-justify text-slate-800 bg-slate-50 p-2 border-l-2 border-slate-400 rounded-sm">
                    El depósito en garantía cubrirá: daños al equipo, rentas atrasadas o incumplimientos en el contrato.
                    El Equipo deberá ser entregado al Arrendatario en un buen estado físico y funcional, de conformidad con
                    los términos y condiciones indicados en este contrato para que el deposito sea entregado al arrendador.
                </p>

                {/* Detalles Equipo */}
                <h3 className="text-base font-bold text-center underline mb-3 tracking-wide bg-blue-900 text-white py-1">DETALLES DEL EQUIPO</h3>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-5 text-sm">
                    <div className="flex gap-2 items-end">
                        <span className="font-semibold">Equipo:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900">{activoFijo.descripcionCorta}</span>
                    </div>
                    <div className="flex gap-2 items-end">
                        <span className="font-semibold">Marca:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900">{activoFijo.marca || ''}</span>
                    </div>
                    <div className="flex gap-2 items-end">
                        <span className="font-semibold">Modelo:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900">{activoFijo.modelo || ''}</span>
                    </div>
                    <div className="flex gap-2 items-end">
                        <span className="font-semibold">Serie:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900 font-bold">{activoFijo.serie || ''}</span>
                    </div>
                    <div className="flex gap-2 col-span-2 items-end">
                        <span className="font-semibold">Horas de trabajo:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900">{renta.horasTrabajoSalida || ''}</span>
                    </div>
                    <div className="flex gap-2 col-span-2 items-end">
                        <span className="font-semibold">Otro:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900"></span>
                    </div>
                    <div className="flex gap-2 col-span-2 items-end">
                        <span className="font-semibold">Incluye:</span>
                        <span className="flex-1 border-b border-slate-400 font-mono px-2 text-blue-900 italic">{renta.accesoriosIncluidos || ''}</span>
                    </div>
                </div>

                {/* Condiciones Legales */}
                <div className="space-y-2 text-[11px] text-justify leading-snug text-slate-700">
                    <div>
                        <h4 className="font-bold underline mb-1">USO DEL EQUIPO</h4>
                        <p>El arrendatario utilizará el equipo cuidadosa y diligentemente, cumpliendo con todas las indicaciones, consejos y recomendaciones.</p>
                        <p className="mt-2">Los mantenimientos y reparaciones del equipo seran realizados exclusivamente por parte de Bioelectronica.</p>
                    </div>

                    <div>
                        <h4 className="font-bold underline mb-1">TITULARIDAD, DERECHO DE ALQUILER.</h4>
                        <p>El arrendador es el legitimo propietario del equipo, y la firma de este contrato de alquiler NO implicará la transmision de la propiedad del equipo al Arrendatario, la propiedad del equipo continuará siendo del arrendador(Bioelectronica).</p>
                        <p>El arrendatario NO estará habilitado para establecer ni crear ningún tipo de: venta, alquiler o garantia / aval para prestamos sobre el equipo en alquiler.</p>
                    </div>

                    <div>
                        <p>Bioelectronica no se hace responsable del uso o manipulacion inadecuado de equipo medico para el tratamiento del paciente. Las dosis a suministrar deben de ser indicadas por el medico tratante del paciente. Bioelectronica queda libre legal y judicialmente de toda responsabilidad.</p>
                    </div>

                    <div>
                        <h4 className="font-bold underline uppercase mb-1">ESTA RENTA ES EXCLUSIVA Y LIMITADA</h4>
                        <p>lo aqui expuesto no podrá ser cambiado o alterado, no nos responsabilizamos por daños incidentales / consecuenciales directos o indirectos del paciente o el equipo mientras este en poder del arrendatario. El equipo se entrega en perfectas condiciones.</p>
                    </div>
                </div>

                {/* Firmas */}
                <div className="mt-6 text-sm text-slate-800">
                    <p className="font-bold mb-4">EN PRUEBA DE CONFORMIDAD Y ACEPTACIÓN, las partes firman este contrato a mano <br/>
                    en fecha <span className="border-b border-slate-500 px-2 font-mono text-blue-900">{day}</span> de <span className="border-b border-slate-500 px-2 font-mono text-blue-900">{meses[monthIndex]}</span> del <span className="border-b border-slate-500 px-2 font-mono text-blue-900">{year}</span></p>

                    <div className="flex justify-between mt-12 pt-6">
                        <div className="w-[45%] flex flex-col items-center">
                            <div className="w-full border-t border-slate-800 mb-1 relative">
                                <div className="absolute -top-14 left-0 w-full text-center flex justify-center opacity-70">
                                    {/* Sello placeholder */}
                                    <div className="border-2 border-slate-800 p-1 text-[9px] text-center rotate-[-5deg] bg-white rounded-sm">
                                        <p className="font-bold">BIOELECTRONICA-A, S de R.L.</p>
                                        <p className="font-black text-lg">ENTREGADO</p>
                                        <p>Tels: 2552-0491 / 2552-0503</p>
                                    </div>
                                </div>
                            </div>
                            <span className="font-semibold text-xs text-slate-600">Nombre, firma y sello BIOELECTRONICA</span>
                        </div>
                        <div className="w-[45%] flex flex-col items-center">
                            <div className="w-full border-t border-slate-800 mb-1 relative text-center pt-1 font-mono text-xs text-blue-900 font-bold">
                                {(renta as any).firmaUrl && (
                                    <div className="absolute bottom-full left-0 w-full flex justify-center mb-1">
                                        <img src={(renta as any).firmaUrl} alt="Firma Cliente" className="h-16 object-contain mix-blend-multiply" />
                                    </div>
                                )}
                                {cliente.nombre} <br/>
                                {cliente.rtn || ''}
                            </div>
                            <span className="font-semibold text-xs text-slate-600">Firma del Cliente</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Anexo Fotográfico (Solo si hay fotos) */}
            {(renta as any).evidenciaFotos && (renta as any).evidenciaFotos.length > 0 && (
                <div className="bg-white p-8 sm:p-12 min-h-[11in] text-slate-900 mx-auto shadow-xl print:shadow-none print:p-0 print:w-full font-sans print:break-before-page mt-8" style={{ pageBreakBefore: 'always' }}>
                    <div className="border-b-2 border-[#0500A3] pb-4 mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-black text-[#0500A3]">ANEXO: ESTADO FÍSICO DEL EQUIPO</h2>
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-widest mt-1">
                                REGISTRO VISUAL AL MOMENTO DE LA ENTREGA
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800">{activo.descripcionCorta}</p>
                            <p className="text-xs font-mono text-slate-500">{activo.numeroSerie}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {(renta as any).evidenciaFotos.map((url: string, idx: number) => (
                            <div key={idx} className="border border-slate-300 p-2 rounded-xl bg-slate-50">
                                <div className="aspect-[4/3] w-full relative rounded-lg overflow-hidden border border-slate-200">
                                    <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <p className="text-center text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Fotografía {idx + 1}</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 text-xs text-slate-500 text-center font-semibold">
                        <p>Documento anexo generado automáticamente por el sistema de Bioelectrónica.</p>
                        <p>Referencia de Contrato: {renta.id.split('-')[0].toUpperCase()}</p>
                    </div>
                </div>
            )}

            {/* Estilos específicos de impresión */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 0.5cm; size: letter portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                }
            `}} />
        </div>
    );
}
