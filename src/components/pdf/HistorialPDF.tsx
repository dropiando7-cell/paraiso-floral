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
    paddingBottom: 10,
    marginBottom: 15,
  },
  logo: {
    height: 35,
    width: 90,
    objectFit: 'contain',
  },
  titleContainer: {
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: 500,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  infoBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  infoTitle: {
    fontWeight: 700,
    fontSize: 8.5,
    color: '#1e40af',
    marginBottom: 5,
    borderBottomWidth: 0.75,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
    lineHeight: 1.2,
  },
  infoLabel: {
    width: 60,
    fontWeight: 700,
    color: '#4b5563',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    flex: 1,
    color: '#1f2937',
    fontSize: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
    marginBottom: 10,
    marginTop: 5,
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
  }
});

type HistorialPDFProps = {
  activo: any;
  logoUrl?: string;
  qrCodeUrl: string;
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Equipo:</Text>
              <Text style={styles.infoValue}>{activo.descripcionCorta}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Marca/Mod:</Text>
              <Text style={styles.infoValue}>{[activo.marca, activo.modelo].filter(Boolean).join(" ") || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>N° Serie:</Text>
              <Text style={[styles.infoValue, { fontFamily: 'Courier' }]}>{activo.serie || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Código QR:</Text>
              <Text style={[styles.infoValue, { fontWeight: 700 }]}>{activo.idQr}</Text>
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
            // filter only images
            const imageAttachments = attachments.filter((att: any) => 
              att.tipo?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png)$/i)
            );
            const comments = task?.comments || [];

            return (
              <View key={orden.id} style={styles.odtCard} wrap={false}>
                {/* ODT Header */}
                <View style={styles.odtHeader}>
                  <Text style={styles.odtCode}>Orden #{orden.codigoSeguridad}</Text>
                  <Text style={styles.odtDate}>Fecha: {new Date(orden.fechaRecibido).toLocaleDateString()}</Text>
                  <Text style={styles.odtStatus}>{orden.estado}</Text>
                </View>

                {/* ODT Body */}
                <View style={styles.odtBody}>
                  {/* Falla */}
                  <Text style={styles.textLabel}>Falla Reportada:</Text>
                  <Text style={styles.textValue}>{orden.descripcionFalla}</Text>

                  {/* Diagnóstico */}
                  {orden.diagnosticoTecnico && (
                    <>
                      <Text style={styles.textLabel}>Diagnóstico Técnico:</Text>
                      <Text style={styles.textValue}>{orden.diagnosticoTecnico}</Text>
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
                    <View style={styles.commentsContainer}>
                      <Text style={styles.textLabel}>Comentarios de Trabajo en Campo:</Text>
                      {comments.slice(0, 3).map((com: any) => (
                        <Text key={com.id} style={styles.commentRow}>
                          <Text style={styles.commentAuthor}>{com.usuario?.nombre || 'Técnico'}: </Text>
                          {com.contenido}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Evidencias fotográficas */}
                  {imageAttachments.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.textLabel}>Fotos de Evidencia en Campo:</Text>
                      <View style={styles.imagesGrid}>
                        {imageAttachments.slice(0, 6).map((img: any) => (
                          <Image key={img.id} style={styles.evidencePhoto} src={img.url} />
                        ))}
                      </View>
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
