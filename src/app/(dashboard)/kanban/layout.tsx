import { withRoleGuard } from '@/utils/rbac';

function KanbanLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export default withRoleGuard('/kanban', KanbanLayout);
