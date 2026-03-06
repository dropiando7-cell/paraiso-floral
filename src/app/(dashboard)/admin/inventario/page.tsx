import { getAreaStatuses } from '@/app/(dashboard)/inventario/actions';
import AdminInventarioClient from './AdminInventarioClient';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminInventarioPage() {
    const statuses = await getAreaStatuses();
    const { getAreas } = await import('@/app/(dashboard)/admin/areas/actions');
    const dbAreas = await getAreas();

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#0500A3] p-2.5 rounded-xl">
                    <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Administración de Inventario</h1>
                    <p className="text-sm text-slate-500">Gestión de áreas y control general del levantamiento físico</p>
                </div>
            </div>

            <AdminInventarioClient initialStatuses={statuses} dbAreas={dbAreas} />
        </div>
    );
}
