import { createClient } from '@supabase/supabase-js';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    console.log('--- Cleaning Supabase Auth user_metadata ---');
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    for (const u of users) {
        const metadata = u.user_metadata || {};
        let needsUpdate = false;
        const updatedMetadata = { ...metadata };

        if (typeof updatedMetadata.avatar_url === 'string' && updatedMetadata.avatar_url.startsWith('data:')) {
            console.log(`Clearing base64 avatar_url for user ${u.email}`);
            updatedMetadata.avatar_url = null;
            needsUpdate = true;
        }

        if (typeof updatedMetadata.picture === 'string' && updatedMetadata.picture.startsWith('data:')) {
            console.log(`Clearing base64 picture for user ${u.email}`);
            updatedMetadata.picture = null;
            needsUpdate = true;
        }

        if (needsUpdate) {
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
                user_metadata: updatedMetadata
            });
            if (updateErr) console.error(`Error updating user ${u.email}:`, updateErr);
            else console.log(`Successfully cleaned user_metadata for ${u.email}`);
        }
    }

    console.log('--- Cleaning Prisma User avatarUrl ---');
    const dbUsers = await prisma.user.findMany({
        where: {
            avatarUrl: {
                startsWith: 'data:'
            }
        }
    });

    for (const dbu of dbUsers) {
        console.log(`Clearing base64 avatarUrl in Prisma for ${dbu.email}`);
        await prisma.user.update({
            where: { id: dbu.id },
            data: { avatarUrl: null }
        });
    }

    console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
