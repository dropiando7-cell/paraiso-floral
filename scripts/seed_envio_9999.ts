import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Registering ENVIOS Code 9999 ===');

    const orgs = await prisma.organization.findMany();
    if (orgs.length === 0) {
        console.error('No organizations found.');
        return;
    }

    for (const org of orgs) {
        console.log(`\nProcessing Organization: ${org.name} (${org.id})`);

        // 1. Ensure Categoria "SERVICIOS Y FLETES" exists
        let cat = await prisma.categoria.findFirst({
            where: {
                organizationId: org.id,
                nombre: { in: ['SERVICIOS Y FLETES', 'SERVICIOS', 'ENVIOS'] }
            }
        });

        if (!cat) {
            cat = await prisma.categoria.create({
                data: {
                    organizationId: org.id,
                    nombre: 'SERVICIOS Y FLETES',
                    descripcion: 'Servicios de logística, transporte, envíos y fletes'
                }
            });
            console.log(`Created Categoria: ${cat.nombre} (${cat.id})`);
        } else {
            console.log(`Found Categoria: ${cat.nombre} (${cat.id})`);
        }

        // 2. Ensure Area "SERVICIOS" exists
        let area = await prisma.area.findFirst({
            where: {
                organizationId: org.id,
                name: 'SERVICIOS'
            }
        });

        if (!area) {
            area = await prisma.area.create({
                data: {
                    organizationId: org.id,
                    name: 'SERVICIOS',
                    prefix: 'SERV',
                    qrCode: `AREA-SERV-${org.id.slice(0, 4)}`,
                    description: 'Área de Servicios, Fletes y Cobros No Inventariables'
                }
            });
            console.log(`Created Area: ${area.name} (${area.id})`);
        } else {
            console.log(`Found Area: ${area.name}`);
        }

        // 3. Upsert Producto with sku
        const skuToUse = org.slug === 'paraiso-floral' ? '9999' : `9999-${org.slug}`;

        const existingProd = await prisma.producto.findFirst({
            where: {
                OR: [
                    { sku: skuToUse },
                    { organizationId: org.id, sku: '9999' }
                ]
            }
        });

        let prod;
        if (existingProd) {
            prod = await prisma.producto.update({
                where: { id: existingProd.id },
                data: {
                    nombre: 'ENVIOS',
                    descripcion: 'Servicio de envío / flete (monto variable)',
                    precioVenta: 0,
                    costoBase: 0,
                    stockActual: 9999,
                    esServicio: true,
                    categoria: cat.nombre,
                    estado: 'ACTIVO'
                }
            });
            console.log(`Updated Producto: [${prod.sku}] ${prod.nombre}`);
        } else {
            prod = await prisma.producto.create({
                data: {
                    organizationId: org.id,
                    sku: skuToUse,
                    nombre: 'ENVIOS',
                    descripcion: 'Servicio de envío / flete (monto variable)',
                    precioVenta: 0,
                    costoBase: 0,
                    stockActual: 9999,
                    stockMinimo: 0,
                    isvAplicable: 15,
                    estado: 'ACTIVO',
                    esServicio: true,
                    categoria: cat.nombre
                }
            });
            console.log(`Created Producto: [${prod.sku}] ${prod.nombre}`);
        }

        // 4. Upsert ActivoFijo with idQr = '9999'
        const existingActivo = await prisma.activoFijo.findFirst({
            where: {
                organizationId: org.id,
                idQr: '9999'
            }
        });

        let activo;
        if (existingActivo) {
            activo = await prisma.activoFijo.update({
                where: { id: existingActivo.id },
                data: {
                    codigoBarras: '9999',
                    descripcionCorta: 'ENVIOS',
                    descripcionDetallada: 'Servicio de envío / flete de mercadería (monto variable)',
                    area: 'SERVICIOS',
                    cuentaAct: 'SERVICIOS',
                    estatusContable: 'VIGENTE',
                    stock: 9999,
                    esConsumible: true,
                    categoriaId: cat.id,
                    productoId: prod.id
                }
            });
            console.log(`Updated ActivoFijo: [${activo.idQr}] ${activo.descripcionCorta}`);
        } else {
            activo = await prisma.activoFijo.create({
                data: {
                    organizationId: org.id,
                    idQr: '9999',
                    codigoBarras: '9999',
                    descripcionCorta: 'ENVIOS',
                    descripcionDetallada: 'Servicio de envío / flete de mercadería (monto variable)',
                    area: 'SERVICIOS',
                    cuentaAct: 'SERVICIOS',
                    estatusContable: 'VIGENTE',
                    stock: 9999,
                    esConsumible: true,
                    categoriaId: cat.id,
                    productoId: prod.id
                }
            });
            console.log(`Created ActivoFijo: [${activo.idQr}] ${activo.descripcionCorta}`);
        }
    }

    console.log('\n=== ENVIOS 9999 Registered Successfully! ===');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
