import { getSpaces } from './actions';
import KanbanDashboardClient from './KanbanDashboardClient';

export const dynamic = 'force-dynamic';

export default async function KanbanPage() {
    const spaces = await getSpaces();

    return (
        <div className="flex-1 space-y-6 p-6">
            <KanbanDashboardClient initialSpaces={spaces} />
        </div>
    );
}
