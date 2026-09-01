/**
 * Formatea nombres de productos para la recepción de floristería CEDI.
 * - Si es GYPSOPHILA / GYPSO... -> agrega prefijo "Baby Breath" (ej. "Baby Breath - GYPSOPHILA OVERTIME")
 * - Si es HYD / HYDRANGEA... -> agrega prefijo "Hortensia" (ej. "Hortensia - HYD WHITE")
 */
export function formatNombreProductoRecepcion(nombre: string | null | undefined): string {
    if (!nombre) return '';
    const trimmed = nombre.trim();
    if (!trimmed) return '';

    // Evitar duplicar si ya inicia con "Baby Breath" u "Hortensia"
    if (/^baby\s*breath/i.test(trimmed) || /^hortensia/i.test(trimmed)) {
        return trimmed;
    }

    // Regla GYPSOPHILA -> Baby Breath
    if (/^gyp/i.test(trimmed) || /gypsophila/i.test(trimmed)) {
        return `Baby Breath - ${trimmed}`;
    }

    // Regla HYD / HYDRANGEA -> Hortensia
    if (/^hyd/i.test(trimmed) || /hydrangea/i.test(trimmed)) {
        return `Hortensia - ${trimmed}`;
    }

    return trimmed;
}

/**
 * Coincidencia flexible de búsqueda para flores con soporte de alias CEDI:
 * - "baby breath", "baby", "gypsophila", "gyp"
 * - "hortensia", "hyd", "hydrangea"
 */
export function matchProductoRecepcion(textoObjeto: string | null | undefined, query: string): boolean {
    if (!query || !query.trim()) return true;
    if (!textoObjeto) return false;

    const q = query.toLowerCase().trim();
    const textoOriginal = textoObjeto.toLowerCase().trim();
    const textoFormateado = formatNombreProductoRecepcion(textoObjeto).toLowerCase().trim();

    if (textoOriginal.includes(q) || textoFormateado.includes(q)) return true;

    // Alias Gypsophila <-> Baby Breath
    const esQueryBaby = q.includes('baby') || q.includes('breath') || q.includes('gyp');
    const esTextoGyps = textoOriginal.includes('gyp') || textoOriginal.includes('gypsophila') || textoFormateado.includes('baby');
    if (esQueryBaby && esTextoGyps) return true;

    // Alias HYD <-> Hortensia
    const esQueryHortensia = q.includes('hortensia') || q.includes('hyd') || q.includes('hydrangea');
    const esTextoHyd = textoOriginal.includes('hyd') || textoOriginal.includes('hydrangea') || textoFormateado.includes('hortensia');
    if (esQueryHortensia && esTextoHyd) return true;

    return false;
}
