'use client';

import React, { Suspense } from 'react';
import { LayoutDashboard, PlusCircle, CheckCircle2, Receipt, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Props {
  activeTab: 'creador' | 'facturas' | 'cotizaciones' | 'proforma' | 'ver' | 'editar';
  onTabChange?: (tab: 'creador' | 'facturas' | 'cotizaciones' | 'proforma') => void;
  isSubPage?: boolean;
}

function NavButtonInner({ id, icon: Icon, label, activeTab, onTabChange, isSubPage }: any) {
  const isActive = activeTab === id;
  const searchParams = useSearchParams();
  const currentTabParam = searchParams.get('tab') || 'creador';

  let currentLinkActive = false;
  if (isSubPage) {
    currentLinkActive = false; // Never active in subpage unless we're actually matching
  }

  const btn = (
    <button 
      onClick={() => onTabChange && onTabChange(id)}
      className={`py-4 px-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
    >
      <Icon size={15} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
      {label}
    </button>
  );

  if (isSubPage) {
     return <Link href={`/facturas?tab=${id}`}>{btn}</Link>;
  }
  return btn;
}

export default function FacturacionHeader(props: Props) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-[40]">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center gap-4 overflow-x-auto">
        <div className="py-4 flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-lg mr-4 drop-shadow-sm">Facturación</span>
        </div>

        <nav className="flex items-center gap-1 -mb-px shrink-0">
          <Suspense fallback={<div className="w-20" />}>
            <NavButtonInner {...props} id="creador" icon={PlusCircle} label="Crear Documento" />
            <NavButtonInner {...props} id="facturas" icon={CheckCircle2} label="Registro de Facturas" />
            <NavButtonInner {...props} id="proforma" icon={Receipt} label="Facturas Pro Forma" />
            <NavButtonInner {...props} id="cotizaciones" icon={FileText} label="Cotizaciones Previas" />
          </Suspense>
          {(props.activeTab === 'ver' || props.activeTab === 'editar') && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
               <Link href="/facturas?tab=facturas" className="py-2 px-3 font-semibold text-sm flex items-center gap-2 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                  <ArrowLeft size={15} /> Volver
               </Link>
               <span className="py-2 px-3 font-semibold text-sm flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                 {props.activeTab === 'ver' ? 'Vista Previa de Documento' : 'Edición de Documento'}
               </span>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
