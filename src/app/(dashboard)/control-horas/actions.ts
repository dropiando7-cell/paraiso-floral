'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Helper: Get authenticated user context
async function getContextUser(): Promise<{ orgId: string; userId: string; role: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, role: true },
    });
    if (!dbUser) redirect('/unauthorized');
    return { orgId: dbUser.organizationId, userId: dbUser.id, role: dbUser.role };
}

export interface DiaDetalle {
    fecha: string; // YYYY-MM-DD
    diaSemana: string; // "Lunes", "Sábado", etc.
    primeraEntrada: string; // "06:01"
    ultimaSalida: string; // "17:15"
    punchesCount: number;
    punches: string[];
    extrasTemprano: number;
    extrasTarde: number;
    totalExtras: number;
}

export interface EmpleadoResumen {
    empId: string;
    nombre: string;
    diasTrabajados: number;
    horasExtrasTemprano: number;
    horasExtrasTarde: number;
    totalHorasExtras: number;
    dias: DiaDetalle[];
}

export interface ResumenReporteJSON {
    empleados: EmpleadoResumen[];
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Función central para parsear Buffer de Excel y calcular horas extras por empleado
function parsearExcelZKtecoBuffer(buffer: Buffer): {
    resumenJSON: ResumenReporteJSON;
    totalEmpleados: number;
    totalHorasExtras: number;
    totalExtrasTemprano: number;
    totalExtrasTarde: number;
    mesDetectado: number;
    anioDetectado: number;
} {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet) as any[];

    // Map: nombreEmpleado -> Map<fechaKey, Date[]>
    const empMap = new Map<string, Map<string, { dateObj: Date; punches: Date[]; empId: string }>>();

    let mesDetectado = new Date().getMonth() + 1;
    let anioDetectado = new Date().getFullYear();

    rawRows.forEach(row => {
        const name = String(row['Name'] || row['Nombre'] || row['Empleado'] || '').trim();
        const acNo = String(row['AC-No.'] || row['No.'] || row['ID'] || '').trim();
        const timeStr = String(row['Time'] || row['Fecha/Hora'] || row['Hora'] || '').trim();

        if (!name || !timeStr) return;

        // Parse date '25/8/2026 19:21' or ISO format
        let dateObj: Date | null = null;
        if (timeStr.includes('/')) {
            const parts = timeStr.split(' ');
            if (parts.length >= 2) {
                const [d, m, y] = parts[0].split('/').map(Number);
                const [hh, mm] = parts[1].split(':').map(Number);
                if (d && m && y && !isNaN(hh) && !isNaN(mm)) {
                    dateObj = new Date(y, m - 1, d, hh, mm);
                    mesDetectado = m;
                    anioDetectado = y;
                }
            }
        } else if (!isNaN(Date.parse(timeStr))) {
            dateObj = new Date(timeStr);
            mesDetectado = dateObj.getMonth() + 1;
            anioDetectado = dateObj.getFullYear();
        }

        if (!dateObj) return;

        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        if (!empMap.has(name)) {
            empMap.set(name, new Map());
        }
        const userDateMap = empMap.get(name)!;
        if (!userDateMap.has(dateKey)) {
            userDateMap.set(dateKey, {
                dateObj: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
                punches: [],
                empId: acNo || 'N/A'
            });
        }
        userDateMap.get(dateKey)!.punches.push(dateObj);
    });

    const empleadosResumen: EmpleadoResumen[] = [];
    let globalTotalHorasExtras = 0;
    let globalTotalTemprano = 0;
    let globalTotalTarde = 0;

    empMap.forEach((userDateMap, empName) => {
        let empTemprano = 0;
        let empTarde = 0;
        const diasDetalle: DiaDetalle[] = [];
        let empId = 'N/A';

        // Ordenar fechas cronológicamente
        const sortedDateKeys = Array.from(userDateMap.keys()).sort();

        sortedDateKeys.forEach(dateKey => {
            const item = userDateMap.get(dateKey)!;
            empId = item.empId || empId;

            item.punches.sort((a, b) => a.getTime() - b.getTime());
            const primeraEntrada = item.punches[0];
            const ultimaSalida = item.punches[item.punches.length - 1];

            const dayOfWeek = item.dateObj.getDay(); // 0 = Dom, 6 = Sáb, 1..5 = L-V

            // Reglas de horario laboral:
            // Lunes a Viernes: 7:00 AM - 4:00 PM (16:00)
            // Sábado: 7:00 AM - 11:00 AM
            // Domingo: 6:00 AM - 6:00 PM (18:00)
            let startHour = 7;
            let endHour = 16;

            if (dayOfWeek === 6) { // Sábado
                startHour = 7;
                endHour = 11;
            } else if (dayOfWeek === 0) { // Domingo
                startHour = 6;
                endHour = 18;
            }

            const normalEntrada = new Date(primeraEntrada);
            normalEntrada.setHours(startHour, 0, 0, 0);

            const normalSalida = new Date(ultimaSalida);
            normalSalida.setHours(endHour, 0, 0, 0);

            let extrasTemprano = 0;
            let extrasTarde = 0;

            if (primeraEntrada < normalEntrada) {
                extrasTemprano = (normalEntrada.getTime() - primeraEntrada.getTime()) / (1000 * 60 * 60);
            }

            if (item.punches.length > 1 && ultimaSalida > normalSalida) {
                extrasTarde = (ultimaSalida.getTime() - normalSalida.getTime()) / (1000 * 60 * 60);
            }

            const totalExtrasDia = extrasTemprano + extrasTarde;

            empTemprano += extrasTemprano;
            empTarde += extrasTarde;

            const formatTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

            diasDetalle.push({
                fecha: dateKey,
                diaSemana: DIAS_SEMANA[dayOfWeek],
                primeraEntrada: formatTime(primeraEntrada),
                ultimaSalida: item.punches.length > 1 ? formatTime(ultimaSalida) : 'Sin Salida',
                punchesCount: item.punches.length,
                punches: item.punches.map(formatTime),
                extrasTemprano: Number(extrasTemprano.toFixed(2)),
                extrasTarde: Number(extrasTarde.toFixed(2)),
                totalExtras: Number(totalExtrasDia.toFixed(2))
            });
        });

        const totalEmp = empTemprano + empTarde;
        globalTotalTemprano += empTemprano;
        globalTotalTarde += empTarde;
        globalTotalHorasExtras += totalEmp;

        empleadosResumen.push({
            empId,
            nombre: empName,
            diasTrabajados: userDateMap.size,
            horasExtrasTemprano: Number(empTemprano.toFixed(2)),
            horasExtrasTarde: Number(empTarde.toFixed(2)),
            totalHorasExtras: Number(totalEmp.toFixed(2)),
            dias: diasDetalle
        });
    });

    // Ordenar empleados por mayor cantidad de horas extras
    empleadosResumen.sort((a, b) => b.totalHorasExtras - a.totalHorasExtras);

    return {
        resumenJSON: { empleados: empleadosResumen },
        totalEmpleados: empleadosResumen.length,
        totalHorasExtras: Number(globalTotalHorasExtras.toFixed(2)),
        totalExtrasTemprano: Number(globalTotalTemprano.toFixed(2)),
        totalExtrasTarde: Number(globalTotalTarde.toFixed(2)),
        mesDetectado,
        anioDetectado
    };
}

// 1. Procesar y guardar archivo subido
export async function procesarArchivoHoras(formData: FormData) {
    try {
        const { orgId, userId } = await getContextUser();

        const file = formData.get('file') as File | null;
        if (!file || file.size === 0) {
            return { error: 'Por favor selecciona un archivo Excel (.xls / .xlsx).' };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = parsearExcelZKtecoBuffer(buffer);

        if (parsed.totalEmpleados === 0) {
            return { error: 'No se encontraron registros válidos de marcaje en el archivo.' };
        }

        const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const nombreMes = MESES_NOMBRES[parsed.mesDetectado - 1] || 'Mes';
        const titulo = `Control de Horas - ${nombreMes} ${parsed.anioDetectado}`;

        const reporte = await prisma.reporteHorasExtras.create({
            data: {
                organizationId: orgId,
                titulo,
                mes: parsed.mesDetectado,
                anio: parsed.anioDetectado,
                nombreArchivoOriginal: file.name,
                horaEntradaNormal: '07:00',
                horaSalidaNormal: '16:00',
                totalEmpleados: parsed.totalEmpleados,
                totalHorasExtras: parsed.totalHorasExtras,
                totalExtrasTemprano: parsed.totalExtrasTemprano,
                totalExtrasTarde: parsed.totalExtrasTarde,
                resumenJSON: parsed.resumenJSON as any,
                creadoPorId: userId,
                status: 'ACTIVO'
            }
        });

        revalidatePath('/control-horas');
        return { success: true, id: reporte.id, titulo };
    } catch (e: any) {
        console.error('Error procesando archivo de horas:', e);
        return { error: e.message || 'Error al procesar el archivo Excel.' };
    }
}

// 2. Cargar reporte de referencia (Agosto 2026)
export async function cargarReporteReferenciaAgosto() {
    try {
        const { orgId, userId } = await getContextUser();

        const refPath = path.join(process.cwd(), 'referencias/Reporte Horas Agosto Paraiso Floral 2026.xls');
        if (!fs.existsSync(refPath)) {
            return { error: 'El archivo de referencia Agosto 2026 no se encuentra en el servidor.' };
        }

        const buffer = fs.readFileSync(refPath);
        const parsed = parsearExcelZKtecoBuffer(buffer);

        const titulo = `Control de Horas Extras - Agosto 2026 (Paraíso Floral)`;

        const reporte = await prisma.reporteHorasExtras.create({
            data: {
                organizationId: orgId,
                titulo,
                mes: 8,
                anio: 2026,
                nombreArchivoOriginal: 'Reporte Horas Agosto Paraiso Floral 2026.xls',
                horaEntradaNormal: '07:00',
                horaSalidaNormal: '16:00',
                totalEmpleados: parsed.totalEmpleados,
                totalHorasExtras: parsed.totalHorasExtras,
                totalExtrasTemprano: parsed.totalExtrasTemprano,
                totalExtrasTarde: parsed.totalExtrasTarde,
                resumenJSON: parsed.resumenJSON as any,
                creadoPorId: userId,
                status: 'ACTIVO'
            }
        });

        revalidatePath('/control-horas');
        return { success: true, id: reporte.id, titulo };
    } catch (e: any) {
        console.error('Error al cargar reporte de referencia:', e);
        return { error: e.message || 'Error al cargar el reporte de Agosto 2026.' };
    }
}

// 3. Obtener Historial de Reportes
export async function getHistorialReportesHoras() {
    try {
        const { orgId } = await getContextUser();

        const reportes = await prisma.reporteHorasExtras.findMany({
            where: {
                organizationId: orgId,
                status: 'ACTIVO'
            },
            include: {
                creadoPor: {
                    select: {
                        nombre: true,
                        apellido: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return reportes.map(r => ({
            id: r.id,
            titulo: r.titulo,
            mes: r.mes,
            anio: r.anio,
            nombreArchivoOriginal: r.nombreArchivoOriginal || '—',
            totalEmpleados: r.totalEmpleados,
            totalHorasExtras: r.totalHorasExtras,
            totalExtrasTemprano: r.totalExtrasTemprano,
            totalExtrasTarde: r.totalExtrasTarde,
            resumenJSON: r.resumenJSON as unknown as ResumenReporteJSON,
            usuarioCreador: r.creadoPor ? `${r.creadoPor.nombre || ''} ${r.creadoPor.apellido || ''}`.trim() || r.creadoPor.email.split('@')[0] : '—',
            createdAt: r.createdAt.toISOString()
        }));
    } catch (e) {
        console.error('Error al obtener historial de reportes:', e);
        return [];
    }
}

// 4. Anular / Eliminar Lógicamente un Reporte (Trazabilidad ERP)
export async function anularReporteHoras(id: string) {
    try {
        const { orgId, userId } = await getContextUser();

        await prisma.reporteHorasExtras.updateMany({
            where: {
                id,
                organizationId: orgId
            },
            data: {
                status: 'ANULADO',
                anuladaPorId: userId,
                anuladaAt: new Date()
            }
        });

        revalidatePath('/control-horas');
        return { success: true };
    } catch (e: any) {
        console.error('Error anulación reporte:', e);
        return { error: e.message || 'Error al anular el reporte.' };
    }
}
