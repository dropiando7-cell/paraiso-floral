export type TemplateLayout = 'modern' | 'classic' | 'minimalist' | 'legacy';
export type LogoPosition = 'left' | 'center' | 'right';
export type LogoSize = 'small' | 'medium' | 'large';

export interface SignatureItem {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  enabled: boolean;
  offsetY?: number;
  offsetX?: number;
  height?: number;
}

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
  // Signatures and Seals
  showSignatures?: boolean;
  showEmiliaZapata?: boolean;
  showManuelTejada?: boolean;
  showSeals?: boolean;
  showCompanySeal?: boolean;
  selectedStatusSeal?: 'none' | 'cancelado' | 'entregado' | string;
  signatureHeight?: number;
  sealSize?: number;
  companySealPosition?: 'manuel' | 'emilia' | 'center' | 'right' | string;
  statusSealPosition?: 'right' | 'manuel' | 'emilia' | 'center' | string;
  signatureSpacing?: number;
  signaturesList?: SignatureItem[];
  signaturesLibrary?: string[];
  sealsLibrary?: string[];
  companySealUrl?: string;
  companySealX?: number;
  companySealY?: number;
  // Warranty specific signature and seal settings
  warrantySignatureHeight?: number;
  warrantySignatureX?: number;
  warrantySignatureY?: number;
  warrantySealSize?: number;
  warrantySealX?: number;
  warrantySealY?: number;
  warrantySignatureSpacing?: number;
  // Terms and observations for quote
  showTerms?: boolean;
  advancePercentage?: number;
  completionPercentage?: number;
  termsTextDefault1?: string;
  termsTextDefault2?: string;
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
  // Signatures and Seals defaults
  showSignatures: false,
  showEmiliaZapata: true,
  showManuelTejada: true,
  showSeals: false,
  showCompanySeal: true,
  selectedStatusSeal: 'none',
  signatureHeight: 120,
  sealSize: 180,
  companySealPosition: 'manuel',
  statusSealPosition: 'right',
  signatureSpacing: 39,
  signaturesList: [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: true },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: true }
  ],
  signaturesLibrary: [
    '/firmas-sellos/firma emilia zapata.png',
    '/firmas-sellos/firma Ing Manuel Tejada.png'
  ],
  sealsLibrary: [
    '/firmas-sellos/SELLO DE BIOELECTRONICA.png',
    '/firmas-sellos/SELLO DE ENTREGADO.png',
    '/firmas-sellos/SELLO DE CANCELADO.png'
  ],
  companySealUrl: '/firmas-sellos/SELLO DE BIOELECTRONICA.png',
  warrantySignatureHeight: 120,
  warrantySignatureX: 0,
  warrantySignatureY: 0,
  warrantySealSize: 112,
  warrantySealX: 0,
  warrantySealY: 0,
  warrantySignatureSpacing: 0,
  showTerms: false,
  advancePercentage: 80,
  completionPercentage: 20,
  termsTextDefault1: 'Para iniciar los trabajos aquí descritos se deberá cancelar el {p1}% del valor total y el {p2}% restante al finalizar.',
  termsTextDefault2: 'Favor someter a consideración esta cotización y le rogamos sea devuelta con firma y sello de aceptación en caso que la misma sea aceptada.'
};
