import { withRoleGuard } from '@/utils/rbac';

function CalendarioLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export default withRoleGuard('/calendario', CalendarioLayout);
