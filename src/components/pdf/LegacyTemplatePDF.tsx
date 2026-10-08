import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { SignatureItem } from '@/types/invoice';

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf', fontWeight: 700 },
  ]
});

// Disable word hyphenation globally to keep whole words together
Font.registerHyphenationCallback((word) => [word]);

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 70, // Reserve space for the fixed pageFooter to prevent overlap
    fontFamily: 'Inter',
  },
  companyInfo: {
    fontSize: 9,
    color: '#374151',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 3,
  },
  metadataGrid: {
    flexDirection: 'row',
    marginBottom: 10,
    fontSize: 8.5,
  },
  metaColumn: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 6,
  },
  metaColumnFirst: {
    flex: 1,
    flexDirection: 'column',
    paddingRight: 6,
  },
  metaLabel: {
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: 6,
    marginBottom: 2,
    color: '#1f2937',
  },
  metaValue: {
    color: '#4b5563',
    fontSize: 8,
  },
  clientBox: {
    marginTop: 4,
  },
  clientName: {
    fontWeight: 700,
    fontSize: 8.5,
    color: '#1f2937',
  },
  clientAddress: {
    fontSize: 8,
    color: '#4b5563',
  },
  table: {
    width: 'auto',
    marginTop: 6,
  },
  tableColHeader: {
    fontWeight: 700,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 2,
    color: '#1f2937',
  },
  tableCol: {
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  tableColLeft: {
    textAlign: 'left',
    paddingLeft: 6,
    paddingRight: 2,
  },
  tableColRight: {
    textAlign: 'right',
    paddingLeft: 2,
    paddingRight: 6,
  },
  // Column Widths
  colCode: { width: '15%' },
  colDesc: { width: '35%' },
  colQty: { width: '8%' },
  colPrice: { width: '12%' },
  colDiscount: { width: '8%' },
  colTax: { width: '10%' },
  colTotal: { width: '12%' },
  
  imageContainer: {
    width: 24,
    height: 24,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  descText: {
    fontWeight: 700,
    marginBottom: 2,
    lineHeight: 1.25,
  },
  longDescText: {
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  notesSection: {
    width: '50%',
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8,
    color: '#4b5563',
  },
  totalsSection: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2.5,
  },
  totalLabel: {
    fontSize: 9,
    color: '#4b5563',
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Inter',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: 700,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 30,
    right: 30,
    fontSize: 6.5,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  termsSection: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 4,
    color: '#1f2937',
  },
  termsText: {
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.4,
    marginBottom: 2,
  }
});

const calcLine = (item: any, pricesIncludeTax?: boolean) => {
  const q = Number(item.qty) || 0;
  const p = Number(item.unitPrice) || 0;
  const dVal = Number(item.discount) || 0;
  
  let tasaImpuesto = 0;
  if (item.taxType === '15%') tasaImpuesto = 0.15;
  if (item.taxType === '18%') tasaImpuesto = 0.18;

  if (pricesIncludeTax) {
    const baseConImpuesto = q * p;
    const baseNeta = baseConImpuesto / (1 + tasaImpuesto);
    
    let dAmount = 0;
    if (item.discountType === 'amount') {
      dAmount = dVal / (1 + tasaImpuesto);
    } else {
      dAmount = baseNeta * (dVal / 100);
    }
    
    const baseAfterDiscount = baseNeta - dAmount;
    const tax = baseAfterDiscount * tasaImpuesto;
    const total = baseAfterDiscount + tax;

    return { 
      base: baseNeta, 
      dAmount, 
      baseAfterDiscount, 
      tax, 
      total 
    };
  } else {
    let dAmount = 0;
    if (item.discountType === 'amount') {
      dAmount = dVal; 
    } else {
      dAmount = (q * p) * (dVal / 100);
    }
    
    const base = q * p;
    const baseAfterDiscount = base - dAmount;
    const tax = baseAfterDiscount * tasaImpuesto;
    
    return { base, dAmount, baseAfterDiscount, tax, total: baseAfterDiscount + tax };
  }
};

interface LegacyTemplatePDFProps {
  data: any;
  images: Record<string, string>; // base64 strings mapped by item ID or URL
}

export default function LegacyTemplatePDF({ data, images }: LegacyTemplatePDFProps) {
  const {
    organization, settings, docNumber, currentDocType, 
    selectedClient, paymentTerms, paymentMethod, docType, lineItems, notes, totals, today, fmt
  } = data;

  const totalItemsQty = (lineItems || [])
    .filter((item: any) => !item.isSection && !item.itemType?.includes('section'))
    .reduce((sum: number, item: any) => sum + (Number(item.qty || item.cantidad) || 0), 0);
  const formattedTotalQty = Number.isInteger(totalItemsQty) ? String(totalItemsQty) : totalItemsQty.toFixed(2);

  const lastNonSectionIndex = lineItems ? lineItems.reduceRight((acc: number, it: any, idx: number) => acc !== -1 ? acc : (!it.isSection ? idx : -1), -1) : -1;

  const colorMap: Record<string, string> = {
    'blue-600': '#1e40af',
    'emerald-600': '#065f46',
    'violet-600': '#5b21b6',
    'slate-800': '#111827',
    'rose-600': '#9f1239',
  };
  
  const primaryColor = colorMap[settings?.colorTheme] || '#111827';
  
  // Extract settings
  const logoSizePx = settings?.logoSize === 'small' ? 52 : settings?.logoSize === 'large' ? 112 : 88;
  const isCenter = settings?.logoPosition === 'center';
  const isRight = settings?.logoPosition === 'right';

  const signaturesList: SignatureItem[] = settings?.signaturesList || [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings?.showEmiliaZapata !== false },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings?.showManuelTejada !== false }
  ];
  const activeSigs = signaturesList.filter(sig => sig.enabled);

  const tableBorderColor = settings?.tableBorderColor || '#1e293b';
  const tableBorderThickness = settings?.tableBorderThickness ? parseInt(settings.tableBorderThickness) : 1;
  const showTableOuterBorders = settings?.showTableOuterBorders !== false;
  const showTableBorders = settings?.showTableBorders !== false;
  const showTableVerticalBorders = settings?.showTableVerticalBorders === true;
  const tableRoundedBorders = settings?.tableRoundedBorders === true;
  const tableHeaderBg = settings?.tableHeaderBg || '#f3f4f6';
  
  const totalBgColor = settings?.totalBgColor || '#0f172a';
  const totalTextColor = settings?.totalTextColor || '#ffffff';

  // Dynamic layout values matching the canvas
  let headerFontSizePdf = 7.5;
  if (typeof settings?.tableHeaderFontSize === 'number') {
    headerFontSizePdf = settings.tableHeaderFontSize * 0.75;
  } else if (settings?.tableHeaderFontSize === 'large') {
    headerFontSizePdf = 10;
  } else if (settings?.tableHeaderFontSize === 'small') {
    headerFontSizePdf = 7;
  }

  let descFontSizePdf = 7.5;
  if (typeof settings?.itemDescFontSize === 'number') {
    descFontSizePdf = settings.itemDescFontSize * 0.75;
  } else if (settings?.itemDescFontSize === 'large') {
    descFontSizePdf = 10;
  } else if (settings?.itemDescFontSize === 'small') {
    descFontSizePdf = 7;
  }

  const subtotalsBorder = settings?.subtotalsBorder === true;
  const isGrouped = settings?.subtotalsBorderStyle === 'grouped';
  const borderCol = settings?.tableBorderColor || '#1e293b';

  const totalSizeVal = typeof settings?.totalFontSize === 'number'
    ? settings.totalFontSize * 0.75
    : settings?.totalFontSize === 'large'
      ? 22
      : settings?.totalFontSize === 'small'
        ? 14
        : 18;

  const totalLabelSizeVal = typeof settings?.totalFontSize === 'number'
    ? Math.max((settings.totalFontSize as number) * 0.75 * 0.75, 8)
    : settings?.totalFontSize === 'large'
      ? 15
      : settings?.totalFontSize === 'small'
        ? 10
        : 12;

  const renderSubtotalRow = (label: string, value: string, position: 'first' | 'middle' | 'last', isNegative: boolean = false) => {
    if (subtotalsBorder) {
      const showBottomBorder = position === 'first' || position === 'last' || !isGrouped;
      const showRightBorder = position === 'first' ? !isGrouped : true;
      const isMiddleGrouped = isGrouped && position === 'middle';

      return (
        <View style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          borderBottomWidth: showBottomBorder ? 1 : 0,
          borderBottomColor: borderCol,
          minHeight: isMiddleGrouped ? 13 : 15,
        }}>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            paddingLeft: 6,
            paddingVertical: isMiddleGrouped ? 1 : 2.2,
            borderRightWidth: showRightBorder ? 1 : 0,
            borderRightColor: borderCol,
          }}>
            <Text style={{
              fontSize: descFontSizePdf,
              color: '#4b5563',
              fontFamily: 'Helvetica-Bold',
            }}>{label}</Text>
          </View>
          <View style={{
            width: 100,
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingRight: 6,
            paddingVertical: isMiddleGrouped ? 1 : 2.2,
          }}>
            <Text style={{
              fontSize: descFontSizePdf,
              color: isNegative ? '#dc2626' : '#1f2937',
              fontFamily: 'Helvetica',
            }}>{value}</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { fontSize: descFontSizePdf }]}>{label}</Text>
          <Text style={[styles.totalValue, { fontSize: descFontSizePdf }, isNegative ? { color: '#dc2626' } : {}]}>{value}</Text>
        </View>
      );
    }
  };

  const paddingVerticalMap = [0, 1.5, 2.5, 6, 9];
  const tableCellPaddingY = paddingVerticalMap[settings?.tableRowPadding ?? 2] ?? 2.5;

  const imgSize = settings?.productImageSize === 'large' ? 60 : 
                  settings?.productImageSize === 'medium' ? 42 : 24;

  const dynamicImageContainer = {
    width: imgSize,
    height: imgSize,
    marginRight: 4,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  const showItemCode = settings?.showItemCode !== false;
  const qtyPositionFirst = settings?.qtyPositionFirst === true;

  const colCodeStyle = styles.colCode;
  const colDescStyle = { ...styles.colDesc, width: !showItemCode ? '50%' : '35%' };
  const colQtyStyle = styles.colQty;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header Block */}
        <View style={{
          flexDirection: isCenter ? 'column' : (isRight ? 'row-reverse' : 'row'),
          justifyContent: isCenter ? 'flex-start' : 'space-between',
          alignItems: isCenter ? 'center' : 'flex-start',
          marginBottom: 18,
        }}>
          {/* Logo */}
          <View style={{ 
            width: isCenter ? '100%' : 'auto', 
            alignItems: isCenter ? 'center' : (isRight ? 'flex-end' : 'flex-start'), 
            flex: isCenter ? 0 : 1,
            marginBottom: isCenter ? 16 : 0
          }}>
            {images['logo'] ? (
              <Image src={images['logo']} style={{ height: logoSizePx }} />
            ) : (
              <View style={{ width: logoSizePx, height: logoSizePx, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold' }}>Sin Logo</Text>
              </View>
            )}
          </View>
          
          {/* Company Info */}
          <View style={[styles.companyInfo, { 
            flex: isCenter ? 0 : 1, 
            alignItems: isCenter ? 'center' : (isRight ? 'flex-start' : 'flex-end'),
            textAlign: isCenter ? 'center' : (isRight ? 'left' : 'right'),
          }]}>
            <Text style={[styles.companyName, { color: primaryColor }]}>{organization?.name || 'Distribuidora Paraíso Floral'}</Text>
            {organization?.direccion ? (
              <Text>{organization.direccion}</Text>
            ) : (
              <View style={{ alignItems: isCenter ? 'center' : (isRight ? 'flex-start' : 'flex-end') }}>
                <Text>San Pedro Sula, Honduras</Text>
              </View>
            )}
            <Text style={{ marginTop: 4 }}>
              {organization?.rtn ? `RTN: ${organization.rtn} ` : ''}
              {organization?.telefono ? `Tel: ${organization.telefono}` : ''}
            </Text>
          </View>
        </View>

        {/* Metadata Grid */}
        <View style={styles.metadataGrid}>
          {(() => {
            const hasPaymentMethod = docType === 'factura' || docType === 'cotizacion' || docType === 'proforma';
            const method = paymentMethod || 'Efectivo';
            return (
              <>
                <View style={[styles.metaColumnFirst, { flex: hasPaymentMethod ? 0.8 : 0.9 }]}>
                  <Text style={[styles.metaLabel, { color: primaryColor, fontSize: 9.5 }]}>{currentDocType?.label}</Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9.5, marginBottom: 4, color: '#1f2937' }}>{docNumber}</Text>
                  <Text style={styles.metaValue}>Fecha: {today}</Text>
                </View>
                <View style={[styles.metaColumn, { flex: hasPaymentMethod ? 0.6 : 0.7 }]}>
                  <Text style={styles.metaLabel}>Elaborado por:</Text>
                  <Text style={styles.metaValue}>{data.nombreUsuario || 'Administrador'}</Text>
                </View>
                <View style={[styles.metaColumn, { flex: hasPaymentMethod ? 0.6 : 0.7 }]}>
                  <Text style={styles.metaLabel}>Términos de pago:</Text>
                  <Text style={styles.metaValue}>{paymentTerms}</Text>
                </View>
                {hasPaymentMethod && (
                  <View style={[styles.metaColumn, { flex: 0.6 }]}>
                    <Text style={styles.metaLabel}>Método de pago:</Text>
                    <Text style={styles.metaValue}>{method}</Text>
                  </View>
                )}
                <View style={[styles.metaColumn, { flex: hasPaymentMethod ? 1.8 : 1.7 }]}>
                  <Text style={styles.metaLabel}>Cliente:</Text>
                  {selectedClient ? (
                    <View style={styles.clientBox}>
                      <Text style={[styles.clientName, { color: primaryColor }]}>{selectedClient.name}</Text>
                      <Text style={styles.clientAddress}>{selectedClient.address || selectedClient.city}</Text>
                      {selectedClient.rtn && <Text style={styles.clientAddress}>RTN: {selectedClient.rtn}</Text>}
                      {selectedClient.nombreContacto && <Text style={styles.clientAddress}>Contacto: {selectedClient.nombreContacto}</Text>}
                      {selectedClient.telefonoContacto && <Text style={styles.clientAddress}>Tel. Contacto: {selectedClient.telefonoContacto}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.metaValue}>-</Text>
                  )}
                </View>
              </>
            );
          })()}
        </View>

        {/* SAR Fiscal Details Banner */}
        {(data.numeroCAI || data.rangoAutorizado || data.fechaLimiteEmision) && (
          <View style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 4,
            backgroundColor: '#f8fafc',
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginBottom: 6,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontSize: 5.5, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                CAI (Código Autorización SAR)
              </Text>
              <Text style={{ fontSize: 6.8, fontFamily: 'Inter', fontWeight: 700, color: '#0f172a', marginTop: 1 }}>
                {data.numeroCAI || '—'}
              </Text>
            </View>
            {data.rangoAutorizado && (
              <View style={{ flex: 1.2, paddingLeft: 6 }}>
                <Text style={{ fontSize: 5.5, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  Rango Autorizado
                </Text>
                <Text style={{ fontSize: 6.8, fontFamily: 'Inter', fontWeight: 500, color: '#334155', marginTop: 1 }}>
                  {data.rangoAutorizado}
                </Text>
              </View>
            )}
            {data.fechaLimiteEmision && (
              <View style={{ flex: 0.9, paddingLeft: 6, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 5.5, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  Fecha Límite Emisión
                </Text>
                <Text style={{ fontSize: 6.8, fontFamily: 'Inter', fontWeight: 700, color: '#0f172a', marginTop: 1 }}>
                  {typeof data.fechaLimiteEmision === 'string'
                    ? data.fechaLimiteEmision.split('T')[0]
                    : new Date(data.fechaLimiteEmision).toLocaleDateString('es-HN')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Table Area */}
        <View style={[
          styles.table, 
          { 
            borderRadius: tableRoundedBorders ? 8 : 0,
            overflow: 'hidden'
          }
        ]}>
          {/* Table Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: tableHeaderBg,
            alignItems: 'stretch',
            borderTopWidth: showTableOuterBorders ? tableBorderThickness : 0,
            borderTopColor: tableBorderColor,
            borderBottomWidth: showTableBorders ? tableBorderThickness : 0,
            borderBottomColor: tableBorderColor,
            borderLeftWidth: showTableOuterBorders ? tableBorderThickness : 0,
            borderLeftColor: tableBorderColor,
            borderRightWidth: showTableOuterBorders ? tableBorderThickness : 0,
            borderRightColor: tableBorderColor,
          }}>
            {qtyPositionFirst && (
              <Text style={[styles.tableColHeader, colQtyStyle, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Cant.</Text>
            )}
            {showItemCode && (
              <Text style={[styles.tableColHeader, colCodeStyle, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                Código
              </Text>
            )}
            <Text style={[styles.tableColHeader, colDescStyle, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Descripción</Text>
            {!qtyPositionFirst && (
              <Text style={[styles.tableColHeader, colQtyStyle, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Cant.</Text>
            )}
            <Text style={[styles.tableColHeader, styles.colPrice, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Precio</Text>
            <Text style={[styles.tableColHeader, styles.colDiscount, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Desc.</Text>
            <Text style={[styles.tableColHeader, styles.colTax, { paddingVertical: 4, fontSize: headerFontSizePdf }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Imp.</Text>
            <Text style={[styles.tableColHeader, styles.colTotal, { paddingVertical: 4, fontSize: headerFontSizePdf }]}>Monto</Text>
          </View>

          {/* Table Rows */}
          {lineItems?.map((item: any, i: number) => {
            const hasImage = settings?.showProductImages && item.imageUrl && images[item.id];
            
            if (item.isSection) {
              const bg = item.sectionStyle?.bg || settings?.sectionBgColor || '#f1f5f9';
              const color = item.sectionStyle?.color || settings?.sectionTextColor || '#1e293b';
              const align = item.sectionStyle?.align || 'left';
              const isBold = item.sectionStyle?.bold !== false;

              return (
                <View key={`sec-${i}`} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 24,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  backgroundColor: bg,
                  borderLeftWidth: showTableOuterBorders ? tableBorderThickness : 0,
                  borderLeftColor: tableBorderColor,
                  borderRightWidth: showTableOuterBorders ? tableBorderThickness : 0,
                  borderRightColor: tableBorderColor,
                  borderBottomWidth: showTableBorders ? tableBorderThickness : 0,
                  borderBottomColor: tableBorderColor,
                  borderTopWidth: 0,
                  borderTopColor: tableBorderColor,
                  justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'
                }} wrap={false}>
                  <Text style={{ 
                    fontWeight: isBold ? 700 : 400, 
                    fontSize: 8.5, 
                    color: color, 
                    textAlign: align,
                    textTransform: 'uppercase'
                  }}>{item.shortDesc ? item.shortDesc.toUpperCase() : ''}</Text>
                </View>
              );
            }

            return (
              <View key={i} wrap={false} style={{
                flexDirection: 'column',
                borderLeftWidth: showTableOuterBorders ? tableBorderThickness : 0,
                borderLeftColor: tableBorderColor,
                borderRightWidth: showTableOuterBorders ? tableBorderThickness : 0,
                borderRightColor: tableBorderColor,
                borderBottomWidth: showTableBorders ? tableBorderThickness : 0,
                borderBottomColor: tableBorderColor,
                borderTopWidth: 0,
                borderTopColor: tableBorderColor,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  minHeight: 24,
                }}>
                  {/* Columns: Qty, Code, Desc according to settings */}
                  {(() => {
                    const qtyCell = (
                      <View style={[
                        colQtyStyle, 
                        { 
                          justifyContent: 'center',
                          paddingVertical: tableCellPaddingY 
                        }, 
                        showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}
                      ]}>
                        <Text style={[styles.tableCol, { fontSize: descFontSizePdf }]}>{item.qty}</Text>
                      </View>
                    );

                    const codeCell = showItemCode ? (
                      <View style={[
                        colCodeStyle, 
                        { 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          paddingVertical: tableCellPaddingY 
                        }, 
                        showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}
                      ]}>
                        {hasImage && settings?.productImagePosition === 'firstColumn' && (
                          <View style={dynamicImageContainer}>
                            <Image src={images[item.id]} style={styles.productImage} />
                          </View>
                        )}
                        <Text style={[styles.tableCol, { flex: 1, fontSize: descFontSizePdf }]}>{item.code || '-'}</Text>
                      </View>
                    ) : null;

                    const descCell = (
                      <View style={[
                        colDescStyle, 
                        { 
                          flexDirection: 'row', 
                          alignItems: 'center',
                          paddingVertical: tableCellPaddingY
                        }, 
                        showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}
                      ]}>
                        {hasImage && ((!settings?.productImagePosition || settings?.productImagePosition === 'afterCode') || !showItemCode) && (
                          <View style={dynamicImageContainer}>
                            <Image src={images[item.id]} style={styles.productImage} />
                          </View>
                        )}
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <Text style={[styles.tableColLeft, styles.descText, { fontSize: descFontSizePdf }]}>{item.shortDesc ? item.shortDesc.toUpperCase() : '-'}</Text>
                          {(item.marcaModelo || item.serie) && (
                            <Text style={[styles.tableColLeft, { fontSize: 7, color: '#4b5563', marginTop: 1, fontFamily: 'Helvetica', textTransform: 'uppercase' }]}>
                              {item.marcaModelo ? `Marca/Modelo: ${item.marcaModelo}` : ''}
                              {item.marcaModelo && item.serie ? ' | ' : ''}
                              {item.serie ? `Serie: ${item.serie}` : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                    );

                    return (
                      <>
                        {qtyPositionFirst && qtyCell}
                        {codeCell}
                        {descCell}
                        {!qtyPositionFirst && qtyCell}
                      </>
                    );
                  })()}
                  
                  <View style={[
                    styles.colPrice, 
                    { 
                      justifyContent: 'center',
                      paddingVertical: tableCellPaddingY 
                    }, 
                    showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}
                  ]}>
                    <Text style={[styles.tableColRight, { fontSize: descFontSizePdf }]}>{fmt ? fmt(item.unitPrice || 0) : item.unitPrice}</Text>
                  </View>
                  
                  <View style={[
                    styles.colDiscount, 
                    { 
                      justifyContent: 'center',
                      paddingVertical: tableCellPaddingY 
                    }, 
                    showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}
                  ]}>
                    <Text style={[styles.tableColRight, { fontSize: descFontSizePdf }]}>
                      {Number(item.discount) > 0 
                        ? (item.discountType === 'percentage' ? `${item.discount}%` : (fmt ? fmt(item.discount) : item.discount))
                        : '-'}
                    </Text>
                  </View>
                  
                  <View style={[
                    styles.colTax, 
                    { 
                      justifyContent: 'center',
                      paddingVertical: tableCellPaddingY 
                    }, 
                    showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}
                  ]}>
                    <Text style={[styles.tableCol, { fontSize: descFontSizePdf }]}>{item.taxType === 'exento' ? 'EX' : item.taxType === '15%' ? 'ISV 15%' : 'ISV 18%'}</Text>
                  </View>
                  
                  <View style={[
                    styles.colTotal, 
                    { 
                      justifyContent: 'center',
                      paddingVertical: tableCellPaddingY 
                    }
                  ]}>
                    <Text style={[styles.tableColRight, { fontSize: descFontSizePdf }]}>
                      {fmt ? fmt(calcLine(item, settings?.pricesIncludeTax).total + (i === lastNonSectionIndex ? (Number(settings?.roundAdjustment) || 0) : 0)) : 0}
                    </Text>
                  </View>
                </View>

                {item.showLongDesc && item.longDesc && (
                  <View style={{
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderTopWidth: tableBorderThickness,
                    borderTopColor: tableBorderColor,
                    borderStyle: settings?.descriptionBorderDashed !== false ? 'dashed' : 'solid',
                  }}>
                    <Text style={styles.longDescText}>{item.longDesc}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Nota / Plazo de pago:</Text>
            <Text style={styles.notesText}>{notes || paymentTerms}</Text>
          </View>
          
          <View style={[
            styles.totalsSection, 
            subtotalsBorder ? { 
              borderWidth: 1, 
              borderBottomWidth: 0, 
              borderColor: borderCol, 
              paddingTop: 0, 
            } : {}
          ]}>
            {renderSubtotalRow("Total Ítems / Paquetes", formattedTotalQty, "first")}
            {renderSubtotalRow("Sub-Total", fmt ? fmt(totals?.subtotal || 0) : String(totals?.subtotal || 0), "middle")}
            {(totals?.descuentos || 0) > 0 && renderSubtotalRow("Total Descuento", `-${fmt ? fmt(totals.descuentos) : String(totals.descuentos)}`, "middle", true)}
            {renderSubtotalRow("Total Exento", fmt ? fmt(totals?.exento || 0) : String(totals?.exento || 0), "middle")}
            {renderSubtotalRow("Total Exonerado", fmt ? fmt(totals?.exonerado || 0) : String(totals?.exonerado || 0), "middle")}
            {renderSubtotalRow("Total Gravado 15%", fmt ? fmt(totals?.gravado15 || 0) : String(totals?.gravado15 || 0), "middle")}
            {renderSubtotalRow("Total ISV 15%", fmt ? fmt(totals?.isv15 || 0) : String(totals?.isv15 || 0), "last")}

            <View style={[
              styles.grandTotalRow, 
              { 
                backgroundColor: totalBgColor, 
                borderRadius: subtotalsBorder && isGrouped ? 0 : 2,
                marginTop: subtotalsBorder && isGrouped ? 0 : 4,
                paddingVertical: subtotalsBorder ? 4 : 6,
              },
              settings?.subtotalsBorder && isGrouped ? { 
                borderWidth: 1, 
                borderTopWidth: 0, 
                borderColor: borderCol, 
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
              } : {}
            ]}>
              <Text style={[styles.grandTotalLabel, { color: totalTextColor, fontSize: totalLabelSizeVal }]}>TOTAL</Text>
              <Text style={[styles.grandTotalValue, { color: totalTextColor, fontSize: totalSizeVal }]}>
                {fmt ? fmt(totals?.total || 0) : String(totals?.total || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Signatures and Seals Section */}
        {settings?.showSignatures && activeSigs.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 20, marginBottom: 8, position: 'relative' }} wrap={false}>
            {/* Company Seal (Center) */}
            {settings.showSeals && settings.showCompanySeal !== false && (settings.companySealPosition === 'center') && images['seal_company'] && (
              <Image 
                src={images['seal_company']} 
                style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  marginLeft: -((settings.sealSize || 112) / 2),
                  top: -10, 
                  width: settings.sealSize || 112, 
                  height: settings.sealSize || 112, 
                  opacity: 0.75 
                }} 
              />
            )}

            {/* Company Seal (Right) */}
            {settings.showSeals && settings.showCompanySeal !== false && (settings.companySealPosition === 'right') && images['seal_company'] && (
              <Image 
                src={images['seal_company']} 
                style={{ 
                  position: 'absolute', 
                  right: 10, 
                  top: -10, 
                  width: settings.sealSize || 112, 
                  height: settings.sealSize || 112, 
                  opacity: 0.75 
                }} 
              />
            )}

            {/* Status Seal (Center) */}
            {settings.showSeals && settings.selectedStatusSeal && settings.selectedStatusSeal !== 'none' && (settings.statusSealPosition === 'center') && images[`seal_${settings.selectedStatusSeal}`] && (
              <Image 
                src={images[`seal_${settings.selectedStatusSeal}`]} 
                style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  marginLeft: -((settings.sealSize || 112) / 2),
                  top: -10, 
                  width: settings.sealSize || 112, 
                  height: settings.sealSize || 112, 
                  opacity: 0.8 
                }} 
              />
            )}

            {/* Dynamic Signatures Columns */}
            {activeSigs.map((sig) => {
              const columnWidth = activeSigs.length <= 2 ? '40%' : '28%';
              return (
                <View key={sig.id} style={{ width: columnWidth, alignItems: 'center', marginHorizontal: 15, position: 'relative' }}>
                  {/* Company Seal on top of this signature */}
                  {settings.showSeals && settings.showCompanySeal !== false && settings.companySealPosition === sig.id && images['seal_company'] && (
                    <Image 
                      src={images['seal_company']} 
                      style={{ 
                        position: 'absolute', 
                        top: -15, 
                        width: settings.sealSize || 112, 
                        height: settings.sealSize || 112, 
                        opacity: 0.75 
                      }} 
                    />
                  )}
                  {/* Status Seal on top of this signature */}
                  {settings.showSeals && settings.selectedStatusSeal && settings.selectedStatusSeal !== 'none' && settings.statusSealPosition === sig.id && images[`seal_${settings.selectedStatusSeal}`] && (
                    <Image 
                      src={images[`seal_${settings.selectedStatusSeal}`]} 
                      style={{ 
                        position: 'absolute', 
                        top: -15, 
                        width: settings.sealSize || 112, 
                        height: settings.sealSize || 112, 
                        opacity: 0.8 
                      }} 
                    />
                  )}
                  <View style={{ height: sig.height || settings.signatureHeight || 64, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2 }}>
                    {images[`sig_${sig.id}`] && (
                      <Image 
                        src={images[`sig_${sig.id}`]} 
                        style={{ 
                          height: sig.height || settings.signatureHeight || 64, 
                          objectFit: 'contain', 
                          position: 'relative', 
                          top: (settings.signatureSpacing || 0) + (sig.offsetY || 0),
                          left: sig.offsetX || 0
                        }} 
                      />
                    )}
                  </View>
                  <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: '#9ca3af', marginVertical: 3 }} />
                  <Text style={{ fontSize: 9, fontFamily: 'Inter', fontWeight: 700, color: '#1f2937' }}>{sig.name}</Text>
                  <Text style={{ fontSize: 7, color: '#4b5563', textAlign: 'center' }}>{sig.role}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Fallback Company Seal when signatures are off but seals are on */}
        {!settings?.showSignatures && settings?.showSeals && settings?.showCompanySeal !== false && images['seal_company'] && (
          <View style={{ alignItems: 'center', marginTop: 25, marginBottom: 15 }} wrap={false}>
            <Image src={images['seal_company']} style={{ width: settings.sealSize || 112, height: settings.sealSize || 112, opacity: 0.8 }} />
          </View>
        )}

        {/* Status Seal (CANCELADO / ENTREGADO) positioned absolutely on the page */}
        {settings?.showSeals && settings?.selectedStatusSeal && settings?.selectedStatusSeal !== 'none' && settings.statusSealPosition === 'right' && images[`seal_${settings.selectedStatusSeal}`] && (
          <Image 
            src={images[`seal_${settings.selectedStatusSeal}`]} 
            style={{ 
              position: 'absolute', 
              right: 60, 
              bottom: 120, 
              width: settings.sealSize || 112, 
              height: settings.sealSize || 112, 
              opacity: 0.8 
            }} 
          />
        )}

        <View style={[styles.pageFooter, { paddingTop: 4 }]} fixed>
          {(data.isSar || data.numeroCAI) && (
            <View style={{ marginBottom: 3, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1' }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Inter', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', textAlign: 'center' }}>
                ORIGINAL: CLIENTE • COPIA: EMISOR
              </Text>
              <Text style={{ fontSize: 5.5, fontFamily: 'Inter', fontWeight: 500, color: '#475569', textTransform: 'uppercase', textAlign: 'center', marginTop: 1 }}>
                LA FACTURA ES BENEFICIO DE TODOS, EXÍJALA
              </Text>
            </View>
          )}
          <Text style={{ fontSize: settings?.footerFontSize || 6.5 }}>
            {[
              settings?.footerTelefono || organization?.telefono ? `Tel.: ${settings?.footerTelefono || organization?.telefono}` : '',
              settings?.footerCorreo || organization?.correoContacto ? `Correo: ${settings?.footerCorreo || organization?.correoContacto}` : '',
              settings?.footerWeb || organization?.domain ? `Web: ${settings?.footerWeb || organization?.domain}` : ''
            ].filter(Boolean).join('   ')}
          </Text>
          {settings?.footerNota && (
            <Text style={{ fontSize: (settings?.footerFontSize || 6.5) - 0.5, marginTop: 2 }}>{settings.footerNota}</Text>
          )}
          {settings?.footerMostrarPagina !== false && (
            <Text style={{ fontSize: (settings?.footerFontSize || 6.5) - 0.5, marginTop: 2 }} render={({ pageNumber, totalPages }) => (`Página: ${pageNumber}/${totalPages}`)} fixed />
          )}
        </View>
      </Page>
    </Document>
  );
}
