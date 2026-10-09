'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DocumentBuilderClient from './DocumentBuilderClient';
import DocumentListTable, { DocumentRecord } from '@/components/facturas/DocumentListTable';
import FacturacionHeader from './FacturacionHeader';

interface Props {
  organization: any;
  history: DocumentRecord[];
  userRole?: string;
  userAccessibleModules?: string[];
  userEmail?: string;
}

export default function FacturacionTabsClient({ 
  organization, 
  history,
  userRole = 'USER',
  userAccessibleModules = [],
  userEmail = ''
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'creador' | 'facturas' | 'cotizaciones' | 'proforma') || 'creador';
  const [activeTab, setActiveTab] = useState<'creador' | 'facturas' | 'cotizaciones' | 'proforma'>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['creador', 'facturas', 'cotizaciones', 'proforma'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'creador' | 'facturas' | 'cotizaciones' | 'proforma') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('tab', tab);
      window.history.replaceState(null, '', newUrl.toString());
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Global Module Header Tabs */}
      <FacturacionHeader activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className={`${activeTab === 'creador' ? 'relative flex-1 min-h-[calc(100vh-140px)]' : 'p-1.5 sm:p-6 max-w-[1400px] mx-auto w-full'}`}>
        
        {activeTab === 'creador' && (
          <DocumentBuilderClient 
            organization={organization} 
            userRole={userRole}
            userAccessibleModules={userAccessibleModules}
          />
        )}

        {activeTab === 'facturas' && (
          <DocumentListTable 
            data={history} 
            type="FACTURA" 
            organization={organization}
            userRole={userRole}
            userAccessibleModules={userAccessibleModules}
            userEmail={userEmail}
          />
        )}

        {activeTab === 'proforma' && (
          <DocumentListTable 
            data={history} 
            type="PROFORMA" 
            organization={organization}
            userRole={userRole}
            userAccessibleModules={userAccessibleModules}
            userEmail={userEmail}
          />
        )}

        {activeTab === 'cotizaciones' && (
          <DocumentListTable 
            data={history} 
            type="COTIZACION" 
            organization={organization}
            userRole={userRole}
            userAccessibleModules={userAccessibleModules}
            userEmail={userEmail}
          />
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
