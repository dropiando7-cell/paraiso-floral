'use client';

import React from 'react';
import StatusStepper from '../components/StatusStepper';
import TechnicalWorkbench from '../components/TechnicalWorkbench';
import ApprovalCard from '../components/ApprovalCard';
import QRGenerator from '../components/QRGenerator';
import { Wrench, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { updateEstadoOrden, finalizarReparacion, asignarTecnicos } from '../actions';
import { useRouter } from 'next/navigation';

type Orden = any;

export default function SoporteDetailClient({ 
  orden, 
  userRole, 
  customRoleName,
  organizationUsers = []
}: { 
  orden: Orden; 
  userRole: string; 
  customRoleName?: string;
  organizationUsers?: any[];
}) {
  const role = userRole;
  const cRole = customRoleName?.toUpperCase() || '';

  // Determine visible blocks based on role (for demo they used isGlobal/isYensi, we use real roles)
  const isGlobal = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
  const isRecepcion = isGlobal || role === 'RECEPCION' || cRole === 'RECEPCION' || cRole.includes('RECEPCION');
  const isTecnico = isGlobal || role === 'TECNICO' || role === 'INVENTARIO_EDITOR' || cRole === 'TECNICO' || cRole.includes('TECNICO');
  const isGerente = isGlobal || role === 'GERENTE' || cRole === 'GERENTE' || cRole.includes('GERENTE');

  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [assignedTecnicos, setAssignedTecnicos] = React.useState<any[]>(orden.tecnicosAsignados || []);
  const [updatingTecnicos, setUpdatingTecnicos] = React.useState(false);

  const handleToggleTecnico = async (tecnicoId: string) => {
    setUpdatingTecnicos(true);
    try {
      let nextList;
      if (assignedTecnicos.some(t => t.id === tecnicoId)) {
        nextList = assignedTecnicos.filter(t => t.id !== tecnicoId);
      } else {
        const found = organizationUsers.find(u => u.id === tecnicoId);
        nextList = found ? [...assignedTecnicos, found] : assignedTecnicos;
      }
      setAssignedTecnicos(nextList);
      await asignarTecnicos(orden.id, nextList.map(t => t.id));
    } catch (e) {
      console.error(e);
      alert("Error al actualizar asignación de técnicos");
    } finally {
      setUpdatingTecnicos(false);
    }
  };

  const handleAvanzar = async (nuevoEstado: string) => {
    setLoading(true);
    if (nuevoEstado === 'LISTO_ENTREGA') {
        await finalizarReparacion(orden.id);
    } else {
        await updateEstadoOrden(orden.id, nuevoEstado);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="px-0 py-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
      <button 
        onClick={() => router.push('/soporte')}
        className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4 md:mb-6 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al Taller
      </button>

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <Wrench className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="m-0 text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Módulo Técnico · Orden #{orden.codigoSeguridad}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Bioelectrónica Honduras · Reparaciones y Mantenimiento
            </p>
          </div>
        </div>
      </div>

      <StatusStepper 
        estadoActual={orden.estado} 
        ordenId={orden.codigoSeguridad} 
        equipoInfo={`${orden.equipoDano} — S/N: ${orden.serie || 'N/A'}`}
      />

      <div className="grid grid-cols-12 gap-4 md:gap-5">
        
        {/* Column 1: Primary Action & Tech Assignment (left) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          
          {/* A. Current state content card */}
          {isRecepcion && orden.estado === 'RECIBIDO' && (
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Recepción completada</h2>
              <p className="text-slate-600 text-sm mb-4">La orden ya fue recibida. Entrega la etiqueta al cliente y avísale al técnico.</p>
              <button 
                onClick={() => handleAvanzar('EN_EVALUACION')}
                disabled={loading}
                className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
              >
                Pasar a Diagnóstico Técnico <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {isTecnico && ['EN_EVALUACION', 'REPARACION'].includes(orden.estado) && (
            <div>
              <TechnicalWorkbench orderData={orden} />
              <div className="mt-4 flex justify-end gap-3">
                {orden.estado === 'REPARACION' && (
                  <button 
                    onClick={() => handleAvanzar('LISTO_ENTREGA')}
                    disabled={loading}
                    className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition"
                  >
                    Marcar como REPARADO / LISTO <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {isTecnico && !isGerente && orden.estado === 'ESPERANDO_APROBACION' && (
            <div className="bg-white rounded-2xl p-5 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Presupuesto Enviado</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                La cotización de repuestos y mano de obra fue enviada exitosamente a la gerencia para su revisión y contacto con el cliente.
              </p>
              <button 
                onClick={() => router.push('/soporte')}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al Taller
              </button>
            </div>
          )}

          {isGerente && orden.estado === 'ESPERANDO_APROBACION' && (
            <ApprovalCard 
              orderData={orden} 
              onApprove={() => {
                handleAvanzar('REPARACION');
              }}
            />
          )}

          {/* B. Tarjeta de Técnicos Asignados (Always directly below the action card) */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h4 className="m-0 text-sm font-bold text-slate-900">Personal Técnico Asignado</h4>
                <p className="m-0 text-[11px] text-slate-500 font-medium">Asigna uno o más técnicos a este trabajo</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {assignedTecnicos.map(t => {
                const displayName = [t.nombre, t.apellido].filter(Boolean).join(" ");
                return (
                  <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold shadow-sm">
                    <span>{displayName.toUpperCase()}</span>
                    {isGlobal || isGerente || isRecepcion ? (
                      <button
                        disabled={updatingTecnicos}
                        onClick={() => handleToggleTecnico(t.id)}
                        className="w-3.5 h-3.5 bg-indigo-200 hover:bg-indigo-300 text-indigo-800 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors"
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                );
              })}
              {assignedTecnicos.length === 0 && (
                <span className="text-xs text-slate-400 italic">Sin técnicos asignados</span>
              )}
            </div>

            {(isGlobal || isGerente || isRecepcion) && (
              <div>
                <select
                  disabled={updatingTecnicos}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium disabled:opacity-50"
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val) handleToggleTecnico(val);
                  }}
                >
                  <option value="">+ Agregar Técnico...</option>
                  {organizationUsers.map(u => {
                    const displayName = [u.nombre, u.apellido].filter(Boolean).join(" ");
                    const puestoText = u.puesto ? u.puesto.toUpperCase() : u.role;
                    return (
                      <option key={u.id} value={u.id} disabled={assignedTecnicos.some(t => t.id === u.id)}>
                        {displayName.toUpperCase()} ({puestoText})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: QRGenerator & Printing (right) */}
        <div className="col-span-12 lg:col-span-4">
          {(isRecepcion || isTecnico || isGerente) && (
            <QRGenerator 
              orderId={orden.codigoSeguridad} 
              serie={orden.serie || "N/A"} 
              cliente={orden.cliente?.nombre || ""} 
              equipo={orden.equipoDano}
              marcaModelo={orden.marcaModelo || ""}
              fecha={new Date(orden.fechaRecibido || new Date()).toLocaleDateString("es-HN")}
            />
          )}
        </div>

      </div>
    </div>
  );
}
