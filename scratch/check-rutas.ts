import { prisma } from '../src/lib/prisma';
import { getRutas } from '../src/app/(dashboard)/inventario-ventas/rutas/actions';

async function main() {
    try {
        console.log("Calling getRutas() to check database and seed fallback...");
        const routes = await getRutas();
        console.log("Returned routes count:", routes?.length);
        if (routes && routes.length > 0) {
            console.log("Sample route details:");
            console.log(" - Conductor:", routes[0].conductorNombre);
            console.log(" - Ruta:", routes[0].rutaNombre);
            console.log(" - Estado:", routes[0].estado);
        } else {
            console.log("No routes returned.");
        }
    } catch (e) {
        console.error("Verification failed:", e);
    }
}

main();
export {};
