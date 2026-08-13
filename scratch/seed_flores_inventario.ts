import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function main() {
    console.log('📌 Iniciando siembra de inventario para Distribuidora Paraíso Floral...')

    // 1. Obtener organización
    const org = await prisma.organization.findFirst({
        where: { OR: [{ slug: 'central' }, { slug: 'paraiso-floral' }] }
    })

    if (!org) {
        throw new Error('Organización no encontrada. Ejecuta primero create_master_user.ts')
    }

    // 2. Obtener usuario admin
    const masterUser = await prisma.user.findFirst({
        where: { email: 'master@superapp.com' }
    })

    // 3. Crear Áreas de Almacenamiento
    const areaNames = [
        { name: 'CAMARA-FRIA-1', prefix: 'CF1', qrCode: 'AREA-CF1', description: 'Cámara Fría Principal (Rosas y Flores Importadas)' },
        { name: 'CAMARA-FRIA-2', prefix: 'CF2', qrCode: 'AREA-CF2', description: 'Cámara Fría Secundaria (Follajes y Verdes)' },
        { name: 'BODEGA-SUMINISTROS', prefix: 'BS', qrCode: 'AREA-BS', description: 'Bodega Insumos, Bases y Espuma Floral' },
        { name: 'SALA-EXHIBICION', prefix: 'SE', qrCode: 'AREA-SE', description: 'Atención al Cliente y Exhibición' }
    ]

    for (const a of areaNames) {
        await prisma.area.upsert({
            where: { organizationId_name: { organizationId: org.id, name: a.name } },
            update: { description: a.description, prefix: a.prefix },
            create: { organizationId: org.id, name: a.name, prefix: a.prefix, qrCode: a.qrCode, description: a.description }
        })
    }
    console.log('✅ Áreas de bodega y cámara fría registradas.')

    // 4. Crear Categorías Florales
    const categoryData = [
        { nombre: 'Rosas Importadas', color: '#e05688' },
        { nombre: 'Flores de Corte', color: '#ff70a6' },
        { nombre: 'Follajes y Verdes', color: '#2d6a4f' },
        { nombre: 'Bases y Jarrones', color: '#d4af37' },
        { nombre: 'Espuma y Material Técnico', color: '#3a86ff' },
        { nombre: 'Empaques y Envoltorios', color: '#8338ec' }
    ]

    const categoryMap: Record<string, string> = {}

    for (const cat of categoryData) {
        const existing = await prisma.categoria.findFirst({
            where: { organizationId: org.id, nombre: cat.nombre }
        })

        if (existing) {
            categoryMap[cat.nombre] = existing.id
        } else {
            const created = await prisma.categoria.create({
                data: {
                    organizationId: org.id,
                    nombre: cat.nombre,
                    color: cat.color
                }
            })
            categoryMap[cat.nombre] = created.id
        }
    }
    console.log('✅ Categorías florales registradas.')

    // 5. Productos Florales y Suministros
    const productosSeed = [
        // ── Rosas de Colores e Importadas (con fotos) ──
        {
            descripcionCorta: 'Rosa Colores "Bonita"',
            marca: 'Bonita',
            modelo: 'Naranja Cálido',
            garantia: '70cm',
            mantenimientosIncluidos: 24, // 24 tallos por paquete
            frecuenciaMantenimientoMeses: 3, // 3°C Cámara fría
            referencia: '300.00', // Precio Venta (Lps)
            costoAdq: 140.00, // Costo Compra (Lps)
            stock: 100, // 100 Paquetes = 2,400 Tallos
            imagenUrl: '/flores/BONITA.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Cool Water"',
            marca: 'Cool Water',
            modelo: 'Verde Menta Pastel',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/COOL-WATER.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "eSperance"',
            marca: 'eSperance',
            modelo: 'Rosa Bi-color Degradado',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/ESPERANCE.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Exotic"',
            marca: 'Exotic',
            modelo: 'Coral Salmón Matizado',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/EXOTIC.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Colombia',
            condicionActivo: 'Exportación Selecta',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Gold Star"',
            marca: 'Gold Star',
            modelo: 'Amarillo Sol Intenso',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/GOLD-STAR.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "High and Peace"',
            marca: 'High and Peace',
            modelo: 'Amarillo Bordes Carmesí',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/HIGH-AND-PEACE.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Opala"',
            marca: 'Opala',
            modelo: 'Rosa Rubí Vibrante',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/OPALA.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Peach Versilia"',
            marca: 'Peach Versilia',
            modelo: 'Durazno Melocotón',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/PEACH-VERSILIA.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Perla"',
            marca: 'Perla',
            modelo: 'Rosa Marfil Suave',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/PERLA.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Colombia',
            condicionActivo: 'Exportación Selecta',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Pink Floyd"',
            marca: 'Pink Floyd',
            modelo: 'Fucsia Neón Intenso',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/PINK-FLOYD.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Colores "Quick Sand"',
            marca: 'Quick Sand',
            modelo: 'Arena Champán Pastel',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/QUICK-SAND.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Azul Tinturada "Arcoíris"',
            marca: 'Rainbow Special',
            modelo: 'Multicolor Tinturado',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '750.00',
            costoAdq: 380.00,
            stock: 100,
            imagenUrl: '/flores/ROSA-PINTADA-ARCOIRIS.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Colombia',
            condicionActivo: 'Exportación Selecta',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosa Natural "Vendela"',
            marca: 'Vendela',
            modelo: 'Blanco Crema Clásico',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/ROSITA-VENDELA.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosas Colores "Surtidas Lote Special"',
            marca: 'Assorted Mix',
            modelo: 'Variedades Mixtas',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            imagenUrl: '/flores/SURTIDAS.jpg',
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Rosas Inglesa (Paq. 24 Unid.)',
            marca: 'English Rose',
            modelo: 'Botón Abundante',
            garantia: '70cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '350.00',
            costoAdq: 170.00,
            stock: 100,
            categoriaNombre: 'Rosas Importadas',
            origenActivo: 'Colombia',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },

        // ── Flores de Corte ──
        {
            descripcionCorta: 'Girasoles (Paq. 12 Tallos)',
            marca: 'Sunbright',
            modelo: 'Botón XL',
            garantia: '65cm',
            mantenimientosIncluidos: 12,
            frecuenciaMantenimientoMeses: 3,
            referencia: '250.00',
            costoAdq: 110.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Guatemala',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Lirios Rosaly (Blanco y Tinturado)',
            marca: 'Rosaly',
            modelo: 'Doble Botón',
            garantia: '80cm',
            mantenimientosIncluidos: 5,
            frecuenciaMantenimientoMeses: 3,
            referencia: '400.00',
            costoAdq: 190.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Holanda',
            condicionActivo: 'Exportación Selecta',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Lirios Blanco (Paq. 5 Tallos)',
            marca: 'Casablanca',
            modelo: 'Blanco Puro',
            garantia: '80cm',
            mantenimientosIncluidos: 5,
            frecuenciaMantenimientoMeses: 3,
            referencia: '300.00',
            costoAdq: 140.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Colombia',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Lirios Rosado (Paq. 5 Tallos)',
            marca: 'Stargazer',
            modelo: 'Rosa Intenso',
            garantia: '80cm',
            mantenimientosIncluidos: 5,
            frecuenciaMantenimientoMeses: 3,
            referencia: '350.00',
            costoAdq: 160.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Colombia',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Minirosa Natural (Paq. 10 Tallos)',
            marca: 'Spray Rose',
            modelo: 'Ramos Múltiples',
            garantia: '50cm',
            mantenimientosIncluidos: 10,
            frecuenciaMantenimientoMeses: 3,
            referencia: '250.00',
            costoAdq: 115.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Gerberas (Paq. 12 Tallos)',
            marca: 'Gerbera Mix',
            modelo: 'Colores Surtidos',
            garantia: '50cm',
            mantenimientosIncluidos: 12,
            frecuenciaMantenimientoMeses: 3,
            referencia: '180.00',
            costoAdq: 85.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Guatemala',
            condicionActivo: 'Estándar',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Clavel Grande (Paq. 24 Tallos)',
            marca: 'Carnation',
            modelo: 'Rojo / Blanco / Rosa',
            garantia: '60cm',
            mantenimientosIncluidos: 24,
            frecuenciaMantenimientoMeses: 3,
            referencia: '220.00',
            costoAdq: 100.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Colombia',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-1'
        },
        {
            descripcionCorta: 'Tulipanes Holanda (Paq. 10 Tallos)',
            marca: 'Dutch Tulip',
            modelo: 'Colores Importados',
            garantia: '40cm',
            mantenimientosIncluidos: 10,
            frecuenciaMantenimientoMeses: 2,
            referencia: '1200.00',
            costoAdq: 650.00,
            stock: 100,
            categoriaNombre: 'Flores de Corte',
            origenActivo: 'Holanda',
            condicionActivo: 'Exportación Selecta',
            area: 'CAMARA-FRIA-1'
        },

        // ── Follajes y Verdes ──
        {
            descripcionCorta: 'Eucalipto Baby Blue (1 Manojo)',
            marca: 'Baby Blue',
            modelo: 'Aroma Fresco',
            garantia: '60cm',
            mantenimientosIncluidos: 1,
            frecuenciaMantenimientoMeses: 3,
            referencia: '200.00',
            costoAdq: 90.00,
            stock: 100,
            categoriaNombre: 'Follajes y Verdes',
            origenActivo: 'Guatemala',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-2'
        },
        {
            descripcionCorta: 'Eucalipto Dollar (1 Manojo)',
            marca: 'Silver Dollar',
            modelo: 'Hoja Ancha',
            garantia: '65cm',
            mantenimientosIncluidos: 1,
            frecuenciaMantenimientoMeses: 3,
            referencia: '250.00',
            costoAdq: 110.00,
            stock: 100,
            categoriaNombre: 'Follajes y Verdes',
            origenActivo: 'Guatemala',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-2'
        },
        {
            descripcionCorta: 'Ruscus Italiano (1 Manojo)',
            marca: 'Italian Ruscus',
            modelo: 'Follaje Fino',
            garantia: '70cm',
            mantenimientosIncluidos: 1,
            frecuenciaMantenimientoMeses: 3,
            referencia: '200.00',
            costoAdq: 95.00,
            stock: 100,
            categoriaNombre: 'Follajes y Verdes',
            origenActivo: 'Colombia',
            condicionActivo: 'Exportación Selecta',
            area: 'CAMARA-FRIA-2'
        },
        {
            descripcionCorta: 'Baby Breath Ecuador (1 Manojo)',
            marca: 'Gypsophila',
            modelo: 'Nube Blanca XL',
            garantia: '70cm',
            mantenimientosIncluidos: 1,
            frecuenciaMantenimientoMeses: 3,
            referencia: '350.00',
            costoAdq: 160.00,
            stock: 100,
            categoriaNombre: 'Follajes y Verdes',
            origenActivo: 'Ecuador',
            condicionActivo: 'Grado A (Premium)',
            area: 'CAMARA-FRIA-2'
        },

        // ── Suministros y Espuma Floral ──
        {
            descripcionCorta: 'Espuma Floral Oasis Max (Caja 48 Ladrillos)',
            marca: 'Oasis',
            modelo: 'Ladrillo Verde de Alta Densidad',
            garantia: 'N/A',
            mantenimientosIncluidos: 48,
            frecuenciaMantenimientoMeses: 12,
            referencia: '1450.00',
            costoAdq: 850.00,
            stock: 50,
            categoriaNombre: 'Espuma y Material Técnico',
            origenActivo: 'Nacional',
            condicionActivo: 'Nuevo',
            area: 'BODEGA-SUMINISTROS'
        },
        {
            descripcionCorta: 'Papel Koreano Impermeable Surtido (Paq. 20 Pliegos)',
            marca: 'Korean Wrap',
            modelo: 'Borde Dorado Elegance',
            garantia: 'N/A',
            mantenimientosIncluidos: 20,
            frecuenciaMantenimientoMeses: 12,
            referencia: '280.00',
            costoAdq: 130.00,
            stock: 150,
            categoriaNombre: 'Empaques y Envoltorios',
            origenActivo: 'Nacional',
            condicionActivo: 'Nuevo',
            area: 'BODEGA-SUMINISTROS'
        }
    ]

    console.log(`📌 Registrando ${productosSeed.length} líneas de inventario...`)

    let totalInventarioCreado = 0

    for (let i = 0; i < productosSeed.length; i++) {
        const prod = productosSeed[i]
        const catId = categoryMap[prod.categoriaNombre]
        const idQr = `PF-${(i + 1).toString().padStart(4, '0')}`

        const fechaCorte = new Date()
        fechaCorte.setDate(fechaCorte.getDate() - 2) // Corte hace 2 días

        const fechaVenc = new Date()
        fechaVenc.setDate(fechaVenc.getDate() + 14) // Vencimiento en 14 días

        const existingItem = await prisma.activoFijo.findFirst({
            where: { organizationId: org.id, descripcionCorta: prod.descripcionCorta }
        })

        if (existingItem) {
            await prisma.activoFijo.update({
                where: { id: existingItem.id },
                data: {
                    stock: prod.stock,
                    costoAdq: prod.costoAdq,
                    referencia: prod.referencia,
                    imagenUrl: prod.imagenUrl || existingItem.imagenUrl,
                    origenActivo: prod.origenActivo,
                    condicionActivo: prod.condicionActivo,
                    garantia: prod.garantia,
                    mantenimientosIncluidos: prod.mantenimientosIncluidos,
                    frecuenciaMantenimientoMeses: prod.frecuenciaMantenimientoMeses,
                    lote: `LOTE-PF-2026-08-${(i + 1).toString().padStart(2, '0')}`,
                    fechaFabricacion: fechaCorte,
                    fechaVencimiento: fechaVenc
                }
            })
            console.log(`🔄 Actualizado: ${prod.descripcionCorta} (${prod.stock} paquetes = ${prod.stock * prod.mantenimientosIncluidos} tallos)`)
        } else {
            await prisma.activoFijo.create({
                data: {
                    organizationId: org.id,
                    idQr: idQr,
                    codigoGrupo: `FLOR-${(i + 1).toString().padStart(3, '0')}`,
                    descripcionCorta: prod.descripcionCorta,
                    descripcionDetallada: `${prod.descripcionCorta} — Presentación en paquete de ${prod.mantenimientosIncluidos} tallos/unidades. Conservación idónea en cámara fría.`,
                    marca: prod.marca,
                    modelo: prod.modelo,
                    area: prod.area,
                    cuentaAct: prod.categoriaNombre,
                    estatusContable: 'VIGENTE',
                    fechaAdq: new Date(),
                    costoAdq: prod.costoAdq,
                    referencia: prod.referencia,
                    stock: prod.stock,
                    esConsumible: true,
                    origenActivo: prod.origenActivo,
                    condicionActivo: prod.condicionActivo,
                    garantia: prod.garantia,
                    mantenimientosIncluidos: prod.mantenimientosIncluidos,
                    frecuenciaMantenimientoMeses: prod.frecuenciaMantenimientoMeses,
                    lote: `LOTE-PF-2026-08-${(i + 1).toString().padStart(2, '0')}`,
                    fechaFabricacion: fechaCorte,
                    fechaVencimiento: fechaVenc,
                    imagenUrl: prod.imagenUrl || null,
                    categoriaId: catId,
                    createdById: masterUser?.id || null,
                    updatedById: masterUser?.id || null
                }
            })
            console.log(`✨ Creado: ${prod.descripcionCorta} (${prod.stock} paquetes = ${prod.stock * prod.mantenimientosIncluidos} tallos)`)
        }

        totalInventarioCreado++
    }

    console.log(`\n🎉 PROCESO COMPLETADO EXITOSAMENTE!`)
    console.log(`- Total de variedades y líneas registradas: ${totalInventarioCreado}`)
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
