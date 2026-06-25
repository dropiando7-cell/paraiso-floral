import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        console.log("landing_settings in DB:", setting);
    } catch (e) {
        console.error("DB Query failed:", e);
    }
}

main();
export {};
