export type TemplateLayout = 'modern' | 'classic' | 'minimalist' | 'legacy';
export type LogoPosition = 'left' | 'center' | 'right';
export type LogoSize = 'small' | 'medium' | 'large';

export interface InvoiceSettings {
  template: TemplateLayout;
  colorTheme: string;
  fontFamily: string;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  template: 'modern',
  colorTheme: 'blue-600',
  fontFamily: 'font-sans',
  logoPosition: 'left',
  logoSize: 'medium'
};
