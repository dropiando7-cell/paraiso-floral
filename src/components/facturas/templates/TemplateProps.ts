import React from 'react';
import { InvoiceSettings } from '@/types/invoice';

export interface TemplateProps {
  settings: InvoiceSettings;
  organization: any;
  docNumber: string;
  docType: string;
  currentDocType: { label: string; icon: React.ReactNode; color: string; bg: string; description: string };
  docTypeStatusConfig: Record<string, { badge: string; label: string }>;
  today: string;
  futureDate: (days: number) => string;
  selectedClient: any | null;
  setShowClientModal: (v: boolean) => void;
  paymentTerms: string;
  setPaymentTerms: (v: string) => void;
  validityDays: number;
  setValidityDays: (v: number) => void;
  lineItems: any[];
  handleLineChange: (id: string, field: string, val: any) => void;
  handleDeleteLine: (id: string) => void;
  handleToggleLongDesc: (id: string) => void;
  allProducts: any[];
  emptyLine: () => any;
  setLineItems: React.Dispatch<React.SetStateAction<any[]>>;
  setShowProductModal: (v: boolean) => void;
  notes: string;
  setNotes: (v: string) => void;
  subtotalBase: number;
  globalDiscount: number | string;
  setGlobalDiscount: (v: number | string) => void;
  discountAmount: number;
  totalTax: number;
  grandTotal: number;
  handleSave: () => void;
  isSaving: boolean;
  fmt: (n: number) => string;
  LineItemRowComponent: React.FC<any>;
}
