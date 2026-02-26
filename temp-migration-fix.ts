import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm'

const getEncryptionKey = (): Buffer => {
    const keyString = process.env.VAULT_ENCRYPTION_KEY
    if (!keyString) {
        throw new Error('VAULT_ENCRYPTION_KEY is not set in environment variables.')
    }
    const key = Buffer.from(keyString, 'hex')
    if (key.length !== 32) {
        throw new Error('VAULT_ENCRYPTION_KEY must be a 32-byte (64-character) hex string.')
    }
    return key
}

const encrypt = (text: string): string => {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

async function main() {
    console.log("Iniciando borrado e inserción desde Excel...");

    const rootUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
    });

    if (!rootUser) {
        console.error("No se encontró ningún SUPER_ADMIN para adscribir los registros.");
        return;
    }

    const orgId = rootUser.organizationId;

    // 1. Borrar todas las contraseñas cargadas por "importación masiva" para evitar duplicados
    await prisma.passwordVault.deleteMany({
        where: {
            organizationId: orgId,
            notes: 'Importado masivamente de Excel'
        }
    });

    const excelPath = 'D:\\sistemas-elim-app\\plantilla-concilia\\Inventario Activos IT - 20240906.xlsx';

    console.log(`Leyendo Excel en: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetNames = workbook.SheetNames;

    let totalImported = 0;

    for (const sheetName of sheetNames) {
        if (!['Inventario de Computadoras', 'Inventario Memorias RAM', 'Telefonia', 'Servicios Externos', 'Licencias', 'RED'].includes(sheetName)) {
            continue;
        }

        console.log(`\n--- Procesando Hoja: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data: any[] = xlsx.utils.sheet_to_json(sheet);

        for (const row of data) {
            let title = '';
            let username = '';
            let rawPassword = '';
            let category = 'General';
            let details: Record<string, any> = {};

            if (sheetName === 'Inventario de Computadoras') {
                category = 'Computadoras';
                title = row['Hostname'] || `PC - ${row['ID del Dispositivo'] || 'Desconocida'}`;
                username = row['Usuario'] || '';
                rawPassword = row['Password Windows'] ? String(row['Password Windows']) : 'No asignado';

                details = {
                    'Sistema Operativo': row['Sistema Operativo'] || '',
                    'ID del Producto': row['ID del Producto'] || '',
                    'ID del Dispositivo': row['ID del Dispositivo'] || '',
                    'Marca': row['Marca'] || '',
                    'Modelo': row['Modelo'] || '',
                    'Serie': row['Serie'] || '',
                    'Renovacion AV': row['Renovacion AV'] || '',
                    'Descripcion': row['Descripcion'] || '',
                };
            } else if (sheetName === 'Inventario Memorias RAM') {
                category = 'Memorias RAM';
                title = row['Descripcion'] || `RAM - ${row['SerialNumber'] || 'Desconocida'}`;
                username = 'N/A';
                rawPassword = 'N/A';

                details = {
                    'DeviceLocator': row['DeviceLocator'] || '',
                    'Capacity': row['Capacity'] || '',
                    'Manufacturer': row['Manufacturer'] || '',
                    'SerialNumber': row['SerialNumber'] || '',
                };
            } else if (sheetName === 'Telefonia') {
                category = 'Telefonía';
                title = row['Modelo'] || 'Teléfono IP';
                username = row['Usuario'] || '';
                rawPassword = row['Contrasena'] ? String(row['Contrasena']) : '1234';

                details = {
                    'Correo': row['Correo'] || ''
                };
            } else if (sheetName === 'Servicios Externos') {
                category = 'Servicios Externos';
                title = row['Nombre'] || 'Servicio Externo';
                username = row['Usuario '] || row['Usuario'] || '';
                rawPassword = row['Contraseña'] || row['Contrasena'] ? String(row['Contraseña'] || row['Contrasena']) : '';

                details = {
                    'Responsable': row['Responsable'] || '',
                    'Cuentas de Recuperacion': row['Cuentas de Recuperacion'] || '',
                    'Ultima Actualización': row['Ultima Actualización'] || '',
                    'Anterior': row['Anterior'] || '',
                    'Observaciones': row['Observaciones'] || ''
                };
            } else if (sheetName === 'Licencias') {
                category = 'Licencias';
                title = row['Servicio'] || 'Licencia';
                username = row['Correo'] || '';
                rawPassword = row['Contrasena'] ? String(row['Contrasena']) : '';

                details = {
                    'Código de Activación': row['Código de Activación'] || '',
                    'Llave de licencia': row['Llave de licencia'] || '',
                    'Fecha compra': row['Fecha compra'] || '',
                    'Tipo': row['Tipo'] || '',
                    'En Uso': row['En Uso'] || '',
                    'Dispositivos conectados': row['Dispositivos conectados'] || '',
                };
            } else if (sheetName === 'RED') {
                category = 'RED';
                title = row['Nombre'] || 'Equipo de Red';
                username = row['Usuario'] || '';
                rawPassword = row['Password'] ? String(row['Password']) : '';

                details = {
                    'Marca': row['Marca'] || '',
                    'Modelo': row['Modelo'] || '',
                    'Serie': row['Serie'] || '',
                    'SSID': row['SSID'] || '',
                    'Tipo': row['Tipo'] || '',
                    'WAN': row['WAN'] || '',
                    'LAN': row['LAN'] || '',
                    'Password Wifi': row['Password Wifi'] || '',
                    'Observaciones': row['Observaciones'] || ''
                };
            }

            if (!title) title = 'Elemento Importado';
            if (!username && category !== 'Memorias RAM') username = 'S/N';

            if (!rawPassword && category !== 'Memorias RAM') {
                rawPassword = 'No registrada en Excel';
            }

            try {
                await prisma.passwordVault.create({
                    data: {
                        organizationId: orgId,
                        title,
                        username,
                        encryptedPass: rawPassword ? encrypt(rawPassword) : encrypt('N/A'),
                        url: null,
                        category: category,
                        notes: 'Importado masivamente de Excel',
                        details: details as any
                    }
                });
                totalImported++;
                process.stdout.write(".");
            } catch (err) {
                console.error(`\nError insertando fila de ${sheetName}:`, err);
            }
        }
    }

    console.log(`\n\nMigración Completa. Se (RE) importaron ${totalImported} registros.`);
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    });
