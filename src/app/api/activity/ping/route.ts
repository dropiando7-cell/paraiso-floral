import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user || !user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        const body = await req.json();
        const { module: newModule, isIdle = false } = body;

        const previousModule = dbUser.currentModule;
        
        // Update user status
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                lastActiveAt: new Date(),
                currentModule: newModule || null,
                isIdle
            }
        });

        // Log navigation if user changed modules
        if (newModule && newModule !== previousModule && !isIdle) {
            // Get IP and User Agent
            const ipAddress = req.headers.get('x-forwarded-for') || null;
            const userAgent = req.headers.get('user-agent') || null;
            
            await logActivity({
                userId: dbUser.id,
                organizationId: dbUser.organizationId,
                action: 'NAVIGATE',
                module: newModule,
                description: `Navegó al módulo: ${newModule}`,
                ipAddress,
                userAgent,
                metadata: {
                    previousModule,
                    isIdle
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error in presence ping API:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
