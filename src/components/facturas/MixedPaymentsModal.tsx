import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

export interface MixedPayment {
  id: string;
  metodo: string;
  monto: number;
  referencia: string;
  banco: string;
}

interface MixedPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  payments: MixedPayment[];
  onSave: (payments: MixedPayment[]) => void;
}

export default function MixedPaymentsModal({
  isOpen,
  onClose,
  totalAmount,
  payments: initialPayments,
  onSave,
}: MixedPaymentsModalProps) {
  const [payments, setPayments] = useState<MixedPayment[]>(initialPayments);

  useEffect(() => {
    if (isOpen) {
      setPayments(initialPayments.length > 0 ? initialPayments : [
        { id: Math.random().toString(36).substring(7), metodo: 'Efectivo', monto: 0, referencia: '', banco: '' }
      ]);
    }
  }, [isOpen, initialPayments]);

  if (!isOpen) return null;

  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const remaining = totalAmount - totalPaid;

  const handleAddPayment = () => {
    if (remaining <= 0) {
      toast.error('El monto total ya ha sido cubierto.');
      return;
    }
    setPayments([...payments, {
      id: Math.random().toString(36).substring(7),
      metodo: 'Transferencia Bancaria',
      monto: remaining,
      referencia: '',
      banco: ''
    }]);
  };

  const handleRemovePayment = (id: string) => {
    if (payments.length === 1) {
      toast.error('Debe haber al menos un método de pago.');
      return;
    }
    setPayments(payments.filter(p => p.id !== id));
  };

  const handleChange = (id: string, field: keyof MixedPayment, value: any) => {
    setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = () => {
    // Redondeo a 2 decimales para evitar problemas de coma flotante
    const remainingRounded = Math.round(remaining * 100) / 100;
    
    if (remainingRounded !== 0) {
      toast.error(`El pago total debe ser exactamente L. ${totalAmount.toFixed(2)}. Falta cubrir L. ${remaining.toFixed(2)}.`);
      return;
    }

    const invalid = payments.find(p => p.monto <= 0);
    if (invalid) {
      toast.error('Todos los montos deben ser mayores a 0.');
      return;
    }

    onSave(payments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Pago Dividido / Mixto</h3>
              <p className="text-xs text-slate-500 font-medium">Distribuya el monto total en varios métodos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-bold text-blue-800">Total a Pagar:</span>
            <span className="text-xl font-black text-blue-700">L. {totalAmount.toFixed(2)}</span>
          </div>

          <div className="space-y-3">
            {payments.map((p, i) => (
              <div key={p.id} className="border border-slate-200 rounded-xl p-4 relative bg-slate-50">
                <button
                  type="button"
                  onClick={() => handleRemovePayment(p.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center shadow-sm"
                >
                  <Trash2 size={12} />
                </button>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Método</label>
                    <select
                      value={p.metodo}
                      onChange={(e) => handleChange(p.id, 'metodo', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      <option value="Tarjeta de Crédito/Débito">Tarjeta de Crédito/Débito</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Monto (L.)</label>
                    <input
                      type="number"
                      value={p.monto === 0 ? '' : p.monto}
                      onChange={(e) => handleChange(p.id, 'monto', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {p.metodo !== 'Efectivo' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Referencia / Banco</label>
                    <input
                      type="text"
                      placeholder="Ej: Ref #123456 Banco Atlántida"
                      value={p.referencia}
                      onChange={(e) => handleChange(p.id, 'referencia', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddPayment}
            disabled={remaining <= 0}
            className="w-full py-2.5 border-2 border-dashed border-blue-200 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} /> Añadir Pago
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Restante por Pagar</p>
            <p className={`text-lg font-black ${Math.abs(remaining) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
              L. {Math.abs(remaining) < 0.01 ? '0.00' : remaining.toFixed(2)}
            </p>
          </div>
          
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
          >
            Confirmar Desglose
          </button>
        </div>
      </div>
    </div>
  );
}
