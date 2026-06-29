'use client';
import React, { useState, useEffect } from 'react';
import { X, LayoutTemplate, Palette, Type, Image as ImageIcon, Check, PanelBottom, Save, Trash2, Scaling, CheckCircle2, AlertTriangle, FileSignature, Plus, UploadCloud, Loader2, FileText } from 'lucide-react';
import { InvoiceSettings, TemplateLayout, LogoPosition, LogoSize, CustomInvoiceTemplate, SignatureItem, DEFAULT_INVOICE_SETTINGS } from '@/types/invoice';
import { getInvoiceTemplates, guardarInvoiceTemplate, eliminarInvoiceTemplate } from '@/app/(dashboard)/facturas/actions';
import toast from 'react-hot-toast';

interface Props {
  settings: InvoiceSettings;
  onChange: (key: keyof InvoiceSettings, val: any) => void;
  onClose: () => void;
  onLoadTemplate?: (settings: InvoiceSettings) => void;
  onApplyTerms?: (newSettings?: InvoiceSettings) => void;
}

const TEMPLATES: { id: TemplateLayout; name: string; desc: string }[] = [
  { id: 'modern', name: 'Modern Clean', desc: 'Diseño profesional y dinámico con bordes estilizados.' },
  { id: 'classic', name: 'Classic Formal', desc: 'Diseño corporativo tradicional, estructurado y serio.' },
  { id: 'minimalist', name: 'Minimal', desc: 'Minimalista con mucho espacio en blanco, tipografía limpia.' },
  { id: 'legacy', name: 'Legacy (BEA)', desc: 'Formato antiguo Odoo.' },
];

const COLORS = [
  { id: 'blue-600', name: 'Professional Blue', hex: '#2563eb' },
  { id: 'emerald-600', name: 'Fresh Green', hex: '#059669' },
  { id: 'violet-600', name: 'Creative Purple', hex: '#7c3aed' },
  { id: 'slate-800', name: 'Executive Dark', hex: '#1e293b' },
  { id: 'rose-600', name: 'Elegant Rose', hex: '#e11d48' },
];

const FONTS = [
  { id: 'font-sans', name: 'Inter (Modern)', cssClass: 'font-sans' },
  { id: 'font-arial', name: 'Arial (Clásica)', cssClass: '[font-family:Arial,_Helvetica,_sans-serif]' },
  { id: 'font-serif', name: 'Times / Georgia (Classic)', cssClass: 'font-serif' },
  { id: 'font-times', name: 'Times New Roman (Formal)', cssClass: '[font-family:"Times_New_Roman",_Times,_serif]' },
  { id: 'font-mono', name: 'Courier / Roboto (Tech)', cssClass: 'font-mono' },
  { id: 'font-system', name: 'Helvetica (Estándar)', cssClass: '[font-family:system-ui,_-apple-system,_BlinkMacSystemFont,_"Segoe_UI",_Roboto,_sans-serif]' },
  { id: 'font-verdana', name: 'Verdana (Legible)', cssClass: '[font-family:Verdana,_sans-serif]' },
];

function FooterField({ label, value, onChange, placeholder, multiline }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none text-slate-700 placeholder:text-slate-300"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 placeholder:text-slate-300"
        />
      )}
    </div>
  );
}

function FontSizeControl({ 
  label, 
  subtitle, 
  value, 
  onChange 
}: {
  label: string;
  subtitle: string;
  value: 'small' | 'normal' | 'large' | number | undefined;
  onChange: (val: 'small' | 'normal' | 'large' | number) => void;
}) {
  const isNumber = typeof value === 'number';
  const displayVal = isNumber ? value : '';
  const presetVal = isNumber ? null : (value || 'normal');

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
      <p className="text-xs font-bold text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400">{subtitle}</p>
      <div className="flex bg-slate-100 p-1 rounded-lg mt-2 items-center gap-1">
        {(['small', 'normal', 'large'] as const).map(sz => (
          <button
            key={sz}
            onClick={() => onChange(sz)}
            className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md transition-all ${
              presetVal === sz ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {sz === 'small' ? 'Pequeño' : sz === 'normal' ? 'Normal' : 'Grande'}
          </button>
        ))}
        <div className="w-[1px] h-6 bg-slate-300 mx-1 shrink-0"></div>
        <div className="flex items-center bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm w-[50px] shrink-0">
          <input
            type="number"
            value={displayVal}
            onChange={e => {
              if (e.target.value === '') {
                onChange('normal');
                return;
              }
              const num = parseInt(e.target.value);
              if (!isNaN(num) && num > 0) onChange(num);
            }}
            placeholder="px"
            className="w-full text-[10px] font-bold text-slate-700 py-1.5 px-1 border-none focus:ring-0 text-center appearance-none"
            style={{ MozAppearance: 'textfield' }}
          />
        </div>
      </div>



    </div>
  );
}

export default function InvoiceCustomizerSidebar({ settings, onChange, onClose, onLoadTemplate, onApplyTerms }: Props) {
  const [activeTab, setActiveTab] = useState<'template' | 'colors' | 'font' | 'logo' | 'footer' | 'sizes'>('template');
  const [savedTemplates, setSavedTemplates] = useState<CustomInvoiceTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateToDelete, setTemplateToDelete] = useState<{id: string, name: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeLibraryType, setActiveLibraryType] = useState<'signature' | 'seal' | null>(null);
  const [activeSigIndex, setActiveSigIndex] = useState<number | null>(null);
  const [activeSealField, setActiveSealField] = useState<'company' | 'status' | null>(null);
  const [uploading, setUploading] = useState(false);

  // Signatures list getter/setters
  const signaturesList = settings.signaturesList || [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings.showEmiliaZapata !== false },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings.showManuelTejada !== false }
  ];

  const updateSignature = (index: number, field: keyof SignatureItem, value: any) => {
    const updated = [...signaturesList];
    updated[index] = { ...updated[index], [field]: value };
    onChange('signaturesList', updated);
  };

  const addSignature = () => {
    const newSig: SignatureItem = {
      id: `sig_${Date.now()}`,
      name: 'Nueva Persona',
      role: 'Cargo',
      imageUrl: '/firmas-sellos/firma emilia zapata.png', // default placeholder
      enabled: true
    };
    onChange('signaturesList', [...signaturesList, newSig]);
  };

  const deleteSignature = (index: number) => {
    const updated = signaturesList.filter((_, i) => i !== index);
    onChange('signaturesList', updated);
  };

  const signaturesLibrary = settings.signaturesLibrary || [
    '/firmas-sellos/firma emilia zapata.png',
    '/firmas-sellos/firma Ing Manuel Tejada.png'
  ];

  const sealsLibrary = settings.sealsLibrary || [
    '/firmas-sellos/SELLO DE BIOELECTRONICA.png',
    '/firmas-sellos/SELLO DE ENTREGADO.png',
    '/firmas-sellos/SELLO DE CANCELADO.png'
  ];

  const handleFileUpload = async (file: File, type: 'signature' | 'seal') => {
    try {
      setUploading(true);
      // 1. Request presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type })
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await res.json();

      // 2. Upload file to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file to R2');

      // 3. Add to library in settings
      if (type === 'signature') {
        const lib = settings.signaturesLibrary || [
          '/firmas-sellos/firma emilia zapata.png',
          '/firmas-sellos/firma Ing Manuel Tejada.png'
        ];
        if (!lib.includes(publicUrl)) {
          onChange('signaturesLibrary', [...lib, publicUrl]);
        }
        return publicUrl;
      } else {
        const lib = settings.sealsLibrary || [
          '/firmas-sellos/SELLO DE BIOELECTRONICA.png',
          '/firmas-sellos/SELLO DE ENTREGADO.png',
          '/firmas-sellos/SELLO DE CANCELADO.png'
        ];
        if (!lib.includes(publicUrl)) {
          onChange('sealsLibrary', [...lib, publicUrl]);
        }
        return publicUrl;
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error al subir la imagen. Por favor, intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    getInvoiceTemplates().then(res => {
      setSavedTemplates((res as unknown) as CustomInvoiceTemplate[]);
    }).catch(console.error);
  }, []);

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return toast.error("Ingresa un nombre para la plantilla");
    setIsSaving(true);
    
    // Limpiamos el ID de la plantilla activa antes de guardar para no ensuciar el payload
    const { activeCustomTemplateId, ...settingsToSave } = settings;
    
    const res = await guardarInvoiceTemplate(newTemplateName, settingsToSave);
    if (res.success && res.templates) {
       setSavedTemplates((res.templates as unknown) as CustomInvoiceTemplate[]);
       
       // Encontrar la plantilla que se acaba de guardar/actualizar para seleccionarla
       const savedTpl = ((res.templates as unknown) as CustomInvoiceTemplate[]).find(t => t.name.trim().toLowerCase() === newTemplateName.trim().toLowerCase());
       if (savedTpl) onChange('activeCustomTemplateId', savedTpl.id);

       toast.success("Plantilla guardada exitosamente");
    } else {
       toast.error(res.error || "Error al guardar");
    }
    setIsSaving(false);
  };

  const handleLoadTemplate = (t: CustomInvoiceTemplate) => {
    const mergedSettings = { 
      ...DEFAULT_INVOICE_SETTINGS, 
      ...t.settings, 
      activeCustomTemplateId: t.id 
    };
    if (onLoadTemplate) {
      onLoadTemplate(mergedSettings);
    } else {
      Object.keys(mergedSettings).forEach(key => {
        onChange(key as keyof InvoiceSettings, (mergedSettings as any)[key]);
      });
    }
    setNewTemplateName(t.name);
    toast.success("Plantilla cargada");
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const id = templateToDelete.id;
    setTemplateToDelete(null);
    const res = await eliminarInvoiceTemplate(id);
    if (res.success && res.templates) {
       setSavedTemplates((res.templates as unknown) as CustomInvoiceTemplate[]);
       if (settings.activeCustomTemplateId === id) onChange('activeCustomTemplateId', undefined);
       toast.success("Plantilla eliminada");
    }
  };

  return (
    <div className="w-[360px] border-l border-slate-200 bg-white h-screen fixed right-0 top-0 z-[60] flex flex-col shadow-2xl print:hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Palette size={18} className="text-blue-600" /> Customize Invoice
        </h2>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-1 pt-2 border-b border-slate-100 shadow-sm bg-white overflow-x-auto">
        {([
          { id: 'template', icon: <LayoutTemplate size={15} />, label: 'Template' },
          { id: 'colors',   icon: <Palette size={15} />,        label: 'Colores' },
          { id: 'font',     icon: <Type size={15} />,           label: 'Fuente' },
          { id: 'sizes',    icon: <Scaling size={15} />,        label: 'Tamaños' },
          { id: 'logo',     icon: <ImageIcon size={15} />,      label: 'Logo' },
          { id: 'footer',   icon: <PanelBottom size={15} />,    label: 'Footer / Firmas' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2 flex flex-col gap-1 items-center transition-colors min-w-[52px] ${
              activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 space-y-4">

        {/* ── TEMPLATE ── */}
        {activeTab === 'template' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3 mb-6">
               <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"><Save size={12}/> Plantillas Guardadas</h3>
               <div className="flex gap-2">
                 <input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="Nombre de plantilla..." className="flex-1 text-xs border border-slate-200 rounded-lg px-2" />
                 <button onClick={handleSaveTemplate} disabled={isSaving} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">Guardar</button>
               </div>
               {savedTemplates.length > 0 && (
                 <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
                   {savedTemplates.map(t => {
                     const isSelected = t.id === settings.activeCustomTemplateId;
                     return (
                       <div key={t.id} className={`flex items-center justify-between border rounded p-1.5 transition-all ${isSelected ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                         <button onClick={() => handleLoadTemplate(t)} className={`text-xs font-bold flex-1 text-left flex items-center gap-2 ${isSelected ? 'text-emerald-700' : 'text-slate-700 hover:text-blue-600'}`}>
                           {isSelected && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                           <span className="truncate">{t.name}</span>
                         </button>
                         <button onClick={() => setTemplateToDelete({id: t.id, name: t.name})} className="text-red-400 hover:text-red-600 p-1 shrink-0"><Trash2 size={12}/></button>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>

            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plantilla Base</h3>
            <p className="text-xs text-slate-500">Escoge la plantilla base de tu factura.</p>
            <div className="space-y-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onChange('template', t.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                    settings.template === t.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-300 bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <p className={`font-bold text-sm ${settings.template === t.id ? 'text-blue-800' : 'text-slate-800'}`}>{t.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
                  {settings.template === t.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-slate-200 mt-6 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opciones de Tabla</h3>
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Imágenes de Producto</p>
                    <p className="text-[10px] text-slate-400">Mostrar columna de imagen</p>
                  </div>
                  <button
                    onClick={() => onChange('showProductImages', !settings.showProductImages)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showProductImages ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showProductImages ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Código de Producto</p>
                    <p className="text-[10px] text-slate-400">Mostrar código en la tabla</p>
                  </div>
                  <button
                    onClick={() => onChange('showItemCode', settings.showItemCode !== false ? false : true)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showItemCode !== false ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showItemCode !== false ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                
                {settings.showProductImages && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ubicación de la Imagen</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onChange('productImagePosition', 'firstColumn')}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                            settings.productImagePosition === 'firstColumn' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          Primera columna
                        </button>
                        <button
                          onClick={() => onChange('productImagePosition', 'afterCode')}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                            (!settings.productImagePosition || settings.productImagePosition === 'afterCode') ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          Después del código
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tamaño de la Imagen</p>
                      <div className="flex gap-2">
                        {(['small', 'medium', 'large'] as const).map(sz => (
                          <button
                            key={sz}
                            onClick={() => onChange('productImageSize', sz)}
                            className={`flex-1 py-1.5 text-[10px] font-bold capitalize rounded-lg transition-all ${
                              (settings.productImageSize || 'small') === sz ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            {sz === 'small' ? 'Pequeño' : sz === 'medium' ? 'Mediano' : 'Grande'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estilo de Encapsulado</p>
                      <div className="flex gap-2">
                        {(['rounded', 'square', 'original'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => onChange('productImageStyle', st)}
                            className={`flex-1 py-1.5 text-[10px] font-bold capitalize rounded-lg transition-all ${
                              (settings.productImageStyle || 'rounded') === st ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            {st === 'rounded' ? 'Redondeado' : st === 'square' ? 'Cuadrado' : 'Original'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Líneas Horizontales</p>
                    <p className="text-[10px] text-slate-400">Separadores de renglón</p>
                  </div>
                  <button
                    onClick={() => onChange('showTableBorders', !settings.showTableBorders)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showTableBorders ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showTableBorders ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Línea Punteada</p>
                    <p className="text-[10px] text-slate-400">En descripciones detalladas</p>
                  </div>
                  <button
                    onClick={() => onChange('descriptionBorderDashed', settings.descriptionBorderDashed === undefined ? false : !settings.descriptionBorderDashed)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      (settings.descriptionBorderDashed !== false) ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      (settings.descriptionBorderDashed !== false) ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Líneas Verticales</p>
                    <p className="text-[10px] text-slate-400">Separadores de columna</p>
                  </div>
                  <button
                    onClick={() => onChange('showTableVerticalBorders', !settings.showTableVerticalBorders)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showTableVerticalBorders ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showTableVerticalBorders ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Borde Exterior</p>
                    <p className="text-[10px] text-slate-400">Cuadro alrededor de la tabla</p>
                  </div>
                  <button
                    onClick={() => onChange('showTableOuterBorders', settings.showTableOuterBorders === undefined ? false : !settings.showTableOuterBorders)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      (settings.showTableOuterBorders !== false) ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      (settings.showTableOuterBorders !== false) ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Bordes Redondeados</p>
                    <p className="text-[10px] text-slate-400">Esquinas suaves en la tabla</p>
                  </div>
                  <button
                    onClick={() => onChange('tableRoundedBorders', !settings.tableRoundedBorders)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.tableRoundedBorders ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.tableRoundedBorders ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Bordes en Subtotales</p>
                    <p className="text-[10px] text-slate-400">Cuadro en la sección de totales</p>
                  </div>
                  <button
                    onClick={() => onChange('subtotalsBorder', !settings.subtotalsBorder)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.subtotalsBorder ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.subtotalsBorder ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {settings.subtotalsBorder && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Estilo de Subtotales</p>
                      <p className="text-[10px] text-slate-400">Completos o Agrupados</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => onChange('subtotalsBorderStyle', 'full')}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                          settings.subtotalsBorderStyle === 'full' || !settings.subtotalsBorderStyle
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Completos
                      </button>
                      <button
                        onClick={() => onChange('subtotalsBorderStyle', 'grouped')}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                          settings.subtotalsBorderStyle === 'grouped'
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Agrupados
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Fondo de Encabezado</p>
                    <p className="text-[10px] text-slate-400">Color de la cabecera</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.tableHeaderBg || '#f8fafc'} 
                      onChange={e => onChange('tableHeaderBg', e.target.value)}
                      className="w-6 h-6 p-0 border border-slate-200 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Color de Borde</p>
                    <p className="text-[10px] text-slate-400">Color de líneas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.tableBorderColor || '#e2e8f0'} 
                      onChange={e => onChange('tableBorderColor', e.target.value)}
                      className="w-6 h-6 p-0 border border-slate-200 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-col pt-2 border-t border-slate-100 gap-1.5">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Grosor de Borde</p>
                    <p className="text-[10px] text-slate-400">Grosor de las líneas</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {[
                      { id: '1px', label: 'Fino' },
                      { id: '1.5px', label: 'Normal' },
                      { id: '2px', label: 'Grueso' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => onChange('tableBorderThickness', opt.id)}
                        className={`flex-1 text-[10px] font-bold py-1 px-2 rounded-md transition-all ${
                          (settings.tableBorderThickness || '1px') === opt.id
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col pt-2 border-t border-slate-100 gap-1.5">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Espaciado de Renglón</p>
                    <p className="text-[10px] text-slate-400">Altura de las celdas para agregar más o menos ítems</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" max="4" step="1"
                      value={settings.tableRowPadding ?? 2}
                      onChange={e => onChange('tableRowPadding', Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-[10px] font-bold text-slate-500 w-12 text-right">
                      {settings.tableRowPadding === 0 ? 'Mínimo' : settings.tableRowPadding === 1 ? 'Compacto' : (settings.tableRowPadding === undefined || settings.tableRowPadding === 2) ? 'Normal' : settings.tableRowPadding === 3 ? 'Amplio' : 'Máximo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}


        {/* ── COLORS ── */}
        {activeTab === 'colors' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Color Principal</h3>
            <p className="text-xs text-slate-500">Escoge el color que predominará en el documento.</p>
            <div className="space-y-3">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => onChange('colorTheme', c.id)}
                  className={`w-full text-left p-3 rounded-2xl border-2 transition-all relative ${
                    settings.colorTheme === c.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full shadow-md flex items-center justify-center" style={{ backgroundColor: c.hex }}>
                      {settings.colorTheme === c.id && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 mt-6 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen de Totales</h3>
              
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Fondo del TOTAL</p>
                    <p className="text-[10px] text-slate-400">Color de fondo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.totalBgColor || '#0f172a'} 
                      onChange={e => onChange('totalBgColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Texto del TOTAL</p>
                    <p className="text-[10px] text-slate-400">Color de fuente</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.totalTextColor || '#ffffff'} 
                      onChange={e => onChange('totalTextColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-6 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Líneas de Sección</h3>
              
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Fondo de Sección</p>
                    <p className="text-[10px] text-slate-400">Color por defecto</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.sectionBgColor || '#f1f5f9'} 
                      onChange={e => onChange('sectionBgColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Texto de Sección</p>
                    <p className="text-[10px] text-slate-400">Color de fuente por defecto</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.sectionTextColor || '#1e293b'} 
                      onChange={e => onChange('sectionTextColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-6 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Iconos</h3>
              
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Iconos de Servicio</p>
                    <p className="text-[10px] text-slate-400">Color de iconos de servicios en tabla</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.serviceIconColor || '#0500A3'} 
                      onChange={e => onChange('serviceIconColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── FONT ── */}
        {activeTab === 'font' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipografía</h3>
            <p className="text-xs text-slate-500">Todas las fuentes están optimizadas para PDF.</p>
            <div className="space-y-3">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => onChange('fontFamily', f.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative ${
                    settings.fontFamily === f.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'
                  } ${f.cssClass}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 text-lg">Aa</span>
                      <span className="font-semibold text-slate-800 ml-3 text-sm">{f.name}</span>
                    </div>
                    {settings.fontFamily === f.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-slate-200 mt-6 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estilo de Números</h3>
              <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-700">Estilo Monoespaciado</p>
                  <p className="text-[10px] text-slate-400">Usar un estilo diferente para valores</p>
                </div>
                <button
                  onClick={() => onChange('useMonospaceNumbers', !settings.useMonospaceNumbers)}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    settings.useMonospaceNumbers ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    settings.useMonospaceNumbers ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SIZES ── */}
        {activeTab === 'sizes' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tamaños de Texto</h3>
            <p className="text-xs text-slate-500">Ajusta el tamaño de las fuentes en distintas secciones del documento.</p>
            
            <div className="space-y-4">
              <FontSizeControl
                label="Textos de Encabezado"
                subtitle="Cliente, Comercial, No. Documento"
                value={settings.headerFontSize}
                onChange={v => onChange('headerFontSize', v)}
              />
              <FontSizeControl
                label="Títulos de Tabla"
                subtitle="Código, Descripción, Cantidad, etc."
                value={settings.tableHeaderFontSize}
                onChange={v => onChange('tableHeaderFontSize', v)}
              />
              <FontSizeControl
                label="Descripción de Ítems"
                subtitle="El texto de las filas de productos"
                value={settings.itemDescFontSize}
                onChange={v => onChange('itemDescFontSize', v)}
              />
              <FontSizeControl
                label="Total (Monto)"
                subtitle="El monto en la barra gris oscura"
                value={settings.totalFontSize}
                onChange={v => onChange('totalFontSize', v)}
              />
            </div>
          </div>
        )}

        {/* ── LOGO ── */}
        {activeTab === 'logo' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Posición del Logo</h3>
              <div className="flex items-center bg-slate-200 p-1.5 rounded-xl shadow-inner">
                {(['left', 'center', 'right'] as LogoPosition[]).map(pos => (
                  <button
                    key={pos}
                    onClick={() => onChange('logoPosition', pos)}
                    className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${
                      settings.logoPosition === pos ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {pos === 'left' ? 'Izquierda' : pos === 'center' ? 'Centro' : 'Derecha'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tamaño del Logo</h3>
              <div className="flex items-center bg-slate-200 p-1.5 rounded-xl shadow-inner">
                {(['small', 'medium', 'large'] as LogoSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => onChange('logoSize', size)}
                    className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${
                      settings.logoSize === size ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        {activeTab === 'footer' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pie de Página</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Estos datos aparecen al pie de todas las facturas, cotizaciones y proformas.
            </p>

            <FooterField
              label="Teléfono"
              value={settings.footerTelefono || ''}
              onChange={v => onChange('footerTelefono', v)}
              placeholder="+504 2552-0491"
            />
            <FooterField
              label="Correo(s)"
              value={settings.footerCorreo || ''}
              onChange={v => onChange('footerCorreo', v)}
              placeholder="ventas@empresa.com"
              multiline
            />
            <FooterField
              label="Sitio Web"
              value={settings.footerWeb || ''}
              onChange={v => onChange('footerWeb', v)}
              placeholder="www.empresa.com"
            />

            <FooterField
              label="Nota adicional (opcional)"
              value={settings.footerNota || ''}
              onChange={v => onChange('footerNota', v)}
              placeholder="Ej: Gracias por su preferencia. Válido por 30 días."
              multiline
            />

            {/* Tamaño del Footer */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-700">Tamaño de letra (puntos)</p>
                <p className="text-[10px] text-slate-400">Ajusta el tamaño del texto del footer</p>
              </div>
              <input
                type="number"
                value={settings.footerFontSize || 10}
                onChange={e => onChange('footerFontSize', parseInt(e.target.value) || 10)}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                min={6}
                max={16}
              />
            </div>

            {/* Mostrar número de página */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-700">Número de página</p>
                <p className="text-[10px] text-slate-400">Muestra "Página: 1/1" al pie</p>
              </div>
              <button
                onClick={() => onChange('footerMostrarPagina', !settings.footerMostrarPagina)}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  settings.footerMostrarPagina ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  settings.footerMostrarPagina ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* Preview */}
            <div className="mt-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Vista previa del footer</p>
              <div className="border-t border-slate-400 pt-2 text-center space-y-1">
                <div 
                  className="flex flex-nowrap whitespace-nowrap items-center justify-center gap-x-2 text-slate-600 w-full overflow-hidden"
                  style={{ fontSize: `${settings.footerFontSize || 10}px` }}
                >
                  {settings.footerTelefono && <span>Tel.: {settings.footerTelefono}</span>}
                  {settings.footerCorreo && <span>Correo: {settings.footerCorreo}</span>}
                  {settings.footerWeb && <span>Web: {settings.footerWeb}</span>}
                </div>
                {settings.footerNota && <p className="text-[9px] text-slate-500 italic">{settings.footerNota}</p>}
                {settings.footerMostrarPagina && <p className="text-[9px] text-slate-400">Página: 1/1</p>}
              </div>
            </div>

            {/* Términos y Observaciones Section */}
            <div className="pt-4 border-t border-slate-200 mt-6 space-y-4">
              <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <FileText size={12} className="text-blue-600" /> Observaciones (Cotización)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Integra automáticamente las cláusulas de cotización en el campo de Notas y Plazo de pago del documento.
              </p>

              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Integrar en Notas</p>
                    <p className="text-[10px] text-slate-400">Insertar cláusulas en el campo de Notas</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !settings.showTerms;
                      onChange('showTerms', nextVal);
                      if (nextVal && onApplyTerms) {
                        onApplyTerms({ ...settings, showTerms: nextVal });
                      }
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showTerms ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showTerms ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {settings.showTerms && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {/* Cláusula 1 Textarea */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Texto Cláusula 1</label>
                      <textarea
                        value={settings.termsTextDefault1 ?? ''}
                        onChange={e => onChange('termsTextDefault1', e.target.value)}
                        rows={3}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50/50 focus:border-slate-400 focus:ring-0 text-slate-700 font-sans leading-relaxed"
                        placeholder="Ej: Para iniciar los trabajos aquí descritos se deberá cancelar el {p1}% del valor total..."
                      />
                      <span className="text-[9px] text-slate-400 block leading-tight">Usa <strong>{'{p1}'}</strong> y <strong>{'{p2}'}</strong> para los porcentajes.</span>
                    </div>

                    {/* Cláusula 2 Textarea */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Texto Cláusula 2</label>
                      <textarea
                        value={settings.termsTextDefault2 ?? ''}
                        onChange={e => onChange('termsTextDefault2', e.target.value)}
                        rows={3}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50/50 focus:border-slate-400 focus:ring-0 text-slate-700 font-sans leading-relaxed"
                        placeholder="Ej: Favor someter a consideración esta cotización..."
                      />
                    </div>

                    {/* % Adelanto */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">% Adelanto Inicial</label>
                        <span className="text-xs font-bold text-slate-800">{settings.advancePercentage ?? 80}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" step="5"
                        value={settings.advancePercentage ?? 80}
                        onChange={e => {
                          const val = Number(e.target.value);
                          onChange('advancePercentage', val);
                          onChange('completionPercentage', 100 - val);
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* % Fin */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">% Pago al Finalizar</label>
                        <span className="text-xs font-bold text-slate-800">{settings.completionPercentage ?? 20}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" step="5"
                        value={settings.completionPercentage ?? 20}
                        onChange={e => {
                          const val = Number(e.target.value);
                          onChange('completionPercentage', val);
                          onChange('advancePercentage', 100 - val);
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Apply Button */}
                    <button
                      type="button"
                      onClick={() => onApplyTerms && onApplyTerms()}
                      className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5"
                    >
                      <FileText size={14} /> Aplicar/Actualizar en Notas
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Firmas y Sellos Section */}
            <div className="pt-4 border-t border-slate-200 mt-6 space-y-4">
              <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <FileSignature size={12} className="text-blue-600" /> Firmas y Sellos
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Habilita firmas de responsables y sellos de Bioelectrónica en la parte inferior del documento.
              </p>

              {/* Firmas Area */}
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Mostrar Firmas</p>
                    <p className="text-[10px] text-slate-400">Mostrar firmas de responsables</p>
                  </div>
                  <button
                    onClick={() => onChange('showSignatures', !settings.showSignatures)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showSignatures ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showSignatures ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {settings.showSignatures && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {signaturesList.map((sig, idx) => (
                      <div key={sig.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Firmante #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            {signaturesList.length > 1 && (
                              <button
                                onClick={() => deleteSignature(idx)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                title="Eliminar Firmante"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => updateSignature(idx, 'enabled', !sig.enabled)}
                              className={`w-8 h-4 rounded-full transition-all relative ${
                                sig.enabled ? 'bg-blue-500' : 'bg-slate-300'
                              }`}
                            >
                              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                                sig.enabled ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>

                        {sig.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre</label>
                              <input
                                type="text"
                                value={sig.name}
                                onChange={e => updateSignature(idx, 'name', e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                placeholder="Ej: Ing. Emilia Zapata"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Cargo</label>
                              <input
                                type="text"
                                value={sig.role}
                                onChange={e => updateSignature(idx, 'role', e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                placeholder="Ej: Jefa de Biomédica"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Firma</label>
                              <div 
                                onClick={() => {
                                  setActiveLibraryType('signature');
                                  setActiveSigIndex(idx);
                                }}
                                className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-white hover:border-blue-400 cursor-pointer transition-all"
                              >
                                <div className="h-10 w-24 flex items-center justify-center bg-slate-100/50 rounded overflow-hidden">
                                  {sig.imageUrl ? (
                                    <img src={sig.imageUrl} alt="Firma" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-semibold">Seleccionar...</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Cambiar</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={addSignature}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-blue-600 hover:text-blue-700 text-xs font-bold rounded-xl transition-all border border-dashed border-slate-300 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Agregar Firmante
                    </button>

                    {/* Slider for Signature height */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alto de Firmas</label>
                        <span className="text-[10px] font-bold text-slate-700">{settings.signatureHeight ?? 64}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" max="200" step="2"
                        value={settings.signatureHeight ?? 64}
                        onChange={e => onChange('signatureHeight', Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Slider for Signature spacing (Margin Top) */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ajuste Vertical Firmas</label>
                        <span className="text-[10px] font-bold text-slate-700">{settings.signatureSpacing ?? 0}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-60" max="60" step="1"
                        value={settings.signatureSpacing ?? 0}
                        onChange={e => onChange('signatureSpacing', Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sellos Area */}
              <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Mostrar Sellos</p>
                    <p className="text-[10px] text-slate-400">Habilitar sellos en el documento</p>
                  </div>
                  <button
                    onClick={() => onChange('showSeals', !settings.showSeals)}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showSeals ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settings.showSeals ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {settings.showSeals && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {/* Toggle Sello de la Empresa */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Sello Bioelectrónica</p>
                        <p className="text-[10px] text-slate-400">Sello oficial de la empresa</p>
                      </div>
                      <button
                        onClick={() => onChange('showCompanySeal', settings.showCompanySeal !== false ? false : true)}
                        className={`w-8 h-4 rounded-full transition-all relative ${
                          settings.showCompanySeal !== false ? 'bg-blue-500' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                          settings.showCompanySeal !== false ? 'left-4' : 'left-0.5'
                        }`} />
                      </button>
                    </div>

                    {settings.showCompanySeal !== false && (
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Imagen de Sello Empresa</label>
                        <div 
                          onClick={() => {
                            setActiveLibraryType('seal');
                            setActiveSealField('company');
                          }}
                          className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-white hover:border-blue-400 cursor-pointer transition-all"
                        >
                          <div className="h-10 w-10 flex items-center justify-center bg-slate-100/50 rounded overflow-hidden">
                            <img 
                              src={settings.companySealUrl || '/firmas-sellos/SELLO DE BIOELECTRONICA.png'} 
                              alt="Sello Empresa" 
                              className="max-h-full max-w-full object-contain mix-blend-multiply" 
                            />
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Cambiar Sello</span>
                        </div>
                      </div>
                    )}

                    {/* Sello de Estado Select */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sello de Estado</label>
                      <select
                        value={
                          (settings.selectedStatusSeal && settings.selectedStatusSeal !== 'none' && settings.selectedStatusSeal !== 'cancelado' && settings.selectedStatusSeal !== 'entregado')
                            ? 'custom'
                            : (settings.selectedStatusSeal || 'none')
                        }
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setActiveLibraryType('seal');
                            setActiveSealField('status');
                            // Fallback to first seal in library
                            const firstCustom = sealsLibrary.find(s => !s.startsWith('/firmas-sellos/')) || sealsLibrary[0];
                            onChange('selectedStatusSeal', firstCustom);
                          } else {
                            onChange('selectedStatusSeal', val);
                          }
                        }}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 cursor-pointer"
                      >
                        <option value="none">Ninguno</option>
                        <option value="entregado">Entregado (Azul/Verde)</option>
                        <option value="cancelado">Cancelado (Rojo)</option>
                        <option value="custom">Personalizado (de biblioteca)</option>
                      </select>
                    </div>

                    {(settings.selectedStatusSeal && settings.selectedStatusSeal !== 'none' && settings.selectedStatusSeal !== 'cancelado' && settings.selectedStatusSeal !== 'entregado') && (
                      <div className="space-y-1 pt-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Imagen de Sello Estado</label>
                        <div 
                          onClick={() => {
                            setActiveLibraryType('seal');
                            setActiveSealField('status');
                          }}
                          className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-white hover:border-blue-400 cursor-pointer transition-all"
                        >
                          <div className="h-10 w-10 flex items-center justify-center bg-slate-100/50 rounded overflow-hidden">
                            <img 
                              src={settings.selectedStatusSeal} 
                              alt="Sello de Estado" 
                              className="max-h-full max-w-full object-contain mix-blend-multiply" 
                            />
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Cambiar Sello</span>
                        </div>
                      </div>
                    )}

                    {/* Slider for Seal size */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tamaño de Sellos</label>
                        <span className="text-[10px] font-bold text-slate-700">{settings.sealSize ?? 112}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" max="350" step="2"
                        value={settings.sealSize ?? 112}
                        onChange={e => onChange('sealSize', Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Company Seal Alignment Position Select */}
                    {settings.showCompanySeal !== false && (
                      <div className="space-y-1 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alineación Sello Empresa</label>
                        <select
                          value={settings.companySealPosition || 'manuel'}
                          onChange={e => onChange('companySealPosition', e.target.value as any)}
                          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 cursor-pointer"
                        >
                          {signaturesList.map(sig => (
                            <option key={sig.id} value={sig.id}>Encima de {sig.name}</option>
                          ))}
                          <option value="center">Centrado (Medio)</option>
                          <option value="right">Esquina Derecha</option>
                        </select>
                      </div>
                    )}

                    {/* Status Seal Alignment Position Select */}
                    {settings.selectedStatusSeal !== 'none' && (
                      <div className="space-y-1 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ubicación Sello de Estado</label>
                        <select
                          value={settings.statusSealPosition || 'right'}
                          onChange={e => onChange('statusSealPosition', e.target.value as any)}
                          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 cursor-pointer"
                        >
                          <option value="right">Esquina Superior Derecha</option>
                          <option value="center">Centrado (Medio)</option>
                          {signaturesList.map(sig => (
                            <option key={sig.id} value={sig.id}>Sobre {sig.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Eliminar Plantilla</h3>
              <p className="text-sm text-center text-slate-500 mb-1">
                ¿Estás seguro de que quieres eliminar la plantilla <strong className="text-slate-700">"{templateToDelete.name}"</strong>?
              </p>
              <p className="text-xs text-center text-red-500 bg-red-50 p-2 rounded-lg mt-3">
                Esta acción es irreversible y perderás tu configuración guardada.
              </p>
            </div>
            <div className="border-t border-slate-100 p-4 flex gap-3 bg-slate-50">
              <button 
                onClick={() => setTemplateToDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteTemplate}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-200"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Modal for Signatures/Seals */}
      {activeLibraryType && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {activeLibraryType === 'signature' ? 'Biblioteca de Firmas' : 'Biblioteca de Sellos'}
              </h3>
              <button 
                onClick={() => {
                  setActiveLibraryType(null);
                  setActiveSigIndex(null);
                  setActiveSealField(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 max-h-[350px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {/* Upload Card */}
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-blue-50/20 aspect-square group">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file, activeLibraryType);
                        if (url) {
                          // Select the newly uploaded file automatically
                          if (activeLibraryType === 'signature' && activeSigIndex !== null) {
                            updateSignature(activeSigIndex, 'imageUrl', url);
                          } else if (activeLibraryType === 'seal') {
                            if (activeSealField === 'company') {
                              onChange('companySealUrl', url);
                            } else if (activeSealField === 'status') {
                              onChange('selectedStatusSeal', url);
                            }
                          }
                          setActiveLibraryType(null);
                          setActiveSigIndex(null);
                          setActiveSealField(null);
                        }
                      }
                    }}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
                      <span className="text-[9px] text-slate-400 font-bold">Subiendo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <UploadCloud className="text-blue-600 group-hover:scale-110 transition-transform w-6 h-6" />
                      <span className="text-[10px] text-slate-500 font-bold">Subir PNG</span>
                    </div>
                  )}
                </label>

                {/* Library Items */}
                {(activeLibraryType === 'signature' ? signaturesLibrary : sealsLibrary).map((url, i) => {
                  const isSelected = activeLibraryType === 'signature'
                    ? (activeSigIndex !== null && signaturesList[activeSigIndex]?.imageUrl === url)
                    : (activeSealField === 'company' ? (settings.companySealUrl || '/firmas-sellos/SELLO DE BIOELECTRONICA.png') === url : settings.selectedStatusSeal === url);

                  const isDefault = url.startsWith('/firmas-sellos/');

                  return (
                    <div 
                      key={i} 
                      className={`relative rounded-xl border p-2 flex items-center justify-center cursor-pointer transition-all aspect-square bg-slate-50/50 hover:bg-white group ${
                        isSelected ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-400'
                      }`}
                      onClick={() => {
                        if (activeLibraryType === 'signature' && activeSigIndex !== null) {
                          updateSignature(activeSigIndex, 'imageUrl', url);
                        } else if (activeLibraryType === 'seal') {
                          if (activeSealField === 'company') {
                            onChange('companySealUrl', url);
                          } else if (activeSealField === 'status') {
                            onChange('selectedStatusSeal', url);
                          }
                        }
                        setActiveLibraryType(null);
                        setActiveSigIndex(null);
                        setActiveSealField(null);
                      }}
                    >
                      <img src={url} alt="Item" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      
                      {/* Delete button from library (only if not default) */}
                      {!isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar esta imagen de la biblioteca?')) {
                              if (activeLibraryType === 'signature') {
                                onChange('signaturesLibrary', signaturesLibrary.filter(u => u !== url));
                              } else {
                                onChange('sealsLibrary', sealsLibrary.filter(u => u !== url));
                              }
                            }
                          }}
                          className="absolute -top-1 -right-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-red-200"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-right">
              <button 
                onClick={() => {
                  setActiveLibraryType(null);
                  setActiveSigIndex(null);
                  setActiveSealField(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
