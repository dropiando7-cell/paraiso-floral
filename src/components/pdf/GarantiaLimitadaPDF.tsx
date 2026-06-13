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
    fontSize: 13,
    fontWeight: 700,
    color: '#1e40af',
  },
  odeCorrelativo: {
    fontSize: 11,
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
  colNo: { width: '6%' },
  colQty: { width: '8%', textAlign: 'center' },
  colDesc: { width: '38%' },
  colBrand: { width: '16%' },
  colModel: { width: '16%' },
  colGarantia: { width: '16%', textAlign: 'center' },
  
  termsContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fcfcfc',
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  termsText: {
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.4,
    textAlign: 'justify',
    marginBottom: 6,
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
  },
  
  // Calendario styles
  calendarSectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 10,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    paddingBottom: 4,
  },
  calendarTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  calColNo: { width: '8%', textAlign: 'center' },
  calColDesc: { width: '30%' },
  calColDate: { width: '22%', textAlign: 'center' },
  calColSign: { width: '20%', textAlign: 'center' },
  calColObs: { width: '20%' },
});

interface GarantiaLimitadaPDFProps {
  data: any;
  images: Record<string, string>;
}

// Helper to add months to a date safely
const addMonths = (date: Date, months: number) => {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
};

// Helper to format date cleanly
const formatDate = (date: Date) => {
  return date.toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Helper to format warranty duration nicely
const formatGarantia = (garantia: any) => {
  if (!garantia) return 'Sin garantía';
  const str = String(garantia).trim();
  if (/^\d+$/.test(str)) {
    return `${str} meses`;
  }
  return str;
};

export default function GarantiaLimitadaPDF({ data, images }: GarantiaLimitadaPDFProps) {
  const {
    organization, settings, docNumber, selectedClient, lineItems, today, ordenEntrega, fechaEmision
  } = data;

  const validItems = lineItems?.filter((item: any) => !item.isSection) || [];

  const firstQrAsset = validItems.find((item: any) => item.isAsset && item.code);
  const firstQrCode = firstQrAsset?.code || null;
  
  // Filter items that qualify as assets and have maintenance properties
  const maintenanceItems = validItems.filter((item: any) => 
    item.mantenimientosIncluidos > 0 && 
    item.frecuenciaMantenimientoMeses > 0
  );

  const baseDate = fechaEmision ? new Date(fechaEmision) : new Date();

  return (
    <Document>
      {/* PAGE 1: Certificado de Garantía */}
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
          <Text style={styles.title}>CERTIFICADO DE GARANTÍA LIMITADA</Text>
          <Text style={styles.odeCorrelativo}>{ordenEntrega?.correlativo || 'ODE-PENDIENTE'}</Text>
        </View>

        {/* Info Grid */}
        <View style={styles.infoSection}>
          {/* Client Block */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Información del Beneficiario</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente:</Text>
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
              <Text style={styles.infoValue}>{selectedClient?.address || ''}</Text>
            </View>
          </View>

          {/* Transaction Block */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Detalles del Documento</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Referencia:</Text>
              <Text style={styles.infoValue}>Factura / Proforma {docNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Venta:</Text>
              <Text style={styles.infoValue}>{today}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ejecutivo:</Text>
              <Text style={styles.infoValue}>{data.nombreUsuario || 'Asesor Comercial'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cobertura:</Text>
              <Text style={styles.infoValue}>Nacional (Honduras)</Text>
            </View>
          </View>
        </View>

        {/* Table of Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCol, styles.colNo]}>No.</Text>
            <Text style={[styles.thCol, styles.colQty]}>Cant.</Text>
            <Text style={[styles.thCol, styles.colDesc, { textAlign: 'left' }]}>Equipo y Número de Serie</Text>
            <Text style={[styles.thCol, styles.colBrand]}>Marca</Text>
            <Text style={[styles.thCol, styles.colModel]}>Modelo</Text>
            <View style={[styles.thCol, styles.colGarantia, { justifyContent: 'center', alignItems: 'center', paddingVertical: 2 }]}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, textAlign: 'center' }}>PERÍODO DE</Text>
              <Text style={{ fontSize: 7.5, fontWeight: 700, textAlign: 'center' }}>GARANTÍA</Text>
            </View>
          </View>

          {validItems.map((item: any, idx: number) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdCol, styles.colNo, { textAlign: 'center' }]}>{idx + 1}</Text>
              <Text style={[styles.tdCol, styles.colQty, { textAlign: 'center' }]}>{item.qty}</Text>
              <Text style={[styles.tdCol, styles.colDesc]}>
                {item.shortDesc} {item.serie ? `(Serie: ${item.serie})` : ''}
              </Text>
              <Text style={[styles.tdCol, styles.colBrand, { textAlign: 'center' }]}>{item.marca || 'N/A'}</Text>
              <Text style={[styles.tdCol, styles.colModel, { textAlign: 'center' }]}>{item.modelo || 'N/A'}</Text>
              <Text style={[styles.tdCol, styles.colGarantia, { textAlign: 'center', fontWeight: 700, color: '#1e40af' }]}>
                {formatGarantia(item.garantia)}
              </Text>
            </View>
          ))}
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsContainer} wrap={false}>
          <Text style={styles.termsTitle}>Términos y Condiciones de la Garantía</Text>
          <Text style={styles.termsText}>
            1. COBERTURA: BIOELECTRÓNICA HONDURAS garantiza que los equipos detallados anteriormente están libres de defectos de fabricación en materiales y mano de obra bajo condiciones de uso normal durante el período especificado para cada equipo a partir de la fecha de entrega.
          </Text>
          <Text style={styles.termsText}>
            2. EXCLUSIONES: Esta garantía no cubre daños causados por: a) Accidentes, mal uso, abuso, negligencia o fluctuaciones eléctricas; b) Reparaciones, alteraciones o manipulación técnica realizada por personal no autorizado por Bioelectrónica; c) Uso del equipo fuera de los parámetros operativos especificados por el fabricante; d) Desastres naturales o causas de fuerza mayor.
          </Text>
          <Text style={styles.termsText}>
            3. PROCEDIMIENTO: Para hacer efectiva la garantía, el cliente debe presentar este certificado junto con el comprobante de compra. El equipo será evaluado por nuestro departamento de Biomédica para determinar si la falla aplica bajo los términos de esta garantía.
          </Text>
          <Text style={styles.termsText}>
            4. MANTENIMIENTO: Para mantener vigente la garantía de fábrica en equipos que lo requieran, es obligatorio realizar los mantenimientos preventivos programados detallados en el calendario adjunto.
          </Text>
        </View>

        {/* Signatures */}
        <View style={[styles.signaturesContainer, { alignItems: 'flex-end' }]} wrap={false}>
          {/* Gerente General Signature */}
          <View style={[styles.signatureCol, { width: firstQrCode ? '38%' : '45%' }]}>
            {images['sig_manuel'] && (
              <Image src={images['sig_manuel']} style={{ height: 40, objectFit: 'contain', marginBottom: -25 }} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Ing. Manuel Tejada</Text>
            <Text style={styles.signatureSubLabel}>Gerente General</Text>
            <Text style={styles.signatureSubLabel}>Bioelectrónica Honduras</Text>
          </View>

          {/* Client Signature */}
          <View style={[styles.signatureCol, { width: firstQrCode ? '38%' : '45%' }]}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Aceptación del Cliente</Text>
            <Text style={styles.signatureSubLabel}>Firma y Sello del Beneficiario</Text>
            <Text style={[styles.signatureSubLabel, { fontSize: 6.5, marginTop: 4 }]}>Al firmar, el cliente acepta los términos y condiciones de esta garantía limitada.</Text>
          </View>

          {/* QR Code de Trazabilidad */}
          {firstQrCode && images[`qr_${firstQrCode}`] && (
            <View style={{ width: '18%', alignItems: 'center', alignSelf: 'flex-end', marginBottom: 2 }}>
              <Image src={images[`qr_${firstQrCode}`]} style={{ width: 48, height: 48, marginBottom: 2 }} />
              <Text style={{ fontSize: 6, fontWeight: 700, color: '#1f2937' }}>{firstQrCode}</Text>
              <Text style={{ fontSize: 5, color: '#4b5563', marginTop: 1, textAlign: 'center' }}>Trazabilidad Digital</Text>
            </View>
          )}
        </View>

        {/* Blue Footer */}
        <View style={styles.blueFranja} fixed>
          <Text>BIOELECTRÓNICA HONDURAS - SOLUCIONES MÉDICAS E INDUSTRIALES</Text>
          <Text>Dirección: Barrio Guamilito, 8 Calle entre 6 y 7 Ave, San Pedro Sula, Cortés</Text>
          <Text>Tel: +504 9999-0000 | Correo: soporte@bioelectronicahn.com | Web: www.bioelectronicahn.com</Text>
        </View>
      </Page>

      {/* PAGE 2: Calendario de Mantenimientos (Only if applies and there are maintenance items) */}
      {ordenEntrega?.aplicaMantenimientos && maintenanceItems.length > 0 && (
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
              <Text>Tel: {organization?.telefono || '+504 9999-0000'}</Text>
            </View>
          </View>

          {/* Title block for Maintenance */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>PROGRAMA DE MANTENIMIENTO PREVENTIVO OBLIGATORIO</Text>
            <Text style={styles.odeCorrelativo}>{ordenEntrega?.correlativo || 'ODE-PENDIENTE'}</Text>
          </View>

          <Text style={[styles.termsText, { marginBottom: 12, fontSize: 8 }]}>
            A continuación se detallan las visitas de mantenimiento preventivo sugeridas para sus equipos de acuerdo con las especificaciones del fabricante. La realización de estas visitas en los tiempos indicados garantiza el rendimiento óptimo y mantiene activa la garantía de los equipos.
          </Text>

          {maintenanceItems.map((item: any, idx: number) => {
            // Generate rows for each maintenance included
            const rows = [];
            for (let i = 1; i <= item.mantenimientosIncluidos; i++) {
              const monthsToAdd = i * item.frecuenciaMantenimientoMeses;
              const scheduledDate = addMonths(baseDate, monthsToAdd);
              rows.push({
                index: i,
                date: scheduledDate
              });
            }

            return (
              <View key={idx} style={{ marginBottom: 16 }} wrap={false}>
                <Text style={styles.calendarSectionTitle}>
                  {item.shortDesc} {item.serie ? `(Serie: ${item.serie})` : ''} — Marca: {item.marca || 'N/A'}, Modelo: {item.modelo || 'N/A'}
                </Text>

                <View style={styles.calendarTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCol, styles.calColNo]}>Visita</Text>
                    <Text style={[styles.thCol, styles.calColDesc, { textAlign: 'left' }]}>Tipo de Servicio</Text>
                    <Text style={[styles.thCol, styles.calColDate]}>Fecha Programada</Text>
                    <Text style={[styles.thCol, styles.calColSign]}>Firma Técnico</Text>
                    <Text style={[styles.thCol, styles.calColObs, { textAlign: 'left' }]}>Observaciones</Text>
                  </View>

                  {rows.map((row) => (
                    <View key={row.index} style={styles.tableRow}>
                      <Text style={[styles.tdCol, styles.calColNo]}>#{row.index}</Text>
                      <Text style={[styles.tdCol, styles.calColDesc]}>Mantenimiento Preventivo</Text>
                      <Text style={[styles.tdCol, styles.calColDate, { fontWeight: 500 }]}>
                        {formatDate(row.date)}
                      </Text>
                      <Text style={[styles.tdCol, styles.calColSign]}></Text>
                      <Text style={[styles.tdCol, styles.calColObs]}></Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Program Notes */}
          <View style={[styles.termsContainer, { marginTop: 'auto', marginBottom: 20 }]} wrap={false}>
            <Text style={styles.termsTitle}>Notas Importantes sobre el Programa</Text>
            <Text style={styles.termsText}>
              • La programación de las visitas debe ser confirmada con al menos 5 días hábiles de anticipación contactando a nuestro departamento de Biomédica al correo soporte@bioelectronicahn.com.
            </Text>
            <Text style={styles.termsText}>
              • Cada visita completada debe ser firmada y sellada por el técnico de Bioelectrónica designado. Conserve este documento firmado en un lugar seguro.
            </Text>
          </View>

          {/* Blue Footer */}
          <View style={styles.blueFranja} fixed>
            <Text>BIOELECTRÓNICA HONDURAS - SOLUCIONES MÉDICAS E INDUSTRIALES</Text>
            <Text>Dirección: Barrio Guamilito, 8 Calle entre 6 y 7 Ave, San Pedro Sula, Cortés</Text>
            <Text>Tel: +504 9999-0000 | Correo: soporte@bioelectronicahn.com | Web: www.bioelectronicahn.com</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
