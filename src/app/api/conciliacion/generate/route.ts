import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { getFilesForReconciliation, uploadFileToDrive } from '@/lib/google-drive';
import { generateReconciliation } from '@/lib/claude-reconciliation';
import { fillReconciliationTemplate } from '@/lib/fill-template';

const MONTH_NAMES: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { banco, tipoCuenta, month, year, force } = await request.json() as {
            banco: string;
            tipoCuenta: string;
            month: string;
            year: string;
            force?: boolean;
        };
        if (!banco || !tipoCuenta || !month || !year) {
            return NextResponse.json({ error: 'Faltan parámetros: banco, tipoCuenta, month, year' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { organizationId: true, email: true, role: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // ── Duplicate detection ─────────────────────────────────────────────────
        const existing = await prisma.conciliation.findFirst({
            where: {
                organizationId: dbUser.organizationId,
                banco,
                tipoCuenta,
                month: parseInt(month),
                year: parseInt(year),
                status: 'COMPLETED',
            },
            select: { id: true, isApproved: true },
        });
        if (existing) {
            if (existing.isApproved) {
                return NextResponse.json({
                    error: `Ya existe una conciliación AUTORIZADA para ${banco} (${tipoCuenta}) del período seleccionado. No se puede sobreescribir.`,
                    duplicate: true,
                    approved: true,
                }, { status: 409 });
            }
            if (!force) {
                return NextResponse.json({
                    error: `Ya existe una conciliación para ${banco} (${tipoCuenta}) del período seleccionado. ¿Desea regenerarla y reemplazarla?`,
                    duplicate: true,
                    approved: false,
                    existingId: existing.id,
                }, { status: 409 });
            }
            // force=true → delete the old one and regenerate
            await prisma.conciliation.delete({ where: { id: existing.id } });
        }

        // Create a PROCESSING record
        const conciliation = await prisma.conciliation.create({
            data: {
                organizationId: dbUser.organizationId,
                banco,
                tipoCuenta,
                month: parseInt(month),
                year: parseInt(year),
                status: 'PROCESSING',
                filesFound: [],
            },
        });

        // 1. Fetch files from Google Drive
        const driveResult = await getFilesForReconciliation(banco, month, year);
        if (driveResult.error) {
            await prisma.conciliation.update({
                where: { id: conciliation.id },
                data: { status: 'FAILED', reportSummary: driveResult.error },
            });
            return NextResponse.json({ error: driveResult.error }, { status: 422 });
        }

        // 2. Call Claude → structured JSON matching template
        const reportData = await generateReconciliation(
            driveResult.content,
            banco,
            tipoCuenta,
            month,
            year,
            driveResult.fileNames
        );

        // 3. Fill the Excel template with Claude's data
        const excelBuffer = fillReconciliationTemplate(reportData);

        // 4. Upload Excel to Drive reports folder (non-fatal — report saves regardless)
        const monthName = MONTH_NAMES[month] ?? month;
        const fileName = `Conciliacion_${banco.replace(/ /g, '_')}_${tipoCuenta.replace(/ /g, '_')}_${monthName}${year}.xlsx`;
        let driveFile: { fileName: string; fileId: string; webViewLink: string } | null = null;
        try {
            const uploadResult = await uploadFileToDrive(fileName, excelBuffer);
            driveFile = { fileName, fileId: uploadResult.fileId, webViewLink: uploadResult.webViewLink };
        } catch (uploadErr) {
            console.warn('[conciliacion/generate] Drive upload failed (non-fatal):', uploadErr instanceof Error ? uploadErr.message : uploadErr);
        }

        // 5. Compute summary from the report data
        const info = reportData.informacion_general;
        const diferencia = (info.saldo_banco ?? 0) - (info.saldo_libros ?? 0);
        const summary = `Banco: ${banco} | Período: ${monthName} ${year} | Saldo banco: L. ${info.saldo_banco?.toLocaleString()} | Saldo libros: L. ${info.saldo_libros?.toLocaleString()} | Diferencia: L. ${diferencia.toFixed(2)}`;

        // 6. Save complete report to DB
        const updated = await prisma.conciliation.update({
            where: { id: conciliation.id },
            data: {
                status: 'COMPLETED',
                reportContent: reportData as unknown as import('@prisma/client').Prisma.JsonObject,
                reportSummary: summary,
                filesFound: driveResult.fileNames,
            },
        });

        return NextResponse.json({
            id: updated.id,
            status: 'COMPLETED',
            report: reportData,
            filesFound: driveResult.fileNames,
            driveFile,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[conciliacion/generate] Error:', message);
        return NextResponse.json({ error: `Error interno: ${message}` }, { status: 500 });
    }
}
