'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, UploadCloud, Save, Search, Loader2 } from 'lucide-react';
import { searchRepuestos, guardarDiagnostico } from '../actions';
import { useRouter } from 'next/navigation';

type TechnicalWorkbenchProps = {
  orderData: any;
};

export default function TechnicalWorkbench({ orderData }: TechnicalWorkbenchProps) {
  const router = useRouter();
  
  const [repuestos, setRepuestos] = useState<any[]>(
    orderData?.repuestos?.map((r: any) => ({
      id: r.id,
      productoId: r.productoId,
      descripcion: r.producto?.nombre || 'Producto Desconocido',
      codigo: r.producto?.sku || '-',
      cantidad: r.cantidad,
      precio: Number(r.precioSugerido) || 0
    })) || []
  );
  
  const [horas, setHoras] = useState<any[]>(
    orderData?.detalleManoObra || []
  );
  
  const [diagnostico, setDiagnostico] = useState(orderData?.diagnosticoTecnico || "");
  const [nuevaHora, setNuevaHora] = useState({ descripcion: "", horas: "", tarifa: 400 });
  const [fotoFalla, setFotoFalla] = useState<{name: string; url: string; file?: File}[]>(
    orderData?.fotosTecnico?.map((url: string, i: number) => ({ name: `foto-${i}`, url })) || []
  );
  const [activeTab, setActiveTab] = useState("repuestos");
  const fileRef2 = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchRepuestos(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const totalRepuestos = repuestos.reduce((s, r) => s + r.cantidad * r.precio, 0);
  const totalMano = horas.reduce((s, h) => s + h.horas * h.tarifa, 0);
  const totalGeneral = totalRepuestos + totalMano;

  const handleAddRepuesto = (prod: any) => {
    const exists = repuestos.find(r => r.productoId === prod.id);
    if (exists) {
       setRepuestos(p => p.map(r => r.productoId === prod.id ? { ...r, cantidad: r.cantidad + 1 } : r));
    } else {
       setRepuestos(p => [...p, {
           id: Date.now().toString(),
           productoId: prod.id,
           descripcion: prod.nombre,
           codigo: prod.sku,
           cantidad: 1,
           precio: prod.precioVenta
       }]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const addHora = () => {
    if (!nuevaHora.descripcion) return;
    setHoras(p => [...p, { ...nuevaHora, id: Date.now().toString(), horas: parseFloat(nuevaHora.horas) || 0 }]);
    setNuevaHora({ descripcion: "", horas: "", tarifa: 400 });
  };

  const handleGuardarCotizacion = async () => {
    if (!diagnostico.trim()) {
        alert("El diagnóstico es requerido para generar la cotización.");
        return;
    }
    setIsSaving(true);
    try {
        const uploadedUrls = [];
        for (const photo of fotoFalla) {
            if (!photo.file) {
                uploadedUrls.push(photo.url);
                continue;
            }
            const contentType = photo.file.type || 'application/octet-stream';
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: photo.name, contentType })
            });
            if (!res.ok) throw new Error("Error servidor URL");
            const { uploadUrl, publicUrl } = await res.json();
            
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: photo.file,
                headers: { 'Content-Type': contentType }
            });
            if (!uploadRes.ok) throw new Error("Error Cloudflare R2");
            uploadedUrls.push(publicUrl);
        }

        await guardarDiagnostico(orderData.id, diagnostico, repuestos, horas, totalGeneral, uploadedUrls);
        router.refresh();
    } catch (e) {
        console.error("Error al guardar", e);
        alert("Ocurrió un error al guardar la cotización.");
    } finally {
        setIsSaving(false);
    }
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
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col">
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
          ⚙ {orderData?.estado === 'ESPERANDO_APROBACION' ? 'Presupuesto Creado' : 'En Evaluación'}
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Diagnóstico Técnico</label>
        <textarea 
          value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors resize-none h-20"
          placeholder="Escribe el reporte técnico detallado aquí..."
        />
      </div>

      <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl w-fit">
        {tabBtn("repuestos", "🔩 Repuestos")}
        {tabBtn("mano", "⏱ Mano de Obra")}
        {tabBtn("fotos", "📷 Fotos Falla")}
      </div>

      <div className="flex-grow">
        {activeTab === "repuestos" && (
          <div className="flex flex-col h-full">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar componente en inventario (Nombre o Código)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              {isSearching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-slate-400" />}
              
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(prod => (
                    <div 
                      key={prod.id} 
                      onClick={() => handleAddRepuesto(prod)}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">{prod.nombre}</div>
                        <div className="text-xs text-slate-500 font-mono">{prod.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">L {prod.precioVenta.toFixed(2)}</div>
                        <div className={`text-xs ${prod.stockActual > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          Stock: {prod.stockActual}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                    <td className="py-2 px-2 text-slate-800 font-medium text-center">
                      <input 
                        type="number" 
                        min="1" 
                        className="w-12 text-center border border-slate-200 rounded px-1 py-0.5 outline-none"
                        value={r.cantidad}
                        onChange={(e) => {
                           const val = parseInt(e.target.value) || 1;
                           setRepuestos(p => p.map(x => x.id === r.id ? {...x, cantidad: val} : x));
                        }}
                      />
                    </td>
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
            
            <div className="mt-auto text-right text-xs text-slate-600 font-medium">
              Total Repuestos: <strong className="text-indigo-600 text-sm ml-1">L {totalRepuestos.toFixed(2)}</strong>
            </div>
          </div>
        )}

        {activeTab === "mano" && (
          <div className="flex flex-col h-full">
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
                    <td className="py-2 px-2 text-slate-800 font-medium text-center">{h.horas}</td>
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
            <div className="grid grid-cols-[2fr_0.8fr_1fr_auto] gap-2 items-center mb-4">
              <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
                placeholder="Actividad realizada..." value={nuevaHora.descripcion} onChange={e => setNuevaHora(p => ({...p, descripcion: e.target.value}))}/>
              <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
                type="number" placeholder="Hrs" value={nuevaHora.horas} onChange={e => setNuevaHora(p => ({...p, horas: e.target.value}))}/>
              <input className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
                type="number" placeholder="Tarifa L." value={nuevaHora.tarifa} onChange={e => setNuevaHora(p => ({...p, tarifa: parseFloat(e.target.value)||400}))}/>
              <button onClick={addHora} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors">+ Add</button>
            </div>
            <div className="mt-auto text-right text-xs text-slate-600 font-medium">
              Total Mano de Obra: <strong className="text-indigo-600 text-sm ml-1">L {totalMano.toFixed(2)}</strong>
            </div>
          </div>
        )}

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
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="mb-4 p-3 bg-slate-50 rounded-xl flex justify-between items-center">
            <div className="text-xs text-slate-500 font-medium">
              Repuestos: <span className="text-slate-800 font-bold ml-1">L {totalRepuestos.toFixed(2)}</span>
              <span className="mx-2 text-slate-300">|</span>
              Mano Obra: <span className="text-slate-800 font-bold ml-1">L {totalMano.toFixed(2)}</span>
            </div>
            <div className="text-[15px] font-bold text-indigo-600">
              Total Sugerido: L {totalGeneral.toFixed(2)}
            </div>
          </div>
          <button 
            onClick={handleGuardarCotizacion}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             {isSaving ? "Guardando..." : "Guardar Cotización"}
          </button>
      </div>
    </div>
  );
}
