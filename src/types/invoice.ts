export type TemplateLayout = 'modern' | 'classic' | 'minimalist' | 'legacy';
export type LogoPosition = 'left' | 'center' | 'right';
export type LogoSize = 'small' | 'medium' | 'large';

export interface InvoiceSettings {
  template: TemplateLayout;
  colorTheme: string;
  fontFamily: string;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
  // Footer customization
  footerTelefono: string;
  footerCorreo: string;
  footerWeb: string;
  footerNota: string;
  footerMostrarPagina: boolean;
  footerFontSize?: number;
  // Table display options
  showProductImages: boolean;
  productImagePosition?: 'firstColumn' | 'afterCode';
  showTableBorders: boolean;
  showTableVerticalBorders?: boolean;
  tableRoundedBorders?: boolean;
  tableHeaderBg?: string;
  tableBorderThickness?: string;
  tableBorderColor?: string;
  showTableOuterBorders?: boolean;
  descriptionBorderDashed?: boolean;
  tableRowPadding?: number;
  subtotalsBorder?: boolean;
  subtotalsBorderStyle?: 'full' | 'grouped';
  // Font Sizes
  headerFontSize?: 'small' | 'normal' | 'large' | number;
  tableHeaderFontSize?: 'small' | 'normal' | 'large' | number;
  itemDescFontSize?: 'small' | 'normal' | 'large' | number;
  totalFontSize?: 'small' | 'normal' | 'large' | number;
  // Product Image adjustments
  productImageSize?: 'small' | 'medium' | 'large';
  productImageStyle?: 'original' | 'rounded' | 'square';
  // Total colors
  totalBgColor?: string;
  totalTextColor?: string;
  // Misc
  showItemCode?: boolean;
  useMonospaceNumbers?: boolean;
  // Global Section Defaults
  sectionBgColor?: string;
  sectionTextColor?: string;
  // Icon colors
  serviceIconColor?: string;
  // State persistence
  activeCustomTemplateId?: string;
}

export interface CustomInvoiceTemplate {
  id: string;
  name: string;
  settings: InvoiceSettings;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  template: 'modern',
  colorTheme: 'blue-600',
  fontFamily: 'font-sans',
  logoPosition: 'left',
  logoSize: 'medium',
  // Footer — pre-filled with BEA data
  footerTelefono: '+504 2552-0491',
  footerCorreo: 'bioelectronicaa_a@yahoo.com, ventas@bioelectronicahn.com',
  footerWeb: 'www.bioelectronicahn.com',
  footerNota: '',
  footerMostrarPagina: true,
  // Table display options
  showProductImages: true,
  productImagePosition: 'afterCode',
  showTableBorders: false,
  showTableVerticalBorders: false,
  tableRoundedBorders: true,
  tableHeaderBg: '#f8fafc',
  tableBorderThickness: '1px',
  tableBorderColor: '#e2e8f0',
  subtotalsBorder: false,
  subtotalsBorderStyle: 'grouped',
  showTableOuterBorders: true,
  descriptionBorderDashed: true,
  tableRowPadding: 2,
  totalBgColor: '#0f172a',
  totalTextColor: '#ffffff',
  showItemCode: true,
  useMonospaceNumbers: true,
  sectionBgColor: '#f1f5f9',
  sectionTextColor: '#1e293b',
  serviceIconColor: '#0500A3',
};
