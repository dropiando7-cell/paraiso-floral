import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Obtener la primera organización disponible
    const org = await prisma.organization.findFirst();
    if (!org) {
        throw new Error('No se encontró ninguna organización en la base de datos.');
    }
    
    console.log(`[*] Usando organización: ${org.name} (ID: ${org.id})`);

    // 2. Definir parámetros de la etiqueta de prueba
    const idQr = 'TST-FLOR-001';
    const descripcion = 'ROSA ROJA PREMIUM IMPORTADA';
    const marca = 'PARAISO FLORAL';
    const modelo = 'DOCENA';
    const serie = 'LOT-2026-08-28';
    const size = '50x25'; // Tamaño de 2x1 pulgadas

    // 3. Construir la URL de generación de etiqueta
    // Usamos el host oficial para que el script de python descargue la imagen real
    const host = 'https://bioelectronicahn.vercel.app';
    const params = new URLSearchParams({
        idQr,
        descripcion,
        marca,
        modelo,
        serie,
        size
    });
    
    const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

    console.log(`[*] Generando URL de etiqueta: ${urlImagen}`);

    // 4. Insertar en la cola de impresión
    const nuevoTrabajo = await prisma.colaImpresion.create({
        data: {
            organizationId: org.id,
            urlImagen,
            estado: 'PENDIENTE',
            impresora: 'Niimbot', // El print server Vorttek procesará todo a ImpresoraEtiquetas
            tamano: size
        }
    });

    console.log(`\n[+] ¡Trabajo de impresión de prueba creado con éxito!`);
    console.log(`[+] ID del Trabajo: ${nuevoTrabajo.id}`);
    console.log(`[+] Estado: PENDIENTE`);
    console.log(`[+] Ahora puedes ejecutar tu script de Python para imprimir esta etiqueta.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
