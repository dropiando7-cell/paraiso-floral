import { getKanbanInitData } from './actions';
import KanbanDashboardClient from './KanbanDashboardClient';

export const dynamic = 'force-dynamic';

export default async function KanbanPage() {
    const { spaces, currentUser, organizationMembers } = await getKanbanInitData();

    return (
        <div className="flex-1 space-y-6 p-6">
            <KanbanDashboardClient 
                initialSpaces={spaces} 
                currentUser={currentUser}
                organizationMembers={organizationMembers}
            />
        </div>
    );
}
