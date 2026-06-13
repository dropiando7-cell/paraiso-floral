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

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingLeft: 60,
    paddingRight: 60,
    paddingTop: 40,
    paddingBottom: 80, // Space for footer
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    height: 60,
    width: 140,
    objectFit: 'contain',
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: '#0d608e',
    textTransform: 'uppercase',
  },
  sectionTitleContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#000000',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  infoCol: {
    width: '48%',
    flexDirection: 'column',
  },
  infoDivider: {
    width: 0.75,
    backgroundColor: '#000000',
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    minHeight: 18,
  },
  fieldLabelContainer: {
    width: 74,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingBottom: 1,
  },
  fieldLabelText: {
    fontSize: 10,
    fontWeight: 500,
    color: '#000000',
    textTransform: 'uppercase',
  },
  fieldValueContainer: {
    flex: 1,
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 1,
    marginLeft: 6,
    minHeight: 12,
  },
  fieldValueText: {
    fontSize: 10,
    color: '#000000',
  },
  table: {
    width: '100%',
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    borderLeftWidth: 0.75,
    borderLeftColor: '#000000',
    borderRightWidth: 0.75,
    borderRightColor: '#000000',
    marginTop: 12,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    minHeight: 28,
  },
  tableCell: {
    borderRightWidth: 0.75,
    borderRightColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 10.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    color: '#000000',
    textAlign: 'center',
  },
  tdText: {
    fontSize: 10,
    color: '#000000',
    textAlign: 'center',
  },
  colNo: { width: '7.5%' },
  colSerie: { width: '24%' },
  colDesc: { width: '44%' },
  colQty: { width: '24.5%', borderRightWidth: 0 },

  warrantyBlock: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginTop: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
    width: '100%',
  },
  warrantyText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#000000',
    textTransform: 'uppercase',
  },
  diagnosticoBox: {
    borderWidth: 0.75,
    borderColor: '#000000',
    padding: 10,
    marginBottom: 16,
    width: '100%',
  },
  diagnosticoTitle: {
    fontWeight: 700,
    color: '#000000',
    marginBottom: 4,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  diagnosticoText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.3,
  },
  evidenciasTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
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
    borderWidth: 0.75,
    borderColor: '#000000',
    overflow: 'hidden',
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
    marginBottom: 20,
  },
  signatureCol: {
    width: '45%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    marginTop: 40,
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    textAlign: 'center',
  },
  signatureSubLabel: {
    fontSize: 9,
    color: '#000000',
    marginTop: 2,
    textAlign: 'center',
  },
  blueFranja: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 62,
    backgroundColor: '#0d608e',
    color: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#ffffff',
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

  // Separar fecha y hora
  const [fechaVal = '', ...horaParts] = (today || '').split(' ');
  const horaVal = horaParts.join(' ');

  // Calcular garantía dinámica
  const maxGarantiaMeses = validItems.reduce((max: number, item: any) => {
    const gar = parseInt(item.garantia || '0', 10);
    return gar > max ? gar : max;
  }, 0);
  const maxGarantiaAnios = maxGarantiaMeses > 0 ? Math.round(maxGarantiaMeses / 12) : (ordenEntrega?.aplicaMantenimientos ? 3 : 0);

  const nombreUsuario = data.nombreUsuario || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {images['logo'] ? (
              <Image src={images['logo']} style={styles.logo} />
            ) : (
              <View style={{ height: 60, width: 140, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8, color: '#9ca3af' }}>Bioelectrónica</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>ORDEN DE ENTREGA</Text>
        </View>

        {/* Info Grid: Client Block */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>INFORMACIÒN DEL CLIENTE</Text>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>CLIENTE</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{selectedClient?.name || ''}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>CELULAR:</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{selectedClient?.phone || ''}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>RTN:</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{selectedClient?.rtn || ''}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>ATENCION:</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{(nombreUsuario || '').toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>DIRECCION:</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{(selectedClient?.address || '').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Grid: Details Block */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>DETALLES DE ENTREGA</Text>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>FECHA:</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{fechaVal}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>HORA:</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{horaVal}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelContainer}>
                <Text style={styles.fieldLabelText}>NO.</Text>
              </View>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{ordenEntrega?.correlativo || ''}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table Title */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>ARTICULO POR ENTREGAR</Text>
        </View>

        {/* Table of Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.tableCell, styles.colNo]}>
              <Text style={styles.thText}>No.</Text>
            </View>
            <View style={[styles.tableCell, styles.colSerie]}>
              <Text style={styles.thText}>SERIE</Text>
            </View>
            <View style={[styles.tableCell, styles.colDesc]}>
              <Text style={[styles.thText, { textAlign: 'left' }]}>DESCRIPCION</Text>
            </View>
            <View style={[styles.tableCell, styles.colQty]}>
              <Text style={styles.thText}>CANTIDAD</Text>
            </View>
          </View>

          {validItems.map((item: any, idx: number) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <View style={[styles.tableCell, styles.colNo]}>
                <Text style={styles.tdText}>{idx + 1}</Text>
              </View>
              <View style={[styles.tableCell, styles.colSerie]}>
                <Text style={[styles.tdText, { fontWeight: 700 }]}>{item.serie || 'N/A'}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDesc]}>
                <Text style={[styles.tdText, { textAlign: 'left' }]}>{item.shortDesc}</Text>
              </View>
              <View style={[styles.tableCell, styles.colQty]}>
                <Text style={styles.tdText}>{item.qty}</Text>
              </View>
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
          <View wrap={false} style={{ marginTop: 16 }}>
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

        {/* Dynamic Warranty Section */}
        {maxGarantiaAnios > 0 && (
          <View style={styles.warrantyBlock} wrap={false}>
            <Text style={styles.warrantyText}>GARANTÍA DE {maxGarantiaAnios} {maxGarantiaAnios === 1 ? 'AÑO' : 'AÑOS'}</Text>
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
            <Text style={[styles.signatureLabel, { fontSize: 11 }]}>FIRMA Y SELLO</Text>
            <Text style={[styles.signatureLabel, { fontSize: 11 }]}>BIOELECTRONICA</Text>
            <Text style={[styles.signatureSubLabel, { fontSize: 12, fontWeight: 700, marginTop: 4 }]}>Ing. Emilia Zapata</Text>
          </View>

          {/* Client Signature */}
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={[styles.signatureLabel, { fontSize: 11 }]}>RECIBE:</Text>
          </View>
        </View>

        {/* Blue Footer */}
        <View style={styles.blueFranja} fixed>
          <Text style={styles.footerText}>BARRIO GUAMILITO. 7 CALLE. 9 AVENIDA, SAN PEDRO SULA, CORTES, HONDURAS C.A.</Text>
          <Text style={styles.footerText}>TEL:(504) 552 04 91. CEL. 3178 2368 / 8924-6108</Text>
          <Text style={styles.footerText}>E-MAIL: gerencia@bioelectronicahn.com / bioelectronicaa_a@yahoo.com</Text>
        </View>
      </Page>
    </Document>
  );
}

