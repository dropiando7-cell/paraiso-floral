import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { SignatureItem } from '@/types/invoice';

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/rsms/inter@3.19/docs/font-files/Inter-Regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/gh/rsms/inter@3.19/docs/font-files/Inter-Medium.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/gh/rsms/inter@3.19/docs/font-files/Inter-Bold.ttf', fontWeight: 700 },
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Inter',
  },
  companyInfo: {
    fontSize: 10,
    color: '#374151',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
  },
  metadataGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    fontSize: 9,
  },
  metaColumn: {
    flex: 1,
    flexDirection: 'column',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    paddingLeft: 8,
  },
  metaColumnFirst: {
    flex: 1,
    flexDirection: 'column',
    paddingRight: 8,
  },
  metaLabel: {
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 4,
    color: '#1f2937',
  },
  metaValue: {
    color: '#4b5563',
  },
  clientBox: {
    marginTop: 8,
  },
  clientName: {
    fontWeight: 700,
    fontSize: 10,
    color: '#1f2937',
  },
  clientAddress: {
    fontSize: 9,
    color: '#4b5563',
  },
  table: {
    width: 'auto',
    marginTop: 10,
  },
  tableColHeader: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 2,
    color: '#1f2937',
  },
  tableCol: {
    fontSize: 8,
    textAlign: 'center',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  tableColLeft: {
    fontSize: 8,
    textAlign: 'left',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  tableColRight: {
    fontSize: 8,
    textAlign: 'right',
    paddingHorizontal: 2,
    paddingVertical: 4,
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
  },
  longDescText: {
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
    marginBottom: 4,
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
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  }
});

interface LegacyTemplatePDFProps {
  data: any;
  images: Record<string, string>; // base64 strings mapped by item ID or URL
}

export default function LegacyTemplatePDF({ data, images }: LegacyTemplatePDFProps) {
  const {
    organization, settings, docNumber, currentDocType, 
    selectedClient, paymentTerms, lineItems, notes, totals, today, fmt
  } = data;

  const colorMap: Record<string, string> = {
    'blue-600': '#1e40af',
    'emerald-600': '#065f46',
    'violet-600': '#5b21b6',
    'slate-800': '#111827',
    'rose-600': '#9f1239',
  };
  
  const primaryColor = colorMap[settings?.colorTheme] || '#111827';
  
  // Extract settings
  const logoSizePx = settings?.logoSize === 'small' ? 64 : settings?.logoSize === 'large' ? 144 : 112;
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={{
          flexDirection: isCenter ? 'column' : (isRight ? 'row-reverse' : 'row'),
          justifyContent: isCenter ? 'flex-start' : 'space-between',
          alignItems: isCenter ? 'center' : 'flex-start',
          marginBottom: 32,
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
            <Text style={[styles.companyName, { color: primaryColor }]}>{organization?.name || 'BIOELECTRONICA S. DE R.L. DE C.V'}</Text>
            {organization?.direccion ? (
              <Text>{organization.direccion}</Text>
            ) : (
              <View style={{ alignItems: isCenter ? 'center' : (isRight ? 'flex-start' : 'flex-end') }}>
                <Text>Barrio Paz Barahona 10 CALLE 12 Y 11 Ave.</Text>
                <Text>Casa NO. 81-A, media cuadra abajo de Restaurante Estelina</Text>
                <Text>San Pedro Sula CO 01201</Text>
                <Text>Honduras</Text>
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
          <View style={styles.metaColumnFirst}>
            <Text style={[styles.metaLabel, { color: primaryColor, fontSize: 11 }]}>{currentDocType?.label}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 4, color: '#1f2937' }}>{docNumber}</Text>
            <Text style={styles.metaValue}>Fecha: {today}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Comercial:</Text>
            <Text style={styles.metaValue}>{data.nombreUsuario || 'Administrador'}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Términos de pago:</Text>
            <Text style={styles.metaValue}>{paymentTerms}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Cliente:</Text>
            {selectedClient ? (
              <View style={styles.clientBox}>
                <Text style={[styles.clientName, { color: primaryColor }]}>{selectedClient.name}</Text>
                <Text style={styles.clientAddress}>{selectedClient.address || selectedClient.city}</Text>
                {selectedClient.rtn && <Text style={styles.clientAddress}>RTN: {selectedClient.rtn}</Text>}
              </View>
            ) : (
              <Text style={styles.metaValue}>-</Text>
            )}
          </View>
        </View>

        {/* Table Area */}
        <View style={[
          styles.table, 
          { 
            borderWidth: showTableOuterBorders ? tableBorderThickness : 0, 
            borderColor: tableBorderColor,
            borderRadius: tableRoundedBorders ? 8 : 0,
            overflow: 'hidden'
          }
        ]}>
          {/* Table Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: tableHeaderBg,
            alignItems: 'stretch',
            borderBottomWidth: showTableBorders ? tableBorderThickness : 0,
            borderBottomColor: tableBorderColor,
          }}>
            <Text style={[styles.tableColHeader, styles.colCode, { paddingVertical: 4 }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Código</Text>
            <Text style={[styles.tableColHeader, styles.colDesc, { paddingVertical: 4 }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Descripción</Text>
            <Text style={[styles.tableColHeader, styles.colQty, { paddingVertical: 4 }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Cant.</Text>
            <Text style={[styles.tableColHeader, styles.colPrice, { paddingVertical: 4 }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Precio</Text>
            <Text style={[styles.tableColHeader, styles.colDiscount, { paddingVertical: 4 }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Desc.</Text>
            <Text style={[styles.tableColHeader, styles.colTax, { paddingVertical: 4 }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>Imp.</Text>
            <Text style={[styles.tableColHeader, styles.colTotal, { paddingVertical: 4 }]}>Monto</Text>
          </View>

          {/* Table Rows */}
          {lineItems?.map((item: any, i: number) => {
            const hasImage = settings?.showProductImages && item.imageUrl && images[item.id];
            
            if (item.isSection) {
              return (
                <View key={`sec-${i}`} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 24,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  backgroundColor: '#f8fafc',
                  borderBottomWidth: (showTableBorders && i < lineItems.length - 1) ? tableBorderThickness : 0,
                  borderBottomColor: tableBorderColor,
                }} wrap={false}>
                  <Text style={{ fontWeight: 700, fontSize: 9, color: '#0f172a' }}>{item.shortDesc}</Text>
                </View>
              );
            }

            return (
              <View key={i} wrap={false} style={{ flexDirection: 'column' }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  minHeight: 24,
                  borderBottomWidth: (!item.showLongDesc && showTableBorders && i < lineItems.length - 1) ? tableBorderThickness : 0,
                  borderBottomColor: tableBorderColor,
                }}>
                  <View style={[styles.colCode, { flexDirection: 'row', alignItems: 'center' }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                    {hasImage && settings?.productImagePosition === 'firstColumn' && (
                      <View style={styles.imageContainer}>
                        <Image src={images[item.id]} style={styles.productImage} />
                      </View>
                    )}
                    <Text style={[styles.tableCol, { flex: 1 }]}>{item.code || '-'}</Text>
                  </View>
                  
                  <View style={[styles.colDesc, { flexDirection: 'row', alignItems: 'center' }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                    {hasImage && (!settings?.productImagePosition || settings?.productImagePosition === 'afterCode') && (
                      <View style={styles.imageContainer}>
                        <Image src={images[item.id]} style={styles.productImage} />
                      </View>
                    )}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.tableColLeft, styles.descText]}>{item.shortDesc || '-'}</Text>
                    </View>
                  </View>

                  <View style={[styles.colQty, { justifyContent: 'center' }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                    <Text style={styles.tableCol}>{item.qty}</Text>
                  </View>
                  <View style={[styles.colPrice, { justifyContent: 'center' }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                    <Text style={styles.tableColRight}>{fmt ? fmt(item.unitPrice || 0) : item.unitPrice}</Text>
                  </View>
                  <View style={[styles.colDiscount, { justifyContent: 'center' }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                    <Text style={styles.tableColRight}>
                      {Number(item.discount) > 0 
                        ? (item.discountType === 'percentage' ? `${item.discount}%` : (fmt ? fmt(item.discount) : item.discount))
                        : '-'}
                    </Text>
                  </View>
                  <View style={[styles.colTax, { justifyContent: 'center' }, showTableVerticalBorders ? { borderRightWidth: tableBorderThickness, borderRightColor: tableBorderColor } : {}]}>
                    <Text style={styles.tableCol}>{item.taxType === 'exento' ? 'EX' : item.taxType === '15%' ? 'ISV 15%' : 'ISV 18%'}</Text>
                  </View>
                  <View style={[styles.colTotal, { justifyContent: 'center' }]}>
                    <Text style={styles.tableColRight}>
                      {fmt ? fmt((item.qty * item.unitPrice) - (item.discountType === 'percentage' ? (item.qty * item.unitPrice * item.discount / 100) : Number(item.discount))) : 0}
                    </Text>
                  </View>
                </View>

                {item.showLongDesc && item.longDesc && (
                  <View style={{
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderBottomWidth: (showTableBorders && i < lineItems.length - 1) ? tableBorderThickness : 0,
                    borderBottomColor: tableBorderColor,
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
          
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub-Total</Text>
              <Text style={styles.totalValue}>{fmt ? fmt(totals?.subtotal || 0) : totals?.subtotal}</Text>
            </View>
            {(totals?.descuentos || 0) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Descuento</Text>
                <Text style={[styles.totalValue, { color: '#dc2626' }]}>-{fmt ? fmt(totals.descuentos) : totals.descuentos}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Exento</Text>
              <Text style={styles.totalValue}>{fmt ? fmt(totals?.exento || 0) : totals?.exento}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Exonerado</Text>
              <Text style={styles.totalValue}>{fmt ? fmt(totals?.exonerado || 0) : totals?.exonerado}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Gravado 15%</Text>
              <Text style={styles.totalValue}>{fmt ? fmt(totals?.gravado15 || 0) : totals?.gravado15}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total ISV 15%</Text>
              <Text style={styles.totalValue}>{fmt ? fmt(totals?.isv15 || 0) : totals?.isv15}</Text>
            </View>
            
            <View style={[styles.grandTotalRow, { backgroundColor: totalBgColor, borderRadius: 2 }]}>
              <Text style={[styles.grandTotalLabel, { color: totalTextColor }]}>TOTAL</Text>
              <Text style={[styles.grandTotalValue, { color: totalTextColor }]}>{fmt ? fmt(totals?.total || 0) : totals?.total}</Text>
            </View>
          </View>
        </View>

        {/* Signatures and Seals Section */}
        {settings?.showSignatures && activeSigs.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 35, marginBottom: 15, position: 'relative' }} wrap={false}>
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
                  <View style={{ height: 64, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2 }}>
                    {images[`sig_${sig.id}`] && (
                      <Image 
                        src={images[`sig_${sig.id}`]} 
                        style={{ 
                          height: settings.signatureHeight || 64, 
                          objectFit: 'contain', 
                          position: 'relative', 
                          top: settings.signatureSpacing || 0 
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
          <Text style={{ fontSize: settings?.footerFontSize || 8 }}>
            {[
              settings?.footerTelefono || organization?.telefono ? `Tel.: ${settings?.footerTelefono || organization?.telefono}` : '',
              settings?.footerCorreo || organization?.correoContacto ? `Correo: ${settings?.footerCorreo || organization?.correoContacto}` : '',
              settings?.footerWeb || organization?.domain ? `Web: ${settings?.footerWeb || organization?.domain}` : ''
            ].filter(Boolean).join('   ')}
          </Text>
          {settings?.footerNota && (
            <Text style={{ fontSize: (settings?.footerFontSize || 8) - 1, marginTop: 2 }}>{settings.footerNota}</Text>
          )}
          {settings?.footerMostrarPagina !== false && (
            <Text style={{ fontSize: (settings?.footerFontSize || 8) - 1, marginTop: 2 }} render={({ pageNumber, totalPages }) => (`Página: ${pageNumber}/${totalPages}`)} fixed />
          )}
        </View>
      </Page>
    </Document>
  );
}
