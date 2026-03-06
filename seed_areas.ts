import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos extraídos de InventarioClient.tsx
const AREAS = [
    { value: 'PB-A1-OF.PASTOR', label: 'Planta Baja - Oficina del Pastor' },
    { value: 'PB-A2-OF.ADM', label: 'Planta Baja - Oficina Administrativa' },
    { value: 'PB-A3-S.CUNA', label: 'Planta Baja - Sala Cuna' },
    { value: 'PB-A4-ENFERM', label: 'Planta Baja - Enfermería' },
    { value: 'PB-A5-S.JUNTAS', label: 'Planta Baja - Sala de Juntas' },
    { value: 'PB-A6-COCINETA', label: 'Planta Baja - Cocineta' },
    { value: 'PB-A7-OF.JOVEN', label: 'Planta Baja - Oficina de Jóvenes' },
    { value: 'PB-A8-OF.EB', label: 'Planta Baja - Oficina de Escuela Bíblica' },
    { value: 'PB-A9-EB', label: 'Planta Baja - Escuela Bíblica 1' },
    { value: 'PB-A10-EB', label: 'Planta Baja - Escuela Bíblica 2' },
    { value: 'PB-A11-COCIN CAF', label: 'Planta Baja - Cocina Cafetería' },
    { value: 'PB-A12-SALON CAF', label: 'Planta Baja - Salón Cafetería' },
    { value: 'PB-A13-AUDIO', label: 'Planta Baja - Cabina de Audio' },
    { value: 'PB-A14-MULTI', label: 'Planta Baja - Salón Multiusos' },
    { value: 'PB-A15-TEMPLO', label: 'Planta Baja - Templo' },
    { value: 'PB-A16-PLATAFO', label: 'Planta Baja - Plataforma Templo' },
    { value: 'PB-A17-OF', label: 'Planta Baja - Oficina Auxiliar' },
    { value: 'PB-A18-OF. IMCE', label: 'Planta Baja - Oficina IMCE' },
    { value: 'PA-A1-SAL.MUL', label: 'Planta Alta - Salón Multiusos' },
    { value: 'PA-A2-OFICINA', label: 'Planta Alta - Oficina General' },
    { value: 'PA-A3-EB', label: 'Planta Alta - Escuela Bíblica A3' },
    { value: 'PA-A4-EB', label: 'Planta Alta - Escuela Bíblica A4' },
    { value: 'PA-A5-EB', label: 'Planta Alta - Escuela Bíblica A5' },
    { value: 'PA-A6-EB', label: 'Planta Alta - Escuela Bíblica A6' },
    { value: 'PA-B1-PASILLO', label: 'Planta Alta - Bodega Pasillo B1' },
    { value: 'PB-B1-OFICINA', label: 'Planta Baja - Bodega Oficina B1' },
    { value: 'PB-B2-PASILLO', label: 'Planta Baja - Bodega Pasillo B2' },
    { value: 'PB-B3-TRASERA', label: 'Planta Baja - Bodega Trasera B3' },
    { value: 'PB-B4-TEMPLO', label: 'Planta Baja - Bodega Templo B4' },
    { value: 'PB-B5-TEMPLO', label: 'Planta Baja - Bodega Templo B5' },
    { value: 'B6-EXTERNA CV', label: 'Bodega Externa 6 (C.V.)' },
    { value: 'PB-A32-PT.VIGILANCIA', label: 'Planta Baja - Puesto Inteligencia' },
    { value: 'TEST-AREA', label: 'Área de Pruebas Sistemas' },
];

const PREFIX_MAP: Record<string, string> = {
    'PB-A1-OF.PASTOR': 'ELIM-PB-A01-OF',
    'PB-A2-OF.ADM': 'ELIM-PB-A02-OF',
    'PB-A3-S.CUNA': 'ELIM-PB-A03-SC',
    'PB-A4-ENFERM': 'ELIM-PB-A04-EN',
    'PB-A5-S.JUNTAS': 'ELIM-PB-A05-SJ',
    'PB-A6-COCINETA': 'ELIM-PB-A06-CK',
    'PB-A7-OF.JOVEN': 'ELIM-PB-A07-OF',
    'PB-A8-OF.EB': 'ELIM-PB-A08-OF',
    'PB-A9-EB': 'ELIM-PB-A09-EB',
    'PB-A10-EB': 'ELIM-PB-A10-EB',
    'PB-A11-COCIN CAF': 'ELIM-PB-A11-CA',
    'PB-A12-SALON CAF': 'ELIM-PB-A12-CA',
    'PB-A13-AUDIO': 'ELIM-PB-A13-AU',
    'PB-A14-MULTI': 'ELIM-PB-A14-ML',
    'PB-A15-TEMPLO': 'ELIM-PB-A15-TM',
    'PB-A16-PLATAFO': 'ELIM-PB-A16-PL',
    'PB-A17-OF': 'ELIM-PB-A17-OF',
    'PB-A18-OF. IMCE': 'ELIM-PB-A18-OF',
    'PA-A1-SAL.MUL': 'ELIM-PA-A19-SL',
    'PA-A2-OFICINA': 'ELIM-PA-A20-OF',
    'PA-A3-EB': 'ELIM-PA-A21-EB',
    'PA-A4-EB': 'ELIM-PA-A22-EB',
    'PA-A5-EB': 'ELIM-PA-A23-EB',
    'PA-A6-EB': 'ELIM-PA-A24-EB',
    'PA-B1-PASILLO': 'ELIM-PA-A25-BD',
    'PB-B1-OFICINA': 'ELIM-PB-A26-BD',
    'PB-B2-PASILLO': 'ELIM-PB-A27-BD',
    'PB-B3-TRASERA': 'ELIM-PB-A28-BD',
    'PB-B4-TEMPLO': 'ELIM-PB-A29-BD',
    'PB-B5-TEMPLO': 'ELIM-PB-A30-BD',
    'B6-EXTERNA CV': 'ELIM-EX-A31-BD',
    'PB-A32-PT.VIGILANCIA': 'ELIM-PB-A32-PT',
    'TEST-AREA': 'TEST-AREA', // fallback para test
};

const QR_TO_AREA_MAP: Record<string, string> = {
    'ELIM-QR-PB-A01-OFI': 'PB-A1-OF.PASTOR',
    'ELIM-QR-PB-A02-OFI': 'PB-A2-OF.ADM',
    'ELIM-QR-PB-A03-SCU': 'PB-A3-S.CUNA',
    'ELIM-QR-PB-A04-ENF': 'PB-A4-ENFERM',
    'ELIM-QR-PB-A05-SJU': 'PB-A5-S.JUNTAS',
    'ELIM-QR-PB-A06-COC': 'PB-A6-COCINETA',
    'ELIM-QR-PB-A07-OFI': 'PB-A7-OF.JOVEN',
    'ELIM-QR-PB-A08-OFI': 'PB-A8-OF.EB',
    'ELIM-QR-PB-A09-EBE': 'PB-A9-EB',
    'ELIM-QR-PB-A10-EBE': 'PB-A10-EB',
    'ELIM-QR-PB-A11-CAF': 'PB-A11-COCIN CAF',
    'ELIM-QR-PB-A12-CAF': 'PB-A12-SALON CAF',
    'ELIM-QR-PB-A13-AUD': 'PB-A13-AUDIO',
    'ELIM-QR-PB-A14-MUL': 'PB-A14-MULTI',
    'ELIM-QR-PB-A15-TMP': 'PB-A15-TEMPLO',
    'ELIM-QR-PB-A16-PLA': 'PB-A16-PLATAFO',
    'ELIM-QR-PB-A17-OFI': 'PB-A17-OF',
    'ELIM-QR-PB-A18-OFI': 'PB-A18-OF. IMCE',
    'ELIM-QR-PA-A19-SLM': 'PA-A1-SAL.MUL',
    'ELIM-QR-PA-A20-OFI': 'PA-A2-OFICINA',
    'ELIM-QR-PA-A21-EBE': 'PA-A3-EB',
    'ELIM-QR-PA-A22-EBE': 'PA-A4-EB',
    'ELIM-QR-PA-A23-EBE': 'PA-A5-EB',
    'ELIM-QR-PA-A24-EBE': 'PA-A6-EB',
    'ELIM-QR-PA-A25-BDG': 'PA-B1-PASILLO',
    'ELIM-QR-PB-A26-BDG': 'PB-B1-OFICINA',
    'ELIM-QR-PB-A27-BDG': 'PB-B2-PASILLO',
    'ELIM-QR-PB-A28-BDG': 'PB-B3-TRASERA',
    'ELIM-QR-PB-A29-BDG': 'PB-B4-TEMPLO',
    'ELIM-QR-PB-A30-BDG': 'PB-B5-TEMPLO',
    'ELIM-QR-EX-A31-BDG': 'B6-EXTERNA CV',
    'ELIM-QR-PB-A32-PAT': 'PB-A32-PT.VIGILANCIA',
};

// Invert the QR map so we can look up QR by area name
const AREA_TO_QR_MAP: Record<string, string> = {};
for (const [qr, area] of Object.entries(QR_TO_AREA_MAP)) {
    AREA_TO_QR_MAP[area] = qr;
}

async function main() {
    console.log('Fetching organization...');
    // Asumimos que quieres popular la org default de Elim
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('No organization found');
        return;
    }

    console.log(`Starting to seed areas for organization: ${org.name} (${org.id})`);

    let createdCount = 0;

    for (const area of AREAS) {
        const name = area.value;
        const description = area.label;
        const prefix = PREFIX_MAP[name] || name;

        // Asignar un QR por defecto si no existe en el CSV mapeado
        const qrCode = AREA_TO_QR_MAP[name] || `ELIM-QR-GEN-${name.replace(/[^A-Z0-9]/g, '-')}`;

        try {
            await prisma.area.upsert({
                where: {
                    organizationId_name: { organizationId: org.id, name }
                },
                update: {
                    description,
                    prefix,
                    qrCode
                },
                create: {
                    organizationId: org.id,
                    name,
                    description,
                    prefix,
                    qrCode
                }
            });
            console.log(`✅ Upserted Area: ${name}`);
            createdCount++;
        } catch (e) {
            console.error(`❌ Error upserting Area ${name}:`, e);
        }
    }

    console.log(`✅ Successfully seeded ${createdCount} areas.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
