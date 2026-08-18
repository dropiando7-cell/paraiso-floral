'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Building2, MapPin, Phone, Mail, FileBadge, CreditCard, Clock, FileText, User } from 'lucide-react';
import { createContacto, updateContacto } from '@/app/(dashboard)/contactos/actions';

export const DEPARTAMENTOS_HONDURAS = [
  'Atlántida',
  'Choluteca',
  'Colón',
  'Comayagua',
  'Copán',
  'Cortés',
  'El Paraíso',
  'Francisco Morazán',
  'Gracias a Dios',
  'Intibucá',
  'Islas de la Bahía',
  'La Paz',
  'Lempira',
  'Ocotepeque',
  'Olancho',
  'Santa Bárbara',
  'Valle',
  'Yoro'
];

export interface ClienteFormData {
  id?: string;
  nombre: string;
  rtn?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  departamento?: string | null;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  emailsCC?: string | null;
  limiteCredito?: number | null;
  saldoInicial?: number | null;
  diasCredito?: number | null;
  notas?: string | null;
}

interface ContactoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (savedContacto?: any) => void;
  initialContacto?: Partial<ClienteFormData> | null;
}

export default function ContactoModal({
  open,
  onClose,
  onSuccess,
  initialContacto
}: ContactoModalProps) {
  const [formData, setFormData] = useState<Partial<ClienteFormData>>(initialContacto || {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormData(initialContacto || {});
      setError(null);
    }
  }, [open, initialContacto]);

  if (!open) return null;

  const isEdit = !!formData.id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre?.trim()) {
      setError('El nombre o razón social es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      let savedResult;
      const payload = {
        nombre: formData.nombre.trim(),
        email: formData.email?.trim() || undefined,
        telefono: formData.telefono?.trim() || undefined,
        direccion: formData.direccion?.trim() || undefined,
        departamento: formData.departamento || undefined,
        rtn: formData.rtn?.trim() || undefined,
        nombreContacto: formData.nombreContacto?.trim() || undefined,
        telefonoContacto: formData.telefonoContacto?.trim() || undefined,
        emailsCC: formData.emailsCC?.trim() || undefined,
        limiteCredito: formData.limiteCredito !== undefined && formData.limiteCredito !== null ? Number(formData.limiteCredito) : 0,
        diasCredito: formData.diasCredito !== undefined && formData.diasCredito !== null ? Number(formData.diasCredito) : 15,
        notas: formData.notas?.trim() || undefined
      };

      if (isEdit && formData.id) {
        savedResult = await updateContacto(formData.id, payload);
      } else {
        savedResult = await createContacto(payload);
      }

      onSuccess(savedResult);
      onClose();
    } catch (e: any) {
      console.error('Error guardando contacto:', e);
      setError(e.message || 'Error guardando información del cliente');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight text-white">
                {isEdit ? 'Editar Cliente / Contacto' : 'Nuevo Cliente Distribución'}
              </h2>
              <p className="text-xs text-emerald-200">Catálogo oficial de Distribuidora Paraíso Floral</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200">
              ⚠️ {error}
            </div>
          )}

          {/* Bloque 1: Empresa / Nombre */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nombre Comercial / Razón Social <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Floristería Las Rosas S. de R.L."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.nombre || ''}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Empresa / WhatsApp</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300/80 select-none shrink-0 pointer-events-none z-10">
                    +504
                  </span>
                  <input
                    type="tel"
                    placeholder="9999-8888"
                    className="w-full pl-16 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={(formData.telefono || '').replace(/^\+504\s*/, '')}
                    onChange={e => {
                      const raw = e.target.value.replace(/^\+504\s*/, '');
                      setFormData({ ...formData, telefono: raw ? `+504 ${raw}` : '' });
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RTN / DNI Identidad</label>
                <input
                  type="text"
                  placeholder="08011990123456"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.rtn || ''}
                  onChange={e => setFormData({ ...formData, rtn: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Contacto Directo Encargado */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Datos del Encargado / Comprador Directo
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Encargado</label>
                <input
                  type="text"
                  placeholder="Ej: Ing. Mario Castellanos"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.nombreContacto || ''}
                  onChange={e => setFormData({ ...formData, nombreContacto: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Directo Encargado</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300/80 select-none shrink-0 pointer-events-none z-10">
                    +504
                  </span>
                  <input
                    type="tel"
                    placeholder="8888-0000"
                    className="w-full pl-16 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={(formData.telefonoContacto || '').replace(/^\+504\s*/, '')}
                    onChange={e => {
                      const raw = e.target.value.replace(/^\+504\s*/, '');
                      setFormData({ ...formData, telefonoContacto: raw ? `+504 ${raw}` : '' });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Correos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico Principal</label>
              <input
                type="email"
                placeholder="compras@empresa.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correos Copia (CC)</label>
              <input
                type="text"
                placeholder="contabilidad@empresa.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.emailsCC || ''}
                onChange={e => setFormData({ ...formData, emailsCC: e.target.value })}
              />
            </div>
          </div>

          {/* Bloque 4: Ubicación Honduras */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ubicación y Departamento (Honduras)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Departamento *</label>
                <select
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  value={formData.departamento || ''}
                  onChange={e => setFormData({ ...formData, departamento: e.target.value })}
                >
                  <option value="">-- Seleccionar los 18 Departamentos --</option>
                  {DEPARTAMENTOS_HONDURAS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Física / Ciudad</label>
                <input
                  type="text"
                  placeholder="Colonia, calle, bodega o punto de referencia..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.direccion || ''}
                  onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bloque 5: Condiciones de Crédito Distribuidora */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Condiciones Financieras de Crédito
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded">
                Paraíso Floral CxC
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Límite de Crédito (Lempiras)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">L.</span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Ej: 25000"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.limiteCredito !== undefined && formData.limiteCredito !== null ? formData.limiteCredito : ''}
                    onChange={e => setFormData({ ...formData, limiteCredito: e.target.value ? parseFloat(e.target.value) : 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Saldo Inicial (Excel) <span className="text-amber-600 font-normal">(Deuda previa)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700">L.</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    placeholder="Ej: 15000"
                    className="w-full pl-8 pr-3 py-2 bg-amber-50/70 border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.saldoInicial !== undefined && formData.saldoInicial !== null ? formData.saldoInicial : ''}
                    onChange={e => setFormData({ ...formData, saldoInicial: e.target.value ? parseFloat(e.target.value) : 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Plazo de Crédito Rotativo</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  value={formData.diasCredito !== undefined && formData.diasCredito !== null ? formData.diasCredito : 15}
                  onChange={e => setFormData({ ...formData, diasCredito: parseInt(e.target.value) })}
                >
                  <option value={7}>7 Días (Semanal)</option>
                  <option value={15}>15 Días (Quincenal)</option>
                  <option value={30}>30 Días (Mensual)</option>
                  <option value={45}>45 Días (Especial)</option>
                  <option value={60}>60 Días (Especial)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notas Comerciales u Observaciones de Crédito</label>
              <textarea
                rows={2}
                placeholder="Ej: Cliente compra rosas y gerberas por bulto, paga transferencias Ficohsa los días martes..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.notas || ''}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
