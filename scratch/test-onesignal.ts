import { config } from 'dotenv';
import path from 'path';

// Load .env
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { triggerNotification } from '../src/lib/notifications';

async function main() {
    console.log("App ID:", process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);
    console.log("REST API Key length:", process.env.ONESIGNAL_REST_API_KEY?.length);
    console.log("App URL:", process.env.NEXT_PUBLIC_APP_URL);

    // Let's find a user in the database
    const user = await prisma.user.findFirst({
        where: {
            oneSignalSubscriptionId: { not: null }
        }
    });

    if (!user) {
        console.log("No user found with oneSignalSubscriptionId in the database.");
        // Let's print some users to see
        const someUsers = await prisma.user.findMany({
            take: 5,
            select: {
                id: true,
                email: true,
                nombre: true,
                oneSignalSubscriptionId: true
            }
        });
        console.log("Some users in DB:", someUsers);
        
        // Let's test with the first user anyway
        const firstUser = someUsers[0];
        if (firstUser) {
            console.log(`Testing triggerNotification for user ${firstUser.email} (ID: ${firstUser.id})`);
            const res = await triggerNotification(
                firstUser.id,
                "Test Title",
                "Test message content from CLI script",
                "/perfil",
                "SYSTEM"
            );
            console.log("Result:", res);
        }
        return;
    }

    console.log(`Found user: ${user.nombre} (${user.email}) with sub ID: ${user.oneSignalSubscriptionId}`);
    
    // Trigger notification
    const res = await triggerNotification(
        user.id,
        "Prueba de Notificación Push",
        "Esta es una prueba de notificación desde el script de diagnóstico.",
        "/perfil",
        "SYSTEM"
    );
    console.log("Trigger Notification Result:", res);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
