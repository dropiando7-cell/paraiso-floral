'use client';

import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, CheckCircle2, Receipt, FileText, ArrowLeft, Zap, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BandejaPedidosCediModal from '@/components/facturacion/BandejaPedidosCediModal';
import ReportesContablesModal from '@/components/facturas/ReportesContablesModal';

interface Props {
  activeTab: 'creador' | 'facturas' | 'cotizaciones' | 'proforma' | 'ver' | 'editar';
  onTabChange?: (tab: 'creador' | 'facturas' | 'cotizaciones' | 'proforma') => void;
  isSubPage?: boolean;
}

export default function FacturacionHeader(props: Props) {
  const router = useRouter();
  const [showReportesModal, setShowReportesModal] = useState(false);
  
  const handleVolver = () => {
    if (typeof window !== 'undefined' && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      router.push('/facturas?tab=facturas');
    }
  };

  const isViewOrEdit = props.activeTab === 'ver' || props.activeTab === 'editar';

  const getTabInfo = () => {
    switch (props.activeTab) {
      case 'facturas':
        return { label: 'Registro de Facturas', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200/60' };
      case 'proforma':
        return { label: 'Facturas Pro Forma', icon: Receipt, color: 'text-violet-700 bg-violet-50 border-violet-200/60' };
      case 'cotizaciones':
        return { label: 'Cotizaciones Previas', icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-200/60' };
      case 'creador':
      default:
        return { label: 'Nuevo Documento', icon: PlusCircle, color: 'text-slate-700 bg-slate-100 border-slate-200/60' };
    }
  };

  const tabInfo = getTabInfo();
  const TabIcon = tabInfo.icon;

  return (
    <div className="bg-white border-b border-slate-200 print:hidden shadow-xs relative z-10">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 flex items-center justify-between min-h-[52px] sm:min-h-[58px] gap-2">
        
        {/* Lado Izquierdo: Título y Ubicación Actual (Breadcrumb) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link 
            href="/facturas" 
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 group-hover:bg-blue-700 flex items-center justify-center shadow-sm shadow-blue-500/20 transition-colors">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base hidden sm:inline">
              Facturación
            </span>
          </Link>

          {!isViewOrEdit && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-300 font-light hidden sm:inline">/</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold border shrink-0 ${tabInfo.color}`}>
                <TabIcon size={14} className="shrink-0" />
                <span className="truncate">{tabInfo.label}</span>
              </div>

              {props.activeTab !== 'creador' && (
                props.onTabChange ? (
                  <button
                    onClick={() => props.onTabChange && props.onTabChange('creador')}
                    className="hidden md:flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/60 transition-all ml-1 shadow-2xs"
                  >
                    <PlusCircle size={13} />
                    <span>Nuevo Documento</span>
                  </button>
                ) : (
                  <Link
                    href="/facturas?tab=creador"
                    className="hidden md:flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/60 transition-all ml-1 shadow-2xs"
                  >
                    <PlusCircle size={13} />
                    <span>Nuevo Documento</span>
                  </Link>
                )
              )}

              {/* Botón de Reportes para Contabilidad (después de Nuevo Documento) */}
              <button
                type="button"
                onClick={() => setShowReportesModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/70 transition-all ml-1 shadow-2xs cursor-pointer shrink-0"
                title="Generar Reportes para Contabilidad y SAR (Excel / PDF)"
              >
                <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" />
                <span>Reportes Contables</span>
              </button>
            </div>
          )}
        </div>

        {/* Lado Derecho: Acciones y POS */}
        <div className="flex items-center gap-2 shrink-0">
          {isViewOrEdit && (
            <div className="flex items-center gap-2">
               <button 
                 onClick={handleVolver} 
                 className="py-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-xs"
               >
                  <ArrowLeft size={14} /> <span>Volver</span>
               </button>
               <span className="py-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 text-blue-700 bg-blue-50/70 border border-blue-200/70 rounded-xl shadow-xs">
                 <FileText size={14} className="text-blue-500" />
                 {props.activeTab === 'ver' ? 'Vista Previa' : 'Edición'}
               </span>
            </div>
          )}

          {!isViewOrEdit && (
            <div className="flex items-center gap-2">
              {props.activeTab !== 'creador' && (
                props.onTabChange ? (
                  <button
                    onClick={() => props.onTabChange && props.onTabChange('creador')}
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60"
                    title="Crear Documento"
                  >
                    <PlusCircle size={16} />
                  </button>
                ) : (
                  <Link
                    href="/facturas?tab=creador"
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60"
                    title="Crear Documento"
                  >
                    <PlusCircle size={16} />
                  </Link>
                )
              )}

              <BandejaPedidosCediModal onSelectPedido={(pedido) => router.push(`/facturas/pos?cargarPedido=${pedido.id}`)} />

              <Link 
                href="/facturas/pos" 
                prefetch={true} 
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-indigo-500/20 transition-all group shrink-0"
              >
                <Zap size={14} className="text-white fill-white/20 group-hover:fill-white/40 transition-colors" />
                <span className="hidden sm:inline">Caja Rápida POS</span>
                <span className="sm:hidden">POS</span>
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Modal interactivo de Reportes Contables */}
      <ReportesContablesModal
        isOpen={showReportesModal}
        onClose={() => setShowReportesModal(false)}
      />
    </div>
  );
}
