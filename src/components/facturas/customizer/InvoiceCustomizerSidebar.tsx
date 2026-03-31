import React, { useState } from 'react';
import { X, LayoutTemplate, Palette, Type, Image as ImageIcon, Check } from 'lucide-react';
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
];

const COLORS = [
  { id: 'blue-600', name: 'Professional Blue', hex: '#2563eb', themeClass: 'blue' },
  { id: 'emerald-600', name: 'Fresh Green', hex: '#059669', themeClass: 'emerald' },
  { id: 'violet-600', name: 'Creative Purple', hex: '#7c3aed', themeClass: 'violet' },
  { id: 'slate-800', name: 'Executive Dark', hex: '#1e293b', themeClass: 'slate' },
  { id: 'rose-600', name: 'Elegant Rose', hex: '#e11d48', themeClass: 'rose' },
];

const FONTS = [
  { id: 'font-sans', name: 'Inter (Modern)', cssClass: 'font-sans' },
  { id: 'font-serif', name: 'Merriweather (Classic)', cssClass: 'font-serif' },
  { id: 'font-mono', name: 'Roboto Mono (Tech)', cssClass: 'font-mono' },
];

export default function InvoiceCustomizerSidebar({ settings, onChange, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'template'|'colors'|'font'|'logo'>('template');

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
      <div className="flex px-2 pt-2 border-b border-slate-100 shadow-sm bg-white">
        <button onClick={() => setActiveTab('template')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 flex flex-col gap-1.5 items-center transition-colors ${activeTab === 'template' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <LayoutTemplate size={18} /> Template
        </button>
        <button onClick={() => setActiveTab('colors')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 flex flex-col gap-1.5 items-center transition-colors ${activeTab === 'colors' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Palette size={18} /> Colors
        </button>
        <button onClick={() => setActiveTab('font')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 flex flex-col gap-1.5 items-center transition-colors ${activeTab === 'font' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Type size={18} /> Font
        </button>
        <button onClick={() => setActiveTab('logo')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 flex flex-col gap-1.5 items-center transition-colors ${activeTab === 'logo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <ImageIcon size={18} /> Logo
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
        
        {activeTab === 'template' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Template</h3>
            <p className="text-xs text-slate-500 mb-2">Escoge la plantilla base de tu factura.</p>
            <div className="space-y-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onChange('template', t.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all group relative overflow-hidden ${settings.template === t.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-300 bg-white shadow-sm hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-bold text-sm ${settings.template === t.id ? 'text-blue-800' : 'text-slate-800'}`}>{t.name}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
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

        {activeTab === 'colors' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Color Themes</h3>
            <p className="text-xs text-slate-500 mb-2">Escoge el color principal que predominará.</p>
            <div className="space-y-3">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => onChange('colorTheme', c.id)}
                  className={`w-full text-left p-3 rounded-2xl border-2 transition-all group relative ${settings.colorTheme === c.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full shadow-md flex items-center justify-center" style={{ backgroundColor: c.hex }}>
                         {settings.colorTheme === c.id && <Check size={14} className="text-white" />}
                       </div>
                       <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'font' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Font Family</h3>
            <p className="text-xs text-slate-500 mb-2">Todas las fuentes están optimizadas para exportarse al PDF.</p>
            <div className="space-y-3">
              {FONTS.map(f => (
                <button
                   key={f.id}
                   onClick={() => onChange('fontFamily', f.id)}
                   className={`w-full text-left p-4 rounded-2xl border-2 transition-all group relative ${settings.fontFamily === f.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'} ${f.cssClass}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 text-lg">Aa</span>
                      <span className="font-semibold text-slate-800 ml-3">{f.name}</span>
                    </div>
                    {settings.fontFamily === f.id && <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logo' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Logo Position</h3>
              <div className="flex items-center bg-slate-200 p-1.5 rounded-xl shadow-inner">
                 {(['left', 'center', 'right'] as LogoPosition[]).map(pos => (
                   <button
                     key={pos}
                     onClick={() => onChange('logoPosition', pos)}
                     className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${settings.logoPosition === pos ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                     {pos === 'left' ? 'Izquierda' : pos === 'center' ? 'Centro' : 'Derecha'}
                   </button>
                 ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Logo Size</h3>
              <div className="flex items-center bg-slate-200 p-1.5 rounded-xl shadow-inner">
                 {(['small', 'medium', 'large'] as LogoSize[]).map(size => (
                   <button
                     key={size}
                     onClick={() => onChange('logoSize', size)}
                     className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${settings.logoSize === size ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                     {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}
                   </button>
                 ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
