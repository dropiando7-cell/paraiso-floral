'use client';

import React from 'react';
import StatusStepper from '../components/StatusStepper';
import TechnicalWorkbench from '../components/TechnicalWorkbench';
import ApprovalCard from '../components/ApprovalCard';
import QRGenerator from '../components/QRGenerator';
import { Wrench } from 'lucide-react';

type Orden = any;

export default function SoporteDetailClient({ orden, userRole }: { orden: Orden, userRole: string }) {
  const role = userRole;

  // Determine visible blocks based on role (for demo they used isGlobal/isYensi, we use real roles)
  const isGlobal = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
  const isRecepcion = isGlobal || role === 'RECEPCION';
  const isTecnico = isGlobal || role === 'TECNICO' || role === 'INVENTARIO_EDITOR';
  const isGerente = isGlobal || role === 'GERENTE';

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="m-0 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Módulo Técnico · Orden #{orden.codigoSeguridad}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
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

      <div className="grid grid-cols-12 gap-5">
        {/* Recepción */}
        {isRecepcion && orden.estado === 'RECIBIDO' && (
          <>
            <div className={`col-span-12 ${isGlobal ? 'xl:col-span-8' : 'xl:col-span-12'}`}>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Recepción completada</h2>
                <p className="text-slate-600 text-sm">La orden ya fue recibida, imprime la etiqueta.</p>
              </div>
            </div>
            <div className={`col-span-12 ${isGlobal ? 'xl:col-span-4' : 'lg:col-span-6'}`}>
              <QRGenerator 
                orderId={orden.codigoSeguridad} 
                serie={orden.serie || "N/A"} 
                cliente={orden.cliente?.nombre || ""} 
              />
            </div>
          </>
        )}

        {/* Técnico */}
        {(isTecnico && ['EN_EVALUACION', 'EN_REPARACION'].includes(orden.estado)) && (
          <div className={`col-span-12 ${isGlobal ? 'xl:col-span-8' : 'xl:col-span-12'}`}>
            <TechnicalWorkbench orderData={orden} />
          </div>
        )}

        {/* Aprobación */}
        {(isGerente && orden.estado === 'ESPERANDO_APROBACION') && (
          <div className={`col-span-12 ${isGlobal ? 'xl:col-span-6' : 'xl:col-span-8'}`}>
            <ApprovalCard 
              orderData={orden} 
              onApprove={() => {
                alert('Aprobar presionado');
              }}
            />
          </div>
        )}
        
        {/* QR always available for print if received */}
        {(orden.estado !== 'RECIBIDO' && isRecepcion) && (
          <div className="col-span-12 lg:col-span-4">
             <QRGenerator 
                orderId={orden.codigoSeguridad} 
                serie={orden.serie || "N/A"} 
                cliente={orden.cliente?.nombre || ""} 
              />
          </div>
        )}
      </div>
    </div>
  );
}
