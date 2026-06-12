'use client';

import React, { Suspense } from 'react';
import { LayoutDashboard, PlusCircle, CheckCircle2, Receipt, FileText, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

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
  const router = useRouter();
  
  const handleVolver = () => {
    if (typeof window !== 'undefined' && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      router.push('/facturas?tab=facturas');
    }
  };

  const isViewOrEdit = props.activeTab === 'ver' || props.activeTab === 'editar';

  return (
    <div className="bg-white border-b border-slate-200 print:hidden">
      <div className="max-w-[1600px] mx-auto px-4 flex flex-wrap items-center justify-between min-h-[64px] py-2 gap-y-2">
        
        {/* Lado Izquierdo: Título y Tabs */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-lg drop-shadow-sm">Facturación</span>
          </div>

          {!isViewOrEdit && (
            <nav className="flex flex-wrap items-center gap-1">
              <Suspense fallback={<div className="w-20" />}>
                <NavButtonInner {...props} id="creador" icon={PlusCircle} label="Crear Documento" />
                <NavButtonInner {...props} id="facturas" icon={CheckCircle2} label="Registro de Facturas" />
                <NavButtonInner {...props} id="proforma" icon={Receipt} label="Facturas Pro Forma" />
                <NavButtonInner {...props} id="cotizaciones" icon={FileText} label="Cotizaciones Previas" />
              </Suspense>
            </nav>
          )}
        </div>

        {/* Lado Derecho: Acciones y POS */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isViewOrEdit && (
            <div className="flex items-center gap-2">
               <button 
                 onClick={handleVolver} 
                 className="py-2.5 px-4 font-bold text-sm flex items-center gap-2 text-slate-600 border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all shadow-sm"
               >
                  <ArrowLeft size={16} /> Volver
               </button>
               <span className="py-2.5 px-4 font-bold text-sm flex items-center gap-2 text-blue-700 bg-blue-50/50 border-2 border-blue-200/60 rounded-xl shadow-sm">
                 <FileText size={16} className="text-blue-500" />
                 {props.activeTab === 'ver' ? 'Vista Previa de Documento' : 'Edición de Documento'}
               </span>
            </div>
          )}

          {!isViewOrEdit && (
            <div className="pl-3 border-l border-slate-200 hidden sm:block">
              <Link href="/facturas/pos" prefetch={true} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all group hover:-translate-y-0.5">
                <Zap size={16} className="text-white fill-white/20 group-hover:fill-white/40 transition-colors" />
                Caja Rápida POS
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
