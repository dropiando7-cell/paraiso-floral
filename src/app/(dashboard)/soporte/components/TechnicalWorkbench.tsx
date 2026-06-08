'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, UploadCloud, Save, Search, Loader2, Plus, Layout } from 'lucide-react';
import { searchRepuestos, guardarDiagnostico } from '../actions';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/utils/image';
import { ActivoModal } from '../../inventario/InventarioClient';
import SafeImage from '@/components/SafeImage';

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
  const [nuevaHora, setNuevaHora] = useState({ descripcion: "", horas: "", tarifa: "0" });
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
  const [isActivoModalOpen, setIsActivoModalOpen] = useState(false);
  const [dbAreas, setDbAreas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/areas')
      .then(r => r.json())
      .then(res => setDbAreas(res))
      .catch(e => console.error("Error fetching areas for ActivoModal:", e));
  }, []);

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
    setHoras(p => [...p, { ...nuevaHora, id: Date.now().toString(), horas: parseFloat(nuevaHora.horas) || 0, tarifa: 0 }]);
    setNuevaHora({ descripcion: "", horas: "", tarifa: "0" });
  };

  const handleGuardarCotizacion = async () => {
    if (!diagnostico.trim()) {
        alert("El diagnóstico es requerido para enviar a aprobación de presupuesto.");
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
            let fileToUpload = photo.file;
            try {
                fileToUpload = await compressImage(photo.file);
            } catch (compErr) {
                console.error("Compression error:", compErr);
            }
            const contentType = fileToUpload.type || 'application/octet-stream';
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: fileToUpload.name, contentType })
            });
            if (!res.ok) throw new Error("Error servidor URL");
            const { uploadUrl, publicUrl } = await res.json();
            
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileToUpload,
                headers: { 'Content-Type': contentType }
            });
            if (!uploadRes.ok) throw new Error("Error Cloudflare R2");
            uploadedUrls.push(publicUrl);
        }

        await guardarDiagnostico(orderData.id, diagnostico, repuestos, horas, totalGeneral, uploadedUrls);
        router.refresh();
    } catch (e) {
        console.error("Error al guardar", e);
        alert("Ocurrió un error al enviar a aprobación de presupuesto.");
    } finally {
        setIsSaving(false);
    }
  };

  const tabBtn = (id: string, label: string) => (
    <button 
      type="button"
      onClick={() => setActiveTab(id)} 
      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 md:flex-initial text-center ${
        activeTab === id ? "bg-indigo-600 text-white shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col border border-slate-200">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="m-0 text-sm md:text-[15px] font-bold text-slate-900 tracking-tight truncate">Mesa de Trabajo Técnico</h4>
          <p className="m-0 text-xs text-slate-500 font-medium truncate">
            {orderData?.tecnicoReparacion?.nombre || "Técnico Asignado"} · Orden #{orderData?.codigoSeguridad || "Nueva"}
          </p>
        </div>
        <div className="shrink-0 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold">
          ⚙ {orderData?.estado === 'ESPERANDO_APROBACION' ? 'Presupuesto Creado' : 'En Evaluación'}
        </div>
      </div>

      {orderData?.kanbanTasks && orderData.kanbanTasks.length > 0 && (
        <div className="mb-5 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Tarjeta Kanban Asociada</span>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono font-black text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded text-[10px]">
                {orderData.kanbanTasks[0].codigo}
              </span>
              <span className="px-2 py-0.5 bg-indigo-600/10 text-indigo-700 font-extrabold rounded-full text-[9px] uppercase border border-indigo-200/55">
                VINCULADO
              </span>
            </div>
          </div>
          <a
            href={`/kanban/${orderData.kanbanTasks[0].spaceId}?task=${orderData.kanbanTasks[0].id}`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition active:scale-95 shadow-sm text-xs cursor-pointer"
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Ver en Tablero</span>
          </a>
        </div>
      )}

      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Diagnóstico Técnico</label>
        <textarea 
          value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors resize-none h-20"
          placeholder="Escribe el reporte técnico detallado aquí..."
        />
      </div>

      <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl w-full md:w-fit">
        {tabBtn("repuestos", "🔩 Repuestos")}
        {tabBtn("mano", "⏱ Mano de Obra")}
        {tabBtn("fotos", "📷 Fotos Falla")}
      </div>

      <div className="flex-grow min-w-0">
        {activeTab === "repuestos" && (
          <div className="flex flex-col h-full">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar componente en inventario..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              {isSearching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-slate-400" />}
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto flex flex-col">
                  {searchResults.length > 0 ? searchResults.map(prod => (
                    <div 
                      key={prod.id} 
                      onClick={() => handleAddRepuesto(prod)}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">{prod.nombre}</div>
                        <div className="text-xs text-slate-500 font-mono truncate">{prod.sku}</div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-sm font-bold text-slate-800">L {prod.precioVenta.toFixed(2)}</div>
                        <div className={`text-xs ${prod.stockActual > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          Stock: {prod.stockActual}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-3.5 text-xs text-slate-400 text-center font-medium">
                      No se encontraron coincidencias para "{searchQuery}"
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      setIsActivoModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 border-t border-slate-100 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center gap-2 transition-colors sticky bottom-0 z-10 shrink-0"
                  >
                    <Plus size={14} className="shrink-0" />
                    Registrar nuevo producto o activo en Inventario
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full text-left border-collapse text-xs mb-3 min-w-[500px]">
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
                      <td className="py-2 px-2 text-slate-800 font-medium">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">L</span>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            className="w-20 border border-slate-200 rounded px-1 py-0.5 outline-none font-bold text-slate-800"
                            value={r.precio}
                            onChange={(e) => {
                               const val = parseFloat(e.target.value) || 0;
                               setRepuestos(p => p.map(x => x.id === r.id ? {...x, precio: val} : x));
                            }}
                          />
                        </div>
                      </td>
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
            </div>
            
            <div className="mt-auto text-right text-xs text-slate-600 font-medium pt-3">
              Total Repuestos: <strong className="text-indigo-600 text-sm ml-1">L {totalRepuestos.toFixed(2)}</strong>
            </div>
          </div>
        )}

        {activeTab === "mano" && (
          <div className="flex flex-col h-full">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full text-left border-collapse text-xs mb-3 min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    {["Actividad","Horas",""].map(h => (
                      <th key={h} className="py-2 px-2 text-slate-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horas.map(h => (
                    <tr key={h.id} className="border-b border-slate-50">
                      <td className="py-2 px-2 text-slate-800 font-medium">{h.descripcion}</td>
                      <td className="py-2 px-2 text-slate-800 font-medium text-center">{h.horas}</td>
                      <td className="py-2 px-2 text-right">
                        <button onClick={() => setHoras(p => p.filter(x => x.id !== h.id))} className="text-red-500 hover:text-red-700 bg-transparent p-1 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-[2fr_0.8fr_auto] gap-2 items-stretch md:items-center mb-4">
              <input className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
                placeholder="Actividad realizada..." value={nuevaHora.descripcion} onChange={e => setNuevaHora(p => ({...p, descripcion: e.target.value}))}/>
              <input className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none" 
                  type="number" placeholder="Horas estimadas" value={nuevaHora.horas} onChange={e => setNuevaHora(p => ({...p, horas: e.target.value}))}/>
              <button onClick={addHora} className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors">+ Agregar</button>
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
                  <SafeImage src={p.url} alt="" className="w-full h-full object-cover"/>
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
          <div className="mb-4 p-3 bg-slate-50 rounded-xl flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2">
            <div className="text-[15px] font-bold text-indigo-600">
              Total Repuestos: L {totalRepuestos.toFixed(2)}
            </div>
          </div>
          <button 
            type="button"
            onClick={handleGuardarCotizacion}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             {isSaving ? "Enviando..." : "Enviar a Aprobación de Presupuesto"}
          </button>
      </div>

      {isActivoModalOpen && (
        <ActivoModal
          open={isActivoModalOpen}
          onClose={() => setIsActivoModalOpen(false)}
          dbAreas={dbAreas}
          onSuccess={() => {
            if (searchQuery.trim().length >= 2) {
               setIsSearching(true);
               searchRepuestos(searchQuery).then(res => {
                 setSearchResults(res);
                 setIsSearching(false);
                 setShowDropdown(true);
               });
            }
          }}
        />
      )}
    </div>
  );
}
