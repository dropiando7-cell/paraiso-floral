import { request } from "http";
import { withRoleGuard } from '@/utils/rbac';

function BovedaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export default withRoleGuard('/boveda', BovedaLayout);
