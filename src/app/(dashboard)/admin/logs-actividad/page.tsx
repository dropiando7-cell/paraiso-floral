import { withRoleGuard } from '@/utils/rbac';
import { getActivityLogs } from './actions';
import { LogsActividadClient } from './LogsActividadClient';

async function LogsActividadPage() {
    const initialData = await getActivityLogs({ page: 1, pageSize: 50 });

    if (!initialData.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                    Error al cargar la bitácora de actividad: {initialData.error || 'Error desconocido'}
                </div>
            </div>
        );
    }

    return (
        <LogsActividadClient
            initialLogs={initialData.logs || []}
            initialTotal={initialData.total || 0}
            initialTotalPages={initialData.totalPages || 1}
            allUsers={initialData.allUsers || []}
        />
    );
}

// Protect the page using RBAC higher-order component
export default withRoleGuard('/admin/logs-actividad', LogsActividadPage);
