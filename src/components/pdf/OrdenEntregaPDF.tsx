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
    paddingLeft: 45,
    paddingRight: 45,
    paddingTop: 30,
    paddingBottom: 70, // Space for footer
    fontFamily: 'Inter',
    fontSize: 9.5,
    color: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    height: 50,
    width: 120,
    objectFit: 'contain',
  },
  title: {
    fontSize: 30,
    fontWeight: 700,
    color: '#0d608e',
    textTransform: 'uppercase',
  },
  sectionTitleContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingBottom: 1,
    marginTop: 10,
    marginBottom: 5,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  infoCol: {
    width: '48%',
    flexDirection: 'column',
  },
  infoDivider: {
    width: 0.75,
    backgroundColor: '#000000',
    alignSelf: 'stretch',
    marginVertical: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    minHeight: 14,
  },
  fieldLabelContainer: {
    width: 74,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingBottom: 1,
  },
  fieldLabelText: {
    fontSize: 9,
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
    minHeight: 11,
  },
  fieldValueText: {
    fontSize: 9,
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
    marginTop: 6,
    marginBottom: 10,
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
    minHeight: 24,
  },
  tableCell: {
    borderRightWidth: 0.75,
    borderRightColor: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 9.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    color: '#000000',
    textAlign: 'center',
  },
  tdText: {
    fontSize: 9,
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
    marginTop: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
    width: '100%',
  },
  warrantyText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    textTransform: 'uppercase',
  },
  diagnosticoBox: {
    borderWidth: 0.75,
    borderColor: '#000000',
    padding: 8,
    marginBottom: 10,
    width: '100%',
  },
  diagnosticoTitle: {
    fontWeight: 700,
    color: '#000000',
    marginBottom: 3,
    fontSize: 9.5,
    textTransform: 'uppercase',
  },
  diagnosticoText: {
    fontSize: 8.5,
    color: '#000000',
    lineHeight: 1.25,
  },
  evidenciasTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#000000',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  evidenciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  evidenciaContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '23.5%',
    marginBottom: 6,
  },
  evidenciaImage: {
    width: 75,
    height: 75,
    borderWidth: 0.75,
    borderColor: '#000000',
    objectFit: 'contain',
    backgroundColor: '#f8fafc',
  },
  evidenciaText: {
    fontSize: 7,
    color: '#000000',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 1.1,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 15,
    marginBottom: 20,
    position: 'relative',
  },
  signatureCol: {
    alignItems: 'center',
    marginHorizontal: 10,
    position: 'relative',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    marginTop: 4,
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#000000',
    textAlign: 'center',
  },
  signatureSubLabel: {
    fontSize: 7,
    color: '#4b5563',
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

// Helper to parse warranty string into days
const parseGarantiaToDays = (garantia: any): number => {
  if (!garantia) return 0;
  const str = String(garantia).trim().toLowerCase();
  
  // Try to match a decimal or integer number, optional whitespace, and units
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(a[ñn]o\(s\)|a[ñn]os|a[ñn]o|ano\(s\)|anos|ano|mes\(es\)|meses|mes|m|d[ií]a\(s\)|d[ií]as|d[ií]a|d)?/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || '';

  if (unit.startsWith('a') || unit.startsWith('año') || unit.startsWith('ano')) {
    return Math.round(value * 365);
  }
  if (unit.startsWith('m')) {
    return Math.round(value * 30);
  }
  if (unit.startsWith('d')) {
    return Math.round(value);
  }

  // Heuristic for pure numbers without unit
  // If the number is <= 5, it is probably years
  // If the number is > 5, it is probably months (converted to days)
  if (value <= 5) {
    return Math.round(value * 365);
  }
  return Math.round(value * 30);
};

// Helper to format warranty duration nicely
const formatGarantia = (garantia: any) => {
  if (!garantia) return '';
  const str = String(garantia).trim();
  if (/^\d+$/.test(str)) {
    const val = parseInt(str, 10);
    if (val <= 5) {
      return `${val} ${val === 1 ? 'año' : 'años'}`;
    }
    return `${val} meses`;
  }
  return str;
};

interface OrdenEntregaPDFProps {
  data: any;
  images: Record<string, string>;
}

export default function OrdenEntregaPDF({ data, images }: OrdenEntregaPDFProps) {
  const {
    organization, settings, docNumber, selectedClient, lineItems, today, ordenEntrega, ordenTrabajo
  } = data;

  const excludedIds = ordenEntrega?.detallesExcluidos || [];
  const validItems = lineItems?.filter((item: any) => !item.isSection && !excludedIds.includes(item.id)) || [];

  // Recopilar fotos de evidencia en las imágenes pre-cargadas
  const evidenciaImages = Object.keys(images)
    .filter(key => key.startsWith('evidencia_'))
    .map(key => images[key]);

  // Separar fecha y hora
  const [fechaVal = '', ...horaParts] = (today || '').split(' ');
  const horaVal = horaParts.join(' ');

  // Calcular garantía dinámica en días y guardar el texto original de la máxima
  let maxGarantiaDays = 0;
  let maxGarantiaItemText = '';

  validItems.forEach((item: any) => {
    const days = parseGarantiaToDays(item.garantia);
    if (days > maxGarantiaDays) {
      maxGarantiaDays = days;
      maxGarantiaItemText = item.garantia;
    }
  });

  // Determinar el texto de la garantía final
  let warrantyLabel = '';
  if (maxGarantiaDays > 0) {
    warrantyLabel = `GARANTÍA DE ${formatGarantia(maxGarantiaItemText).toUpperCase()}`;
  } else if (ordenEntrega?.aplicaMantenimientos) {
    warrantyLabel = 'GARANTÍA DE 3 AÑOS';
  }

  const nombreUsuario = data.nombreUsuario || '';

  // Configuración de firmas y sellos dinámicos
  const signaturesList = settings?.signaturesList || [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings?.showEmiliaZapata !== false },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings?.showManuelTejada !== false }
  ];

  const activeSigs = (ordenEntrega?.mostrarFirmas !== false) ? signaturesList.filter((sig: any) => sig.enabled) : [];
  const showSeals = (ordenEntrega?.mostrarSello !== false);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
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
                {item.garantia && item.garantia.toLowerCase() !== 'sin garantía' && (
                  <Text style={[styles.tdText, { textAlign: 'left', color: '#4b5563', fontSize: 7.5, marginTop: 2, fontWeight: 500 }]}>
                    Garantía: {formatGarantia(item.garantia)}
                  </Text>
                )}
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
          <View wrap={false} style={{ marginTop: 8 }}>
            <Text style={styles.evidenciasTitle}>Evidencias Fotográficas de Entrega</Text>
            <View style={styles.evidenciasGrid}>
              {evidenciaImages.map((foto, i) => {
                const desc = (ordenEntrega?.evidenciaFotosDesc || [])[i] || "";
                return (
                  <View key={i} style={styles.evidenciaContainer}>
                    <Image src={foto} style={styles.evidenciaImage} />
                    <Text style={styles.evidenciaText}>{`${i + 1}. ${desc || 'Evidencia'}`}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Dynamic Warranty Section */}
        {warrantyLabel !== '' && (
          <View style={styles.warrantyBlock} wrap={false}>
            <Text style={styles.warrantyText}>{warrantyLabel}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesContainer} wrap={false}>
          {/* Render Active Signatures columns */}
          {activeSigs.map((sig: any) => {
            const totalCols = activeSigs.length + 1;
            const sigColWidth = totalCols <= 2 ? '45%' : '30%';
            return (
              <View key={sig.id} style={[styles.signatureCol, { width: sigColWidth }]}>
                {/* Sello de la Empresa superpuesto sobre esta firma */}
                {showSeals && settings.showCompanySeal !== false && settings.companySealPosition === sig.id && images['seal_company'] && (
                  <Image 
                    src={images['seal_company']} 
                    style={{ 
                      position: 'absolute', 
                      top: -20 + (typeof settings.signatureSpacing === 'number' ? settings.signatureSpacing : 39) + (settings.companySealY || 0), 
                      left: (settings.companySealX || 0),
                      width: settings.sealSize || 180, 
                      height: settings.sealSize || 180, 
                      opacity: 0.75 
                    }} 
                  />
                )}
                 <View style={{ height: settings.signatureHeight || 120, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2 }}>
                  {images[`sig_${sig.id}`] && (
                    <Image 
                      src={images[`sig_${sig.id}`]} 
                      style={{ 
                        height: settings.signatureHeight || 120, 
                        objectFit: 'contain', 
                        position: 'relative', 
                        top: (typeof settings.signatureSpacing === 'number' ? settings.signatureSpacing : 39) + (sig.offsetY || 0)
                      }} 
                    />
                  )}
                </View>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>{sig.name}</Text>
                <Text style={styles.signatureSubLabel}>{sig.role}</Text>
              </View>
            );
          })}

          {/* Sello de la Empresa cuando no hay firmas pero el sello está activo */}
          {activeSigs.length === 0 && showSeals && settings.showCompanySeal !== false && images['seal_company'] && (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '45%' }}>
              <Image src={images['seal_company']} style={{ width: settings.sealSize || 180, height: settings.sealSize || 180, opacity: 0.8 }} />
            </View>
          )}

          {/* Client Signature Column */}
          <View style={[styles.signatureCol, { width: activeSigs.length <= 1 ? '45%' : '30%' }]}>
            <View style={{ height: settings.signatureHeight || 120 }} />
            <View style={styles.signatureLine} />
            <Text style={[styles.signatureLabel, { fontSize: 10 }]}>RECIBE:</Text>
            <Text style={styles.signatureSubLabel}>Cliente / Solicitante</Text>
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

