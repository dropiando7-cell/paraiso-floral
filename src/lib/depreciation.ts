/**
 * depreciacion.ts — Cálculo de depreciación por Línea Recta
 * Basado en: Acuerdo Nº1, Reglamento Especial de Depreciaciones, Honduras
 *
 * Reglas clave:
 *  - Art. 8°: Valor Residual = 1% del costo original (activo no se deprecia más allá)
 *  - Art. 11°: Activos usados → Vida Útil = VidaUtil_nuevo × (2/3)
 *  - Frecuencia: por MESES COMPLETOS transcurridos desde fechaAdq hasta hoy
 */

export interface DepreciacionInput {
    costoAdq: number;         // Costo de adquisición en lempiras
    fechaAdq: Date;           // Fecha de adquisición
    vidaUtilAnios: number;    // Vida útil en años (ya resuelto por el llamador)
    esUsado?: boolean;        // Si es activo de segunda mano (Art. 11°)
}

export interface DepreciacionResult {
    valResidual: number;    // Costo × 1%
    baseDeprec: number;     // Costo - valResidual
    deprecMensual: number;  // baseDeprec ÷ (vidaUtil × 12)
    deprecAcum: number;     // deprecMensual × mesesTranscurridos (tope: baseDeprec)
    valorLibros: number;    // Costo - deprecAcum (mínimo: valResidual)
}

/**
 * Calcula los días transcurridos bajo la convención comercial 30/360.
 * Cada mes se considera de 30 días y el año de 360 días.
 */
function diasComerciales360(desde: Date, hasta: Date): number {
    const y1 = desde.getFullYear();
    const m1 = desde.getMonth() + 1; // getMonth() es 0-11
    const d1 = Math.min(desde.getDate(), 30); // Si es 31, tratar como 30

    const y2 = hasta.getFullYear();
    const m2 = hasta.getMonth() + 1;
    const d2 = Math.min(hasta.getDate(), 30);

    const dias = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
    return Math.max(0, dias);
}

/**
 * Calcula la depreciación de un activo fijo según la Ley hondureña y Calendario Comercial.
 * Retorna null si los datos son insuficientes para calcular.
 */
export function calcDepreciacion(input: DepreciacionInput): DepreciacionResult | null {
    const { costoAdq, fechaAdq, esUsado = false } = input;
    let { vidaUtilAnios } = input;

    if (!costoAdq || costoAdq <= 0 || !fechaAdq || !vidaUtilAnios || vidaUtilAnios <= 0) {
        return null;
    }

    // Art. 11°: activos usados se deprecian en 2/3 de la vida útil
    if (esUsado) {
        vidaUtilAnios = vidaUtilAnios * (2 / 3);
    }

    const hoy = new Date();
    const diasTranscurridos = diasComerciales360(fechaAdq, hoy);
    const diasTotales = vidaUtilAnios * 360; // 360 días por año comercial

    // Art. 8°: valor residual = 1% del costo original
    const valResidual = parseFloat((costoAdq * 0.01).toFixed(2));
    const baseDeprec = parseFloat((costoAdq - valResidual).toFixed(2));

    // Factor diario redondeado a 4 decimales (coincidir con Excel)
    const factorDiario = parseFloat((baseDeprec / diasTotales).toFixed(4));

    // Depreciación acumulada: no puede superar la base depreciable
    const deprecAcumRaw = factorDiario * diasTranscurridos;
    const deprecAcum = parseFloat(Math.min(deprecAcumRaw, baseDeprec).toFixed(2));

    // Valor en libros: no puede bajar del valor residual
    const valorLibrosRaw = costoAdq - deprecAcum;
    const valorLibros = parseFloat(Math.max(valorLibrosRaw, valResidual).toFixed(2));

    return { valResidual, baseDeprec, deprecMensual: factorDiario, deprecAcum, valorLibros };
}

