import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { organizationId: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const records = await prisma.conciliation.findMany({
            where: { organizationId: dbUser.organizationId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                banco: true,
                tipoCuenta: true,
                month: true,
                year: true,
                status: true,
                isApproved: true,
                approvedBy: true,
                approvedAt: true,
                reportContent: true,
                reportSummary: true,
                filesFound: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ records });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
