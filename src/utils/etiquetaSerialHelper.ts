/**
 * Utilidad compartida (Cliente y Servidor) para interpretar códigos de etiquetas:
 * Soporta tanto etiquetas maestras (ej. "010055", "PF-010055")
 * como etiquetas hijas serializadas (ej. "010055-0001", "010055-0142").
 */
export interface ParsedCodigoEtiqueta {
  raw: string;
  clean: string;
  isSerial: boolean;
  codigoSerial: string;
  codigoPadre: string;
  correlativo: number | null;
}

export function parseCodigoEtiqueta(rawCode: string): ParsedCodigoEtiqueta {
  const raw = (rawCode || '').trim();
  const clean = raw.replace(/^PF-/i, '').trim();

  // Detectar sufijo serializado de 4 o más dígitos (ej. 010055-0001)
  const match = clean.match(/^(.+)-(\d{4,})$/);
  if (match) {
    const codigoPadre = match[1].trim();
    const correlativo = parseInt(match[2], 10);
    return {
      raw,
      clean,
      isSerial: true,
      codigoSerial: `${codigoPadre}-${match[2]}`,
      codigoPadre,
      correlativo: isNaN(correlativo) ? null : correlativo,
    };
  }

  return {
    raw,
    clean,
    isSerial: false,
    codigoSerial: clean,
    codigoPadre: clean,
    correlativo: null,
  };
}

/**
 * Formatea un código padre y su correlativo en una etiqueta hija única.
 * Ejemplo: ("010055", 1) -> "010055-0001"
 */
export function formatCodigoSerial(codigoPadre: string, correlativo: number): string {
  const base = (codigoPadre || '000000').trim().replace(/^PF-/i, '');
  const suffix = String(Math.max(1, correlativo)).padStart(4, '0');
  return `${base}-${suffix}`;
}
