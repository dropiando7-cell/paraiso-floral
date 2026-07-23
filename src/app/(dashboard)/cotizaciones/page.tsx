import DocumentListTable from '@/components/facturas/DocumentListTable';
import { getAuthenticatedUser, getHistorialDocumentos } from '../facturas/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Calculator } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CotizacionesPage() {
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

    let history: any[] = [];
    try {
        const verSoloPropias = dbUser.role !== 'SUPER_ADMIN' && 
                               dbUser.role !== 'ORG_ADMIN' && 
                               allowedModules.includes('facturas_propias');
                               
        history = await getHistorialDocumentos(verSoloPropias ? dbUser.id : undefined);
    } catch (e) {
        console.error("Error fetching data for cotizaciones page:", e);
    }

    return (
      <div className="p-6 max-w-[1400px] mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-300">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner shrink-0 animate-pulse">
              <Calculator className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Módulo de Cotizaciones</h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
                Espacio dedicado a la consulta, seguimiento y aprobación de cotizaciones para clientes de Bioelectrónica Honduras.
              </p>
            </div>
          </div>
          <Link
            href="/facturas?tab=creador"
            className="flex items-center gap-1.5 bg-[#0500A3] hover:bg-[#040080] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-900/10 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" /> Crear Cotización
          </Link>
        </div>

        {/* List Table */}
        <div className="flex-1">
          <DocumentListTable data={history} type="COTIZACION" />
        </div>
      </div>
    );
}
