import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding system settings...');

    const defaultSettings = [
        {
            key: 'maintenance_mode',
            value: 'true',
        },
        {
            key: 'google_reviews',
            value: JSON.stringify([
                {
                    id: 'rev-1',
                    author: 'Carla Portillo',
                    rating: 5,
                    text: 'El ingeniero Tejada y su equipo son profesionales. Resuelven los problemas técnicos al 100%. Super contenta y agradecida por su servicio.',
                    avatar: 'https://i.ibb.co/L8xY7hS/avatar-placeholder.png',
                    date: 'Hace 3 semanas'
                },
                {
                    id: 'rev-2',
                    author: 'Jefferson Romero',
                    rating: 5,
                    text: 'Excelente, muy profesionales, la labor garantizada de muy buena calidad y de alto rendimiento. Les invito a conocer estos equipos, y adquiéralos...',
                    avatar: 'https://i.ibb.co/L8xY7hS/avatar-placeholder.png',
                    date: 'Hace 2 meses'
                },
                {
                    id: 'rev-3',
                    author: 'Marleny Vargas',
                    rating: 5,
                    text: 'Muchas gracias Ing. Tejada por su apoyo y soporte tecnico a nuestros equipos medicos con ética, eficiencia y responsabilidad. Éxitos y bendiciones.',
                    avatar: 'https://i.ibb.co/L8xY7hS/avatar-placeholder.png',
                    date: 'Hace 4 meses'
                }
            ])
        },
        {
            key: 'landing_sections',
            value: JSON.stringify([
                { id: 'hero', name: 'Hero Banner', visible: true },
                { id: 'reviews', name: 'Google Reviews Slider', visible: true },
                { id: 'categories', name: 'Categorías de Equipos', visible: true },
                { id: 'products', name: 'Catálogo de Equipos y Repuestos', visible: true },
                { id: 'services', name: 'Servicios de Mantenimiento', visible: true },
                { id: 'contact', name: 'Formulario y Mapa de Contacto', visible: true }
            ])
        },
        {
            key: 'landing_settings',
            value: JSON.stringify({
                whatsappNumbers: ['50431782368', '50489246108'],
                contactEmails: ['ventas@bioelectronicahn.com', 'gerencia@bioelectronicahn.com'],
                physicalAddress: '7 Calle, 9 Avenida NO, San Pedro Sula, Cortés',
                workingHours: 'Lunes a Viernes · 8:00 AM - 5:00 PM',
                heroTitle: 'Equipamiento Médico y Soporte Biomédico Lider en Honduras',
                heroSubtitle: 'Diseñando soluciones integrales en venta, distribución y soporte técnico especializado para hospitales y clínicas a nivel nacional.'
            })
        },
        {
            key: 'mantenimiento_notificar_dias',
            value: '5'
        },
        {
            key: 'mantenimiento_whatsapp_template_sid',
            value: 'HXa363e371108b8cd13811d22b75ccbc74'
        }
    ];

    for (const setting of defaultSettings) {
        await prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting
        });
        console.log(`✅ SystemSetting upserted: ${setting.key}`);
    }

    console.log('Seeding finished successfully.');
}

main()
    .catch((e) => {
        console.error('Error running script:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
