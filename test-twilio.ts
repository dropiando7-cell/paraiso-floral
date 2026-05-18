import { sendSoporteRecepcion } from './src/lib/checkin-notifications';

async function test() {
    const res = await sendSoporteRecepcion(
        "Prueba Cliente",
        "+50433242082",
        "TEST-001",
        "Concentrador Oxigeno",
        "SN-123",
        "Juan Perez"
    );
    console.log("Twilio Result:", res);
}

test().catch(console.error);
