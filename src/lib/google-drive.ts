import { google } from 'googleapis';
import * as XLSX from 'xlsx';

// Bank folder mapping
export const BANK_FOLDERS: Record<string, string> = {
    'Banpais': 'Banpais',
    'Davivienda': 'Davivienda',
    'BAC Honduras': 'BAC',
    'AFP Atlántida': 'AFP_Atlantida',
    'Banco de Occidente': 'Occidente',
    'PayPal': 'Paypal',
};

const MONTH_NAMES: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

function getAuth() {
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, '\n');
    return new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
}

async function getDrive() {
    const auth = getAuth();
    return google.drive({ version: 'v3', auth });
}

/**
 * Find the subfolder for a given bank and year inside the root Drive folder.
 */
async function findFolder(drive: ReturnType<typeof google.drive>, parentId: string, name: string): Promise<string | null> {
    const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    const folder = res.data.files?.find(f => f.name?.toLowerCase() === name.toLowerCase());
    return folder?.id ?? null;
}

/**
 * List files in a folder (non-recursive).
 */
async function listFiles(drive: ReturnType<typeof google.drive>, folderId: string) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name, mimeType)',
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    return res.data.files ?? [];
}

/**
 * Download and parse a file from Drive into text content.
 */
async function parseFile(drive: ReturnType<typeof google.drive>, fileId: string, fileName: string): Promise<string> {
    const response = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    const lowerName = fileName.toLowerCase();

    // Excel files
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let content = `=== Archivo: ${fileName} ===\n`;
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            content += `\n-- Hoja: ${sheetName} --\n${csv}\n`;
        }
        return content;
    }

    // PDF files — extract text as-is (basic approach)
    if (lowerName.endsWith('.pdf')) {
        try {
            // Use require for pdf-parse (CommonJS module)
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            return `=== Archivo: ${fileName} ===\n${data.text}\n`;
        } catch {
            return `=== Archivo: ${fileName} ===\n[No se pudo extraer el texto del PDF: ${fileName}]\n`;
        }
    }

    // Plain text files
    return `=== Archivo: ${fileName} ===\n${buffer.toString('utf-8')}\n`;
}

export interface DriveFilesResult {
    content: string;
    fileNames: string[];
    error?: string;
}

/**
 * Main function: fetch and parse all files for a given bank, month, and year.
 * Folder structure expected: ROOT / {BankFolder} / {Year} / files...
 * Also checks ROOT / {BankFolder} / files that match the month name.
 */
export async function getFilesForReconciliation(
    banco: string,
    month: string,
    year: string
): Promise<DriveFilesResult> {
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    const bankFolderName = BANK_FOLDERS[banco];
    const monthName = MONTH_NAMES[month] ?? month;

    if (!bankFolderName) {
        return { content: '', fileNames: [], error: `Banco no reconocido: ${banco}` };
    }

    try {
        const drive = await getDrive();

        // Strategy 1: Try bank subfolder (e.g. ROOT/Occidente/2026/)
        let targetFolderId: string | null = null;
        const bankFolderId = await findFolder(drive, rootFolderId, bankFolderName);
        if (bankFolderId) {
            const yearFolderId = await findFolder(drive, bankFolderId, year);
            targetFolderId = yearFolderId ?? bankFolderId;
        }

        // Get files from the resolved folder (bank subfolder or root)
        const folderToSearch = targetFolderId ?? rootFolderId;
        const allFiles = await listFiles(drive, folderToSearch);

        // Filter by month name OR month number in filename (case-insensitive)
        // Also filter by bank name in filename if using root folder (no subfolder found)
        const monthLower = monthName.toLowerCase();
        const bankKeywords = [bankFolderName.toLowerCase(), banco.toLowerCase()];

        const relevantFiles = allFiles.filter(f => {
            const nameLower = f.name?.toLowerCase() ?? '';
            const hasMonth = nameLower.includes(monthLower) || nameLower.includes(month);
            const hasYear = nameLower.includes(year);
            // If we're using root folder (no bank subfolder), also match bank name
            if (!targetFolderId) {
                const hasBank = bankKeywords.some(k => nameLower.includes(k));
                return hasMonth && hasYear && hasBank;
            }
            return hasMonth && hasYear;
        });

        // Fallback: if no exact match, use all files in the folder
        const filesToProcess = relevantFiles.length > 0 ? relevantFiles : allFiles;

        if (filesToProcess.length === 0) {
            return {
                content: '',
                fileNames: [],
                error: `No se encontraron archivos para ${monthName} ${year} de ${banco}. Verifique que los archivos están en la carpeta de Drive y que el nombre incluye el banco y el mes.`,
            };
        }

        // Parse each file into text
        const fileContents: string[] = [];
        const fileNames: string[] = [];

        for (const file of filesToProcess) {
            if (!file.id || !file.name) continue;
            try {
                const content = await parseFile(drive, file.id, file.name);
                fileContents.push(content);
                fileNames.push(file.name);
            } catch (err) {
                fileContents.push(`=== Archivo: ${file.name} ===\n[Error al leer: ${err}]\n`);
                fileNames.push(file.name);
            }
        }

        return {
            content: fileContents.join('\n\n'),
            fileNames,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: '', fileNames: [], error: `Error de Google Drive: ${message}` };
    }
}


/**
 * Upload a file buffer to the Drive reports folder.
 * Returns the Drive file ID and web view link.
 */
export async function uploadFileToDrive(
    fileName: string,
    fileBuffer: Buffer,
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): Promise<{ fileId: string; webViewLink: string }> {
    const reportsFolderId = process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID!;
    const drive = await getDrive();

    const { Readable } = await import('stream');
    const stream = Readable.from(fileBuffer);

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [reportsFolderId],
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true,
    });

    return {
        fileId: res.data.id ?? '',
        webViewLink: res.data.webViewLink ?? '',
    };
}
