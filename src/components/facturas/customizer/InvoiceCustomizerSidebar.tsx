'use client';
import React, { useState } from 'react';
import { X, LayoutTemplate, Palette, Type, Image as ImageIcon, Check, PanelBottom } from 'lucide-react';
import { InvoiceSettings, TemplateLayout, LogoPosition, LogoSize } from '@/types/invoice';

interface Props {
  settings: InvoiceSettings;
  onChange: (key: keyof InvoiceSettings, val: any) => void;
  onClose: () => void;
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
  { id: 'font-sans', name: 'Inter / Arial (Modern)', cssClass: 'font-sans' },
  { id: 'font-serif', name: 'Times / Georgia (Classic)', cssClass: 'font-serif' },
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

export default function InvoiceCustomizerSidebar({ settings, onChange, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'template' | 'colors' | 'font' | 'logo' | 'footer'>('template');

  return (
    <div className="w-80 border-l border-slate-200 bg-white h-screen fixed right-0 top-0 z-[60] flex flex-col shadow-2xl print:hidden animate-in slide-in-from-right duration-200">
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
          { id: 'logo',     icon: <ImageIcon size={15} />,      label: 'Logo' },
          { id: 'footer',   icon: <PanelBottom size={15} />,    label: 'Footer' },
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
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plantilla</h3>
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
              label="R.T.N."
              value={settings.footerRtn || ''}
              onChange={v => onChange('footerRtn', v)}
              placeholder="0000-0000-000000"
            />
            <FooterField
              label="Dirección"
              value={settings.footerDireccion || ''}
              onChange={v => onChange('footerDireccion', v)}
              placeholder="Dirección de la empresa..."
              multiline
            />
            <FooterField
              label="Nota adicional (opcional)"
              value={settings.footerNota || ''}
              onChange={v => onChange('footerNota', v)}
              placeholder="Ej: Gracias por su preferencia. Válido por 30 días."
              multiline
            />

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
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
                  {settings.footerTelefono && <span className="text-[9px] text-slate-600">Tel.: {settings.footerTelefono}</span>}
                  {settings.footerCorreo && <span className="text-[9px] text-slate-600">•</span>}
                  {settings.footerCorreo && <span className="text-[9px] text-slate-600 truncate max-w-[140px]">{settings.footerCorreo}</span>}
                  {settings.footerWeb && <span className="text-[9px] text-slate-600">•</span>}
                  {settings.footerWeb && <span className="text-[9px] text-slate-600">{settings.footerWeb}</span>}
                  {settings.footerRtn && <span className="text-[9px] text-slate-600">•</span>}
                  {settings.footerRtn && <span className="text-[9px] text-slate-600">R.T.N.: {settings.footerRtn}</span>}
                </div>
                {settings.footerDireccion && <p className="text-[9px] text-slate-500">{settings.footerDireccion}</p>}
                {settings.footerNota && <p className="text-[9px] text-slate-500 italic">{settings.footerNota}</p>}
                {settings.footerMostrarPagina && <p className="text-[9px] text-slate-400">Página: 1/1</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
