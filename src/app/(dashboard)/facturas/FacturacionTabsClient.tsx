'use client';

import React, { useState } from 'react';
import DocumentBuilderClient from './DocumentBuilderClient';
import DocumentListTable, { DocumentRecord } from '@/components/facturas/DocumentListTable';
import { PlusCircle, FileText, Receipt, LayoutDashboard } from 'lucide-react';

interface Props {
  organization: any;
  history: DocumentRecord[];
}

export default function FacturacionTabsClient({ organization, history }: Props) {
  const [activeTab, setActiveTab] = useState<'creador' | 'facturas' | 'cotizaciones'>('creador');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Global Module Header Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-[40]">
        <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            <div className="py-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight text-lg mr-4 drop-shadow-sm">Facturación</span>
            </div>

            <nav className="flex items-center gap-1 -mb-px">
              <button 
                onClick={() => setActiveTab('creador')}
                className={`py-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'creador' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <PlusCircle size={16} className={activeTab === 'creador' ? 'text-blue-600' : 'text-slate-400'} />
                Crear Documento
              </button>
              
              <button 
                onClick={() => setActiveTab('facturas')}
                className={`py-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'facturas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <CheckCircle2 size={16} className={activeTab === 'facturas' ? 'text-blue-600' : 'text-slate-400'} />
                Registro de Facturas
              </button>
              
              <button 
                onClick={() => setActiveTab('cotizaciones')}
                className={`py-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'cotizaciones' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <FileText size={16} className={activeTab === 'cotizaciones' ? 'text-blue-600' : 'text-slate-400'} />
                Cotizaciones Previas
              </button>
            </nav>
          </div>

        </div>
      </div>

      {/* Tab Content */}
      <div className={`${activeTab === 'creador' ? '' : 'p-6 max-w-[1400px] mx-auto w-full'}`}>
        
        {activeTab === 'creador' && (
          <DocumentBuilderClient organization={organization} />
        )}

        {activeTab === 'facturas' && (
          <DocumentListTable data={history} type="FACTURA" />
        )}

        {activeTab === 'cotizaciones' && (
          <DocumentListTable data={history} type="COTIZACION" />
        )}

      </div>
    </div>
  );
}

// Minimal missing icon wrapper to prevent import issues
function CheckCircle2(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
