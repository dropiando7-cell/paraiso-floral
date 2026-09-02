import XLSX from 'xlsx';
import path from 'path';

const filename = path.join(process.cwd(), 'referencias/Reporte Horas Agosto Paraiso Floral 2026.xls');
const wb = XLSX.readFile(filename);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(sheet) as any[];

console.log('Filas leídas:', rawData.length);

const empRecords = new Map<string, Map<string, { date: Date; punches: Date[] }>>();

rawData.forEach(row => {
    const name = String(row['Name'] || '').trim();
    const acNo = String(row['AC-No.'] || '').trim();
    const timeStr = String(row['Time'] || '').trim();

    if (!name || !timeStr) return;

    const parts = timeStr.split(' ');
    if (parts.length < 2) return;
    const [d, m, y] = parts[0].split('/').map(Number);
    const [hh, mm] = parts[1].split(':').map(Number);

    if (!d || !m || !y || isNaN(hh) || isNaN(mm)) return;

    const punchDate = new Date(y, m - 1, d, hh, mm);
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (!empRecords.has(name)) {
        empRecords.set(name, new Map());
    }
    const dateMap = empRecords.get(name)!;
    if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: new Date(y, m - 1, d), punches: [] });
    }
    dateMap.get(dateKey)!.punches.push(punchDate);
});

console.log('\n================ REPORTE CON REGLAS ACTUALIZADAS (L-V: 7-16, Sáb: 7-11, Dom: 6-18) ================');

empRecords.forEach((dateMap, empName) => {
    let totalHorasExtrasTemprano = 0;
    let totalHorasExtrasTarde = 0;
    let totalDiasTrabajados = dateMap.size;

    dateMap.forEach(({ date, punches }) => {
        punches.sort((a, b) => a.getTime() - b.getTime());
        const primeraEntrada = punches[0];
        const ultimaSalida = punches[punches.length - 1];

        const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado, 1-5 = L-V

        let startHour = 7;
        let endHour = 16;

        if (dayOfWeek === 6) {
            // Sábado
            startHour = 7;
            endHour = 11;
        } else if (dayOfWeek === 0) {
            // Domingo
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

        if (punches.length > 1 && ultimaSalida > normalSalida) {
            extrasTarde = (ultimaSalida.getTime() - normalSalida.getTime()) / (1000 * 60 * 60);
        }

        totalHorasExtrasTemprano += extrasTemprano;
        totalHorasExtrasTarde += extrasTarde;
    });

    const totalExtras = totalHorasExtrasTemprano + totalHorasExtrasTarde;
    console.log(`Empleado: ${empName.padEnd(20)} | Días: ${String(totalDiasTrabajados).padStart(2)} | Antes Inicio: ${totalHorasExtrasTemprano.toFixed(2)}h | Después Cierre: ${totalHorasExtrasTarde.toFixed(2)}h | TOTAL EXTRAS: ${totalExtras.toFixed(2)}h`);
});
