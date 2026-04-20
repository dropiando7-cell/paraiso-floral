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
  // Table display options
  showProductImages: boolean;
  productImagePosition?: 'firstColumn' | 'afterCode';
  showTableBorders: boolean;
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
};
