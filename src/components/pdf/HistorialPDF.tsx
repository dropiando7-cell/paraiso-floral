import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf', fontWeight: 700 },
  ]
});

// Disable word hyphenation globally
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingLeft: 35,
    paddingRight: 35,
    paddingTop: 30,
    paddingBottom: 70, // space for interactive QR footer
    fontFamily: 'Inter',
    fontSize: 8.5,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1e40af',
    paddingBottom: 8,
    marginBottom: 10,
  },
  logo: {
    height: 30,
    width: 85,
    objectFit: 'contain',
  },
  titleContainer: {
    textAlign: 'right',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 7.5,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: 500,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  infoBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 6,
    backgroundColor: '#f9fafb',
  },
  infoTitle: {
    fontWeight: 700,
    fontSize: 8,
    color: '#1e40af',
    marginBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
    lineHeight: 1.15,
  },
  infoLabel: {
    width: 52,
    fontWeight: 700,
    color: '#4b5563',
    fontSize: 7,
    textTransform: 'uppercase',
  },
  infoValue: {
    flex: 1,
    color: '#1f2937',
    fontSize: 7.5,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 3,
  },
  odtCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  odtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.75,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 4,
    marginBottom: 6,
  },
  odtCode: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1e40af',
  },
  odtDate: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 500,
  },
  odtStatus: {
    fontSize: 7.5,
    fontWeight: 700,
    color: '#047857',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  odtBody: {
    flexDirection: 'column',
    gap: 4,
  },
  textLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  textValue: {
    fontSize: 8,
    color: '#1f2937',
    lineHeight: 1.3,
    marginBottom: 4,
  },
  materialsContainer: {
    marginTop: 4,
    padding: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    paddingVertical: 1.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  materialName: {
    color: '#374151',
    fontWeight: 500,
  },
  materialQty: {
    color: '#6b7280',
    fontWeight: 700,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  evidencePhoto: {
    width: 65,
    height: 65,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    objectFit: 'cover',
  },
  commentsContainer: {
    marginTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: '#f3f4f6',
    paddingTop: 4,
  },
  commentRow: {
    fontSize: 7,
    color: '#4b5563',
    lineHeight: 1.25,
    marginBottom: 2,
  },
  commentAuthor: {
    fontWeight: 700,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 35,
    right: 35,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
  footerInteractive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerQr: {
    width: 32,
    height: 32,
  },
  footerQrText: {
    fontSize: 6.5,
    color: '#6b7280',
    fontWeight: 500,
    width: 110,
    lineHeight: 1.1,
  },
  signaturesContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#f3f4f6',
    paddingTop: 6,
  },
  signatureCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 4,
    backgroundColor: '#f9fafb',
  },
  signatureTitle: {
    fontSize: 6.5,
    fontWeight: 700,
    color: '#4b5563',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  signatureImage: {
    height: 35,
    width: '100%',
    objectFit: 'contain',
    marginVertical: 2,
  },
  signatureFooter: {
    fontSize: 5.5,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  tiemposContainer: {
    marginTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#f3f4f6',
    paddingTop: 4,
  },
  tiempoRow: {
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.3,
    marginBottom: 2,
  }
});

type HistorialPDFProps = {
  activo: any;
  logoUrl?: string;
  qrCodeUrl: string;
};

const parseHtmlToReactPdf = (html: string | null | undefined, style: any) => {
  if (!html) return null;
  
  if (!html.includes('<')) {
    return <Text style={style}>{html}</Text>;
  }
  
  let formatted = html;
  formatted = formatted.replace(/<li>\s*<p>/g, '\n • ');
  formatted = formatted.replace(/<li>/g, '\n • ');
  formatted = formatted.replace(/<\/li>/g, '');
  formatted = formatted.replace(/<\/p>/g, '\n');
  formatted = formatted.replace(/<br\s*\/?>/g, '\n');
  
  formatted = formatted.replace(/<[^>]*>/g, '');
  
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
  formatted = formatted.replace(/^\s*\n/g, ''); 
  formatted = formatted.replace(/\n\s*$/g, ''); 
  
  if (formatted.trim() === '') return null;
  
  return <Text style={style}>{formatted}</Text>;
};

const formatHN = (dateInput: Date | string | null | undefined, includeTime: boolean = false) => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  // Honduras is UTC-6, so we shift by -6 hours
  const shiftedDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  
  const day = String(shiftedDate.getUTCDate()).padStart(2, '0');
  const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
  const year = shiftedDate.getUTCFullYear();

  if (includeTime) {
    let hours = shiftedDate.getUTCHours();
    const minutes = String(shiftedDate.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
  }

  return `${day}/${month}/${year}`;
};

export default function HistorialPDF({ activo, logoUrl, qrCodeUrl }: HistorialPDFProps) {
  const cliente = activo.cliente || {};
  const ordenes = activo.ordenesTrabajo || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header} fixed>
          {logoUrl ? (
            <Image style={styles.logo} src={logoUrl} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#1e40af' }}>BIOELECTRÓNICA</Text>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Historial de Mantenimiento</Text>
            <Text style={styles.subTitle}>Reporte Técnico de Activos y Servicios</Text>
          </View>
        </View>

        {/* Client & Equipment Block */}
        <View style={styles.infoSection}>
          {/* Client Details */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Cliente Propietario</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{cliente.nombre || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{cliente.telefono || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ubicación:</Text>
              <Text style={styles.infoValue}>{cliente.direccion || 'N/A'}</Text>
            </View>
          </View>

          {/* Equipment Details */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Especificaciones del Equipo</Text>
            <View style={{ flexDirection: 'column', gap: 3.5 }}>
              {/* Fila 1 */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ flex: 1.15, flexDirection: 'row' }}>
                  <Text style={styles.infoLabel}>Equipo:</Text>
                  <Text style={styles.infoValue}>{activo.descripcionCorta}</Text>
                </View>
                <View style={{ flex: 0.85, flexDirection: 'row' }}>
                  <Text style={[styles.infoLabel, { width: 18 }]}>QR:</Text>
                  <Text style={[styles.infoValue, { fontWeight: 700 }]}>{activo.idQr}</Text>
                </View>
              </View>
              {/* Fila 2 */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ flex: 1.15, flexDirection: 'row' }}>
                  <Text style={styles.infoLabel}>Marca/Mod:</Text>
                  <Text style={styles.infoValue}>{[activo.marca, activo.modelo].filter(Boolean).join(" ") || 'N/A'}</Text>
                </View>
                <View style={{ flex: 0.85, flexDirection: 'row' }}>
                  <Text style={styles.infoLabel}>F. Registro:</Text>
                  <Text style={styles.infoValue}>
                    {formatHN(activo.fechaAdq || activo.createdAt)}
                  </Text>
                </View>
              </View>
              {/* Fila 3 */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ flex: 1.15, flexDirection: 'row' }}>
                  <Text style={styles.infoLabel}>N° Serie:</Text>
                  <Text style={[styles.infoValue, { fontFamily: 'Courier' }]}>{activo.serie || 'N/A'}</Text>
                </View>
                <View style={{ flex: 0.85, flexDirection: 'row' }}>
                  <Text style={styles.infoLabel}>Registrado:</Text>
                  <Text style={styles.infoValue}>
                    {activo.createdBy ? [activo.createdBy.nombre || '', activo.createdBy.apellido || ''].filter(Boolean).join(" ").toUpperCase() : 'SISTEMA'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Service Timeline */}
        <Text style={styles.sectionTitle}>Cronología de Servicios Realizados</Text>

        {ordenes.length === 0 ? (
          <Text style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>
            No se registran órdenes de trabajo previas para este equipo.
          </Text>
        ) : (
          ordenes.map((orden: any) => {
            const task = orden.kanbanTasks?.[0];
            const attachments = task?.attachments || [];
            
            // Filter out images that are already present in fotosEstadoInicial to prevent duplication
            const receptionUrls = new Set(orden.fotosEstadoInicial || []);
            const imageAttachments = attachments.filter((att: any) => {
              const isImg = att.tipo?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png)$/i);
              return isImg && !receptionUrls.has(att.url);
            });
            const comments = task?.comments || [];

            return (
              <View key={orden.id} style={styles.odtCard} wrap={false}>
                {/* ODT Header */}
                <View style={styles.odtHeader}>
                  <Text style={styles.odtCode}>Orden #{orden.codigoSeguridad}</Text>
                  <Text style={styles.odtDate}>Fecha: {formatHN(orden.fechaRecibido)}</Text>
                  <Text style={styles.odtStatus}>{orden.leyendaEstado || orden.estado}</Text>
                </View>

                {/* ODT Body */}
                <View style={styles.odtBody}>
                  {/* Falla */}
                  <Text style={styles.textLabel}>Descripción del Trabajo / Falla Reportada:</Text>
                  {parseHtmlToReactPdf(orden.descripcionFalla, styles.textValue)}

                  {/* Diagnóstico */}
                  {orden.diagnosticoTecnico && (
                    <>
                      <Text style={styles.textLabel}>Diagnóstico Técnico:</Text>
                      {parseHtmlToReactPdf(orden.diagnosticoTecnico, styles.textValue)}
                    </>
                  )}

                  {/* Materiales */}
                  {orden.repuestos && orden.repuestos.length > 0 && (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={styles.textLabel}>Materiales / Repuestos Utilizados:</Text>
                      <View style={styles.materialsContainer}>
                        {orden.repuestos.map((rep: any) => (
                          <View key={rep.id} style={styles.materialRow}>
                            <Text style={styles.materialName}>{rep.descripcion}</Text>
                            <Text style={styles.materialQty}>Cant: {rep.cantidad}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Kanban Slack-like execution comments */}
                  {comments.length > 0 && (
                    <View style={styles.commentsContainer} wrap={false}>
                      <Text style={styles.textLabel}>Comentarios de Trabajo en Campo:</Text>
                      {comments.slice(0, 3).map((com: any) => (
                        <Text key={com.id} style={styles.commentRow}>
                          <Text style={styles.commentAuthor}>{com.usuario?.nombre || 'Técnico'}: </Text>
                          {com.contenido}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Evidencias fotográficas (Estado Inicial) */}
                  {orden.fotosEstadoInicial && orden.fotosEstadoInicial.length > 0 && (
                    <View style={{ marginTop: 4, marginBottom: 4 }} wrap={false}>
                      <Text style={styles.textLabel}>Fotos de Evidencia de Recepción:</Text>
                      <View style={styles.imagesGrid}>
                        {orden.fotosEstadoInicial.slice(0, 6).map((imgUrl: string, idx: number) => (
                          <Image key={idx} style={styles.evidencePhoto} src={imgUrl} />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Evidencias fotográficas */}
                  {imageAttachments.length > 0 && (
                    <View style={{ marginTop: 4 }} wrap={false}>
                      <Text style={styles.textLabel}>Fotos de Evidencia en Campo:</Text>
                      <View style={styles.imagesGrid}>
                        {imageAttachments.slice(0, 6).map((img: any) => (
                          <Image key={img.id} style={styles.evidencePhoto} src={img.url} />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Tiempo Laborado */}
                  {orden.tiempos && orden.tiempos.length > 0 && (
                    <View style={styles.tiemposContainer} wrap={false}>
                      <Text style={styles.textLabel}>Tiempo Laborado:</Text>
                      {orden.tiempos.map((tmp: any) => {
                        const duracionHrs = Math.floor((tmp.duracion || 0) / 60);
                        const duracionMins = (tmp.duracion || 0) % 60;
                        const durationStr = duracionHrs > 0 
                          ? `${duracionHrs} h y ${duracionMins} min`
                          : `${duracionMins} min`;
                        const dateStr = formatHN(tmp.inicio, true);
                        return (
                          <Text key={tmp.id} style={styles.tiempoRow}>
                            {dateStr} - {durationStr} por {tmp.tecnico?.nombre || ''} {tmp.tecnico?.apellido || ''}
                          </Text>
                        );
                      })}
                    </View>
                  )}

                  {/* Firmas de Aceptación */}
                  {(orden.firmaClienteUrl || orden.firmaTecnicoUrl) && (
                    <View style={styles.signaturesContainer} wrap={false}>
                      {orden.firmaClienteUrl && (
                        <View style={styles.signatureCard}>
                          <Text style={styles.signatureTitle}>4. Firma Cliente</Text>
                          <Image style={styles.signatureImage} src={orden.firmaClienteUrl} />
                          <Text style={styles.signatureFooter}>
                            {orden.firmaClienteFecha ? formatHN(orden.firmaClienteFecha, true) : ''} Por {orden.firmaClienteNombre || 'Cliente'}
                          </Text>
                        </View>
                      )}
                      {orden.firmaTecnicoUrl && (
                        <View style={styles.signatureCard}>
                          <Text style={styles.signatureTitle}>5. Firma Técnico / Biomédico</Text>
                          <Image style={styles.signatureImage} src={orden.firmaTecnicoUrl} />
                          <Text style={styles.signatureFooter}>
                            {orden.firmaTecnicoFecha ? formatHN(orden.firmaTecnicoFecha, true) : ''} Por {orden.firmaTecnicoNombre || 'Técnico'}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Footer (page and interactive QR footer) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Bioelectrónica Honduras — Reporte generado automáticamente
          </Text>
          <View style={styles.footerInteractive}>
            <Text style={styles.footerQrText}>
              Escanea para ver evidencias multimedia (audio, video, fotos HD) en línea
            </Text>
            {qrCodeUrl ? (
              <Image style={styles.footerQr} src={qrCodeUrl} />
            ) : null}
          </View>
        </View>

      </Page>
    </Document>
  );
}
