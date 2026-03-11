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
 * Calcula los meses completos entre dos fechas.
 */
function mesesEntre(desde: Date, hasta: Date): number {
    const anios = hasta.getFullYear() - desde.getFullYear();
    const meses = hasta.getMonth() - desde.getMonth();
    return Math.max(0, anios * 12 + meses);
}

/**
 * Calcula la depreciación de un activo fijo según la Ley hondureña.
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
    const meses = mesesEntre(fechaAdq, hoy);
    const mesesTotales = vidaUtilAnios * 12;

    // Art. 8°: valor residual = 1% del costo original
    const valResidual = parseFloat((costoAdq * 0.01).toFixed(2));
    const baseDeprec = parseFloat((costoAdq - valResidual).toFixed(2));
    const deprecMensual = parseFloat((baseDeprec / mesesTotales).toFixed(4));

    // Depreciación acumulada: no puede superar la base depreciable
    const deprecAcumRaw = deprecMensual * meses;
    const deprecAcum = parseFloat(Math.min(deprecAcumRaw, baseDeprec).toFixed(2));

    // Valor en libros: no puede bajar del valor residual
    const valorLibrosRaw = costoAdq - deprecAcum;
    const valorLibros = parseFloat(Math.max(valorLibrosRaw, valResidual).toFixed(2));

    return { valResidual, baseDeprec, deprecMensual, deprecAcum, valorLibros };
}
