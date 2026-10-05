/**
 * Genera el nombre de archivo estandarizado para descargas de PDF.
 * Formato solicitado: CLIENTE-NOMBRE-CORRELATIVO.pdf
 * Ejemplo: FLORISTERIA-VANESA-MATUTE-000-001-01-00003255.pdf
 */
export function getInvoicePDFFileName(
  clienteNombre?: string | null,
  correlativo?: string | null,
  docType?: string
): string {
  const cleanClient = (clienteNombre || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Elimina caracteres especiales que causan problemas en nombres de archivo
    .replace(/\s+/g, '-') // Reemplaza espacios por guiones
    .replace(/-+/g, '-') // Colapsa múltiples guiones seguidos
    .replace(/^-|-$/g, '') // Elimina guiones iniciales o finales
    .toUpperCase();

  const cleanCorrelativo = (correlativo || 'DOCUMENTO')
    .trim()
    .replace(/\s+/g, '-');

  if (cleanClient) {
    return `${cleanClient}-${cleanCorrelativo}.pdf`;
  }

  const typeLabel = docType ? docType.toUpperCase() : 'FACTURA';
  return `${typeLabel}-${cleanCorrelativo}.pdf`;
}
