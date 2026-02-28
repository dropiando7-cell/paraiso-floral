import { withRoleGuard } from '@/utils/rbac';

function CheckinLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export default withRoleGuard('/checkin', CheckinLayout);
