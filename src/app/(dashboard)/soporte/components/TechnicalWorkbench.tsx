'use client';

import React, { useState, useRef } from 'react';
import { Settings, X, UploadCloud, Save } from 'lucide-react';

type TechnicalWorkbenchProps = {
  orderData: any;
};

export default function TechnicalWorkbench({ orderData }: TechnicalWorkbenchProps) {
  const [repuestos, setRepuestos] = useState([
    { id: 1, descripcion: "Fuente de poder 12V/5A", codigo: "REP-0042", cantidad: 1, precio: 850.00 },
    { id: 2, descripcion: "Condensador electrolítico 1000µF", codigo: "REP-0118", cantidad: 3, precio: 45.00 },
  ]);
  const [horas, setHoras] = useState([
    { id: 1, descripcion: "Diagnóstico inicial completo", horas: 1.5, tarifa: 400 },
    { id: 2, descripcion: "Desmontaje y revisión interna", horas: 2.0, tarifa: 400 },
  ]);
  
  const [nuevoRep, setNuevoRep] = useState({ descripcion: "", codigo: "", cantidad: 1, precio: "" });
  const [nuevaHora, setNuevaHora] = useState({ descripcion: "", horas: "", tarifa: 400 });
  const [diagnostico, setDiagnostico] = useState("Fuente de poder quemada por sobretensión. Condensadores electrolíticos dañados en placa principal.");
  const [fotoFalla, setFotoFalla] = useState<{name: string; url: string; file: File}[]>([]);
  const [activeTab, setActiveTab] = useState("repuestos");
  const fileRef2 = useRef<HTMLInputElement>(null);

  const totalRepuestos = repuestos.reduce((s, r) => s + r.cantidad * r.precio, 0);
  const totalMano = horas.reduce((s, h) => s + h.horas * h.tarifa, 0);
  const totalGeneral = totalRepuestos + totalMano;

  const addRep = () => {
    if (!nuevoRep.descripcion) return;
    setRepuestos(p => [...p, { ...nuevoRep, id: Date.now(), precio: parseFloat(nuevoRep.precio) || 0 }]);
    setNuevoRep({ descripcion: "", codigo: "", cantidad: 1, precio: "" });
  };
  const addHora = () => {
    if (!nuevaHora.descripcion) return;
    setHoras(p => [...p, { ...nuevaHora, id: Date.now(), horas: parseFloat(nuevaHora.horas) || 0 }]);
    setNuevaHora({ descripcion: "", horas: "", tarifa: 400 });
  };

  const tabBtn = (id: string, label: string) => (
    <button 
      onClick={() => setActiveTab(id)} 
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        activeTab === id ? "bg-indigo-600 text-white shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h4 className="m-0 text-[15px] font-bold text-slate-900 tracking-tight">Mesa de Trabajo Técnico</h4>
          <p className="m-0 text-xs text-slate-500 font-medium">
            {orderData?.tecnicoReparacion?.nombre || "Técnico Asignado"} · Orden #{orderData?.codigoSeguridad || "Nueva"}
          </p>
        </div>
        <div className="ml-auto bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[11px] font-bold">
          ⚙ En Reparación
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Diagnóstico Técnico</label>
        <textarea 
          value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors resize-none h-20"
          placeholder="Escribe el reporte técnico detallado aquí..."
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl w-fit">
        {tabBtn("repuestos", "🔩 Repuestos")}
        {tabBtn("mano", "⏱ Mano de Obra")}
        {tabBtn("fotos", "📷 Fotos Falla")}
      </div>

      {/* Tab: Repuestos */}
      {activeTab === "repuestos" && (
        <div>
          <table className="w-full text-left border-collapse text-xs mb-3">
            <thead>
              <tr className="border-b-2 border-slate-100">
                {["Descripción","Código","Cant.","Precio Unit.","Subtotal",""].map(h => (
                  <th key={h} className="py-2 px-2 text-slate-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repuestos.map(r => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2 px-2 text-slate-800 font-medium">{r.descripcion}</td>
                  <td className="py-2 px-2 text-slate-500 font-mono">{r.codigo}</td>
                  <td className="py-2 px-2 text-slate-800 font-medium text-center">{r.cantidad}</td>
                  <td className="py-2 px-2 text-slate-800 font-medium">L {r.precio.toFixed(2)}</td>
                  <td className="py-2 px-2 text-slate-800 font-bold">L {(r.cantidad * r.precio).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    <button onClick={() => setRepuestos(p => p.filter(x => x.id !== r.id))} className="text-red-500 hover:text-red-700 bg-transparent p-1 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Add row */}
          <div className="grid grid-cols-[2fr_1fr_0.5fr_1fr_auto] gap-2 items-center">
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
              placeholder="Descripción repuesto..." value={nuevoRep.descripcion} onChange={e => setNuevoRep(p => ({...p, descripcion: e.target.value}))}/>
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
              placeholder="Código" value={nuevoRep.codigo} onChange={e => setNuevoRep(p => ({...p, codigo: e.target.value}))}/>
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none w-full" 
              type="number" min="1" placeholder="1" value={nuevoRep.cantidad} onChange={e => setNuevoRep(p => ({...p, cantidad: parseInt(e.target.value)||1}))}/>
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
              type="number" placeholder="Precio L." value={nuevoRep.precio} onChange={e => setNuevoRep(p => ({...p, precio: e.target.value}))}/>
            <button onClick={addRep} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors">+ Add</button>
          </div>
          <div className="mt-4 text-right text-xs text-slate-600 font-medium">
            Total Repuestos: <strong className="text-indigo-600 text-sm ml-1">L {totalRepuestos.toFixed(2)}</strong>
          </div>
        </div>
      )}

      {/* Tab: Mano de Obra */}
      {activeTab === "mano" && (
        <div>
          <table className="w-full text-left border-collapse text-xs mb-3">
            <thead>
              <tr className="border-b-2 border-slate-100">
                {["Actividad","Horas","Tarifa/Hr","Subtotal",""].map(h => (
                  <th key={h} className="py-2 px-2 text-slate-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horas.map(h => (
                <tr key={h.id} className="border-b border-slate-50">
                  <td className="py-2 px-2 text-slate-800 font-medium">{h.descripcion}</td>
                  <td className="py-2 px-2 text-slate-800 font-medium text-center">{h.horas}v</td>
                  <td className="py-2 px-2 text-slate-500 font-medium">L {h.tarifa}/hr</td>
                  <td className="py-2 px-2 text-slate-800 font-bold">L {(h.horas * h.tarifa).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    <button onClick={() => setHoras(p => p.filter(x => x.id !== h.id))} className="text-red-500 hover:text-red-700 bg-transparent p-1 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-[2fr_0.8fr_1fr_auto] gap-2 items-center">
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
              placeholder="Actividad realizada..." value={nuevaHora.descripcion} onChange={e => setNuevaHora(p => ({...p, descripcion: e.target.value}))}/>
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
              type="number" placeholder="Hrs" value={nuevaHora.horas} onChange={e => setNuevaHora(p => ({...p, horas: e.target.value}))}/>
            <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
              type="number" placeholder="Tarifa L." value={nuevaHora.tarifa} onChange={e => setNuevaHora(p => ({...p, tarifa: parseFloat(e.target.value)||400}))}/>
            <button onClick={addHora} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors">+ Add</button>
          </div>
          <div className="mt-4 text-right text-xs text-slate-600 font-medium">
            Total Mano de Obra: <strong className="text-indigo-600 text-sm ml-1">L {totalMano.toFixed(2)}</strong>
          </div>
        </div>
      )}

      {/* Tab: Fotos */}
      {activeTab === "fotos" && (
        <div>
          <div onClick={() => fileRef2.current?.click()} 
            onDrop={e => { 
              e.preventDefault(); 
              if(e.dataTransfer.files) {
                 const files = Array.from(e.dataTransfer.files).map(f => ({name:f.name,url:URL.createObjectURL(f), file: f})); 
                 setFotoFalla(p=>[...p,...files]); 
              }
            }}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-colors mb-4">
            <input ref={fileRef2} type="file" multiple accept="image/*" className="hidden" onChange={e => {
              if(!e.target.files) return;
              const files = Array.from(e.target.files).map(f => ({name:f.name,url:URL.createObjectURL(f), file: f}));
              setFotoFalla(p=>[...p,...files]);
            }}/>
            <UploadCloud className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="m-0 text-[13px] text-slate-500 font-medium">
              Arrastra fotos de la falla o <span className="text-indigo-600 font-bold">haz clic</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fotoFalla.length === 0 && (
              <div className="w-full text-center py-6 text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-slate-100">
                Sin fotos adjuntas. Documenta la falla para respaldo técnico.
              </div>
            )}
            {fotoFalla.map((p, i) => (
              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 relative group">
                <img src={p.url} alt="" className="w-full h-full object-cover"/>
                <button onClick={() => setFotoFalla(pp => pp.filter((_,j)=>j!==i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totales y Save */}
      <div className="mt-auto">
          <div className="mt-4 mb-4 p-3 bg-slate-50 rounded-xl flex justify-between items-center">
            <div className="text-xs text-slate-500 font-medium">
              Repuestos: <span className="text-slate-800 font-bold ml-1">L {totalRepuestos.toFixed(2)}</span>
              <span className="mx-2 text-slate-300">|</span>
              Mano Obra: <span className="text-slate-800 font-bold ml-1">L {totalMano.toFixed(2)}</span>
            </div>
            <div className="text-[15px] font-bold text-indigo-600">
              Total: L {totalGeneral.toFixed(2)}
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
             <Save className="w-4 h-4" /> Guardar Cotización
          </button>
      </div>
    </div>
  );
}
