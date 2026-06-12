import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/rsms/inter@3.19/docs/font-files/Inter-Regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/gh/rsms/inter@3.19/docs/font-files/Inter-Medium.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/gh/rsms/inter@3.19/docs/font-files/Inter-Bold.ttf', fontWeight: 700 },
  ]
});

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    height: 60,
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.3,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e40af',
  },
  odeCorrelativo: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e40af',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoBlock: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  infoTitle: {
    fontWeight: 700,
    fontSize: 9,
    color: '#1e40af',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  infoLabel: {
    fontWeight: 700,
    width: '32%',
    color: '#4b5563',
    fontSize: 8,
  },
  infoValue: {
    width: '68%',
    color: '#1f2937',
    fontSize: 8,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    fontWeight: 700,
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    minHeight: 22,
  },
  thCol: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  tdCol: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  colNo: { width: '8%' },
  colQty: { width: '8%', textAlign: 'center' },
  colDesc: { width: '38%' },
  colBrand: { width: '16%' },
  colModel: { width: '14%' },
  colSerie: { width: '16%' },
  
  diagnosticoBox: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  diagnosticoTitle: {
    fontWeight: 700,
    color: '#b45309',
    marginBottom: 4,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  diagnosticoText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.3,
  },

  evidenciasTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  evidenciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  evidenciaContainer: {
    width: '48%',
    height: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenciaImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 15,
    marginBottom: 30,
  },
  signatureCol: {
    width: '45%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    marginTop: 40,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#1f2937',
  },
  signatureSubLabel: {
    fontSize: 7,
    color: '#4b5563',
    marginTop: 2,
    textAlign: 'center',
  },
  clientInputs: {
    width: '100%',
    marginTop: 4,
    fontSize: 7,
    color: '#4b5563',
    lineHeight: 1.4,
  },

  blueFranja: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e40af',
    color: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    fontSize: 7,
    textAlign: 'center',
    lineHeight: 1.3,
  }
});

interface OrdenEntregaPDFProps {
  data: any;
  images: Record<string, string>;
}

export default function OrdenEntregaPDF({ data, images }: OrdenEntregaPDFProps) {
  const {
    organization, settings, docNumber, selectedClient, lineItems, today, ordenEntrega, ordenTrabajo
  } = data;

  const validItems = lineItems?.filter((item: any) => !item.isSection) || [];

  // Recopilar fotos de evidencia en las imágenes pre-cargadas
  const evidenciaImages = Object.keys(images)
    .filter(key => key.startsWith('evidencia_'))
    .map(key => images[key]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {images['logo'] ? (
              <Image src={images['logo']} style={styles.logo} />
            ) : (
              <View style={{ height: 60, width: 100, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8, color: '#9ca3af' }}>Bioelectrónica</Text>
              </View>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{organization?.name || 'BIOELECTRÓNICA HONDURAS'}</Text>
            <Text>San Pedro Sula, Cortés, Honduras</Text>
            <Text>Correo: {organization?.correoContacto || 'soporte@bioelectronicahn.com'}</Text>
            <Text>Teléfono: {organization?.telefono || '+504 9999-0000'}</Text>
            {organization?.rtn && <Text>RTN: {organization.rtn}</Text>}
          </View>
        </View>

        {/* Title Block */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>ORDEN DE ENTREGA DE EQUIPO</Text>
          <Text style={styles.odeCorrelativo}>{ordenEntrega?.correlativo || 'ODE-PENDIENTE'}</Text>
        </View>

        {/* Info Grid */}
        <View style={styles.infoSection}>
          {/* Client Block */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Información del Cliente</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{selectedClient?.name || 'Cliente Particular'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RTN / ID:</Text>
              <Text style={styles.infoValue}>{selectedClient?.rtn || 'Sin registro'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{selectedClient?.phone || 'Sin registro'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dirección:</Text>
              <Text style={styles.infoValue}>{selectedClient?.address || 'San Pedro Sula'}</Text>
            </View>
          </View>

          {/* Transaction Block */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Trazabilidad de Venta / Servicio</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento:</Text>
              <Text style={styles.infoValue}>Factura / Proforma {docNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Venta:</Text>
              <Text style={styles.infoValue}>{today}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendido Por:</Text>
              <Text style={styles.infoValue}>{data.nombreUsuario || 'Asesor Comercial'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Despacho:</Text>
              <Text style={styles.infoValue}>Taller Principal SPS</Text>
            </View>
          </View>
        </View>

        {/* Table of Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCol, styles.colNo]}>No.</Text>
            <Text style={[styles.thCol, styles.colQty]}>Cant.</Text>
            <Text style={[styles.thCol, styles.colDesc, { textAlign: 'left' }]}>Descripción del Equipo</Text>
            <Text style={[styles.thCol, styles.colBrand]}>Marca</Text>
            <Text style={[styles.thCol, styles.colModel]}>Modelo</Text>
            <Text style={[styles.thCol, styles.colSerie]}>No. Serie</Text>
          </View>

          {validItems.map((item: any, idx: number) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdCol, styles.colNo, { textAlign: 'center' }]}>{idx + 1}</Text>
              <Text style={[styles.tdCol, styles.colQty, { textAlign: 'center' }]}>{item.qty}</Text>
              <Text style={[styles.tdCol, styles.colDesc]}>{item.shortDesc}</Text>
              <Text style={[styles.tdCol, styles.colBrand, { textAlign: 'center' }]}>{item.marca || 'N/A'}</Text>
              <Text style={[styles.tdCol, styles.colModel, { textAlign: 'center' }]}>{item.modelo || 'N/A'}</Text>
              <Text style={[styles.tdCol, styles.colSerie, { textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{item.serie || 'N/A'}</Text>
            </View>
          ))}
        </View>

        {/* Technical Diagnosis section if linked to SUPPORT ticket */}
        {ordenTrabajo?.diagnosticoTecnico && (
          <View style={styles.diagnosticoBox} wrap={false}>
            <Text style={styles.diagnosticoTitle}>Diagnóstico Técnico de Soporte</Text>
            <Text style={styles.diagnosticoText}>{ordenTrabajo.diagnosticoTecnico}</Text>
          </View>
        )}

        {/* Delivery Evidence Images */}
        {evidenciaImages.length > 0 && (
          <View wrap={false}>
            <Text style={styles.evidenciasTitle}>Evidencias Fotográficas de Entrega</Text>
            <View style={styles.evidenciasGrid}>
              {evidenciaImages.map((foto, i) => (
                <View key={i} style={styles.evidenciaContainer}>
                  <Image src={foto} style={styles.evidenciaImage} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesContainer} wrap={false}>
          {/* Bioelectrónica Autorizada */}
          <View style={styles.signatureCol}>
            {images['sig_emilia'] && (
              <Image src={images['sig_emilia']} style={{ height: 40, objectFit: 'contain', marginBottom: -25 }} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Ing. Emilia Zapata</Text>
            <Text style={styles.signatureSubLabel}>Jefa del Departamento de Biomédica</Text>
            <Text style={styles.signatureSubLabel}>Bioelectrónica Honduras</Text>
          </View>

          {/* Client Signature */}
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma de Recibido Conforme</Text>
            <View style={styles.clientInputs}>
              <Text>Nombre Cliente: ____________________________________</Text>
              <Text style={{ marginTop: 4 }}>ID / Identidad: _____________________________________</Text>
              <Text style={{ marginTop: 4 }}>Teléfono / Celular: __________________________________</Text>
            </View>
          </View>
        </View>

        {/* Blue Footer */}
        <View style={styles.blueFranja} fixed>
          <Text>BIOELECTRÓNICA HONDURAS - SOLUCIONES MÉDICAS E INDUSTRIALES</Text>
          <Text>Dirección: Barrio Guamilito, 8 Calle entre 6 y 7 Ave, San Pedro Sula, Cortés</Text>
          <Text>Tel: +504 9999-0000 | Correo: soporte@bioelectronicahn.com | Web: www.bioelectronicahn.com</Text>
        </View>
      </Page>
    </Document>
  );
}
