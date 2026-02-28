import { withRoleGuard } from '@/utils/rbac';

function ConciliacionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export default withRoleGuard('/conciliacion', ConciliacionLayout);
