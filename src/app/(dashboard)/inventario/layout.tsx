import { withRoleGuard } from '@/utils/rbac';

function InventarioLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export default withRoleGuard('/inventario', InventarioLayout);
