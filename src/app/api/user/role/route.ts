import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            return NextResponse.json({ role: 'USER' });
        }
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { role: true },
        });
        return NextResponse.json({ role: dbUser?.role ?? 'USER' });
    } catch {
        return NextResponse.json({ role: 'USER' });
    }
}
