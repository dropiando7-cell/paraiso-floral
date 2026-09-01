import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { getActivos, getActivoStats, getEffectiveOrgIds } from './actions';
import { InventarioClient } from './InventarioClient';

export const metadata = {
    title: 'Catálogo de Productos | Bioelectrónica',
    description: 'Gestión y control de inventario y ventas',
};

export default async function InventarioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    // @ts-ignore - Prisma client needs regeneration to include INVENTARIO_EDITOR
    if (dbUser.role === 'INVENTARIO_EDITOR') {
        redirect('/inventario/historico');
    }

    const orgIds = await getEffectiveOrgIds();
    const orgId = dbUser.organizationId;

    // Fetch all initial data in parallel using Promise.all for fast load times!
    const [initialData, initialStats, dbAreas, settings, clientes] = await Promise.all([
        getActivos(1, '', '', ''),
        getActivoStats(),
        prisma.area.findMany({
            where: { organizationId: { in: orgIds } },
            orderBy: { name: 'asc' },
        }),
        prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        'inventory_origins',
                        'default_inventory_origin',
                        'inventory_conditions',
                        'default_inventory_condition',
                        'disable_ai_vision'
                    ]
                }
            }
        }),
        prisma.cliente.findMany({
            where: { organizationId: orgId },
            orderBy: { nombre: 'asc' },
        })
    ]);

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const originsSetting = settingsMap.get('inventory_origins');
    const defaultSetting = settingsMap.get('default_inventory_origin');
    const conditionsSetting = settingsMap.get('inventory_conditions');
    const defaultCondSetting = settingsMap.get('default_inventory_condition');
    const disableAiVision = settingsMap.get('disable_ai_vision') === 'true';

    const customOrigins = originsSetting ? JSON.parse(originsSetting) : ["Americano", "Chino", "Otro"];
    const defaultOrigin = defaultSetting || "";
    const customConditions = conditionsSetting ? JSON.parse(conditionsSetting) : ["Nuevo", "Usado", "Remanufacturado"];
    const defaultCondition = defaultCondSetting || "";

    const serializedData = JSON.parse(JSON.stringify(initialData));
    const serializedStats = JSON.parse(JSON.stringify(initialStats));
    const serializedAreas = JSON.parse(JSON.stringify(dbAreas));
    const serializedClientes = JSON.parse(JSON.stringify(clientes));

    return (
        <InventarioClient 
            initialData={serializedData} 
            initialStats={serializedStats} 
            dbAreas={serializedAreas} 
            userRole={dbUser.role} 
            initialOrigins={customOrigins}
            initialDefaultOrigin={defaultOrigin}
            initialConditions={customConditions}
            initialDefaultCondition={defaultCondition}
            disableAiVision={disableAiVision}
            clientes={serializedClientes}
        />
    );
}
