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

function NavButtonInner({ id, icon: Icon, label, mobileLabel, activeTab, onTabChange, isSubPage }: any) {
  const isActive = activeTab === id;

  const btn = (
    <button 
      onClick={() => onTabChange && onTabChange(id)}
      className={`py-2.5 sm:py-3.5 px-2 sm:px-3 font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
        isActive 
          ? 'border-blue-600 text-blue-700 bg-blue-50/70 sm:bg-transparent rounded-t-lg sm:rounded-none' 
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      <Icon size={15} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
      <span>
        <span className="inline sm:hidden">{mobileLabel || label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </button>
  );

  if (isSubPage) {
     return <Link href={`/facturas?tab=${id}`} className="shrink-0">{btn}</Link>;
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
    <div className="bg-white border-b border-slate-200 print:hidden sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-1.5 sm:px-4 flex items-center justify-between min-h-[50px] sm:min-h-[60px] gap-1.5 sm:gap-2">
        
        {/* Lado Izquierdo: Título y Tabs Scrollables */}
        <div className="flex items-center gap-1.5 sm:gap-6 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <LayoutDashboard size={15} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-lg hidden md:inline">
              Facturación
            </span>
          </div>

          {!isViewOrEdit && (
            <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 max-w-full shrink-1 min-w-0">
              <Suspense fallback={<div className="w-16" />}>
                <NavButtonInner {...props} id="creador" icon={PlusCircle} label="Crear Documento" mobileLabel="Crear" />
                <NavButtonInner {...props} id="facturas" icon={CheckCircle2} label="Registro Facturas" mobileLabel="Facturas" />
                <NavButtonInner {...props} id="proforma" icon={Receipt} label="Facturas Pro Forma" mobileLabel="Pro Forma" />
                <NavButtonInner {...props} id="cotizaciones" icon={FileText} label="Cotizaciones Previas" mobileLabel="Cotizaciones" />
              </Suspense>
            </nav>
          )}
        </div>

        {/* Lado Derecho: Acciones y POS */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isViewOrEdit && (
            <div className="flex items-center gap-1.5">
               <button 
                 onClick={handleVolver} 
                 className="py-1.5 px-2.5 sm:py-2.5 sm:px-4 font-bold text-xs sm:text-sm flex items-center gap-1 text-slate-600 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
               >
                  <ArrowLeft size={14} /> <span className="hidden sm:inline">Volver</span>
               </button>
               <span className="py-1.5 px-2.5 sm:py-2.5 sm:px-4 font-bold text-xs sm:text-sm flex items-center gap-1 text-blue-700 bg-blue-50/50 border-2 border-blue-200/60 rounded-xl shadow-sm">
                 <FileText size={14} className="text-blue-500" />
                 {props.activeTab === 'ver' ? 'Vista Previa' : 'Edición'}
               </span>
            </div>
          )}

          {!isViewOrEdit && (
            <div className="shrink-0 pl-1 border-l border-slate-200">
              <Link 
                href="/facturas/pos" 
                prefetch={true} 
                className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-indigo-500/20 transition-all group shrink-0"
              >
                <Zap size={14} className="text-white fill-white/20 group-hover:fill-white/40 transition-colors" />
                <span className="hidden sm:inline">Caja Rápida POS</span>
                <span className="sm:hidden">POS</span>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
