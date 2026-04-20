
// TechnicalWorkbench.jsx — Panel de trabajo para Carlos (técnico)
const { useState: useStateTW } = React;

const TechnicalWorkbench = ({ orderData = {} }) => {
  const [repuestos, setRepuestos] = useStateTW([
    { id: 1, descripcion: "Fuente de poder 12V/5A", codigo: "REP-0042", cantidad: 1, precio: 850.00 },
    { id: 2, descripcion: "Condensador electrolítico 1000µF", codigo: "REP-0118", cantidad: 3, precio: 45.00 },
  ]);
  const [horas, setHoras] = useStateTW([
    { id: 1, descripcion: "Diagnóstico inicial completo", horas: 1.5, tarifa: 400 },
    { id: 2, descripcion: "Desmontaje y revisión interna", horas: 2.0, tarifa: 400 },
  ]);
  const [nuevoRep, setNuevoRep] = useStateTW({ descripcion: "", codigo: "", cantidad: 1, precio: "" });
  const [nuevaHora, setNuevaHora] = useStateTW({ descripcion: "", horas: "", tarifa: 400 });
  const [diagnostico, setDiagnostico] = useStateTW("Fuente de poder quemada por sobretensión. Condensadores electrolíticos dañados en placa principal.");
  const [fotoFalla, setFotoFalla] = useStateTW([]);
  const [activeTab, setActiveTab] = useStateTW("repuestos");
  const fileRef2 = React.useRef();

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

  const inputSm = {
    padding: "7px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB",
    fontSize: 12, fontFamily: "Inter", outline: "none", background: "#fff",
  };

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={{
      padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer",
      fontFamily: "Inter", fontSize: 12.5, fontWeight: activeTab === id ? 600 : 400,
      background: activeTab === id ? "#1928FD" : "transparent",
      color: activeTab === id ? "#fff" : "#6B7280", transition: "all 0.15s"
    }}>{label}</button>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, background: "#FFF1F1", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FE0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0B1221", fontFamily: "Inter" }}>Mesa de Trabajo Técnico</h4>
          <p style={{ margin: 0, fontSize: 11.5, color: "#6B7280", fontFamily: "Inter" }}>Técnico: Carlos Mejía · Orden SVC-2024-0847</p>
        </div>
        <div style={{ marginLeft: "auto", background: "#FFF7ED", color: "#C2410C", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "Inter" }}>
          ⚙ En Reparación
        </div>
      </div>

      {/* Diagnóstico */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", fontFamily: "Inter", display: "block", marginBottom: 5 }}>
          Diagnóstico Técnico
        </label>
        <textarea value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 12.5, fontFamily: "Inter", color: "#111827", resize: "vertical", height: 70, boxSizing: "border-box", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "#1928FD"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}/>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#F4F6FB", padding: 4, borderRadius: 9, width: "fit-content" }}>
        {tabBtn("repuestos", "🔩 Repuestos")}
        {tabBtn("mano", "⏱ Mano de Obra")}
        {tabBtn("fotos", "📷 Fotos Falla")}
      </div>

      {/* Tab: Repuestos */}
      {activeTab === "repuestos" && (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "Inter" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #F3F4F6" }}>
                {["Descripción","Código","Cant.","Precio Unit.","Subtotal",""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repuestos.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                  <td style={{ padding: "8px 8px", color: "#111827" }}>{r.descripcion}</td>
                  <td style={{ padding: "8px 8px", color: "#6B7280", fontFamily: "monospace" }}>{r.codigo}</td>
                  <td style={{ padding: "8px 8px", color: "#111827", textAlign: "center" }}>{r.cantidad}</td>
                  <td style={{ padding: "8px 8px", color: "#111827" }}>L {r.precio.toFixed(2)}</td>
                  <td style={{ padding: "8px 8px", color: "#111827", fontWeight: 600 }}>L {(r.cantidad * r.precio).toFixed(2)}</td>
                  <td style={{ padding: "8px 8px" }}>
                    <button onClick={() => setRepuestos(p => p.filter(x => x.id !== r.id))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#FE0000", fontSize: 14, padding: "2px 4px" }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Add row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.5fr 1fr auto", gap: 6, marginTop: 10, alignItems: "center" }}>
            <input style={inputSm} placeholder="Descripción repuesto..." value={nuevoRep.descripcion} onChange={e => setNuevoRep(p => ({...p, descripcion: e.target.value}))}/>
            <input style={inputSm} placeholder="Código" value={nuevoRep.codigo} onChange={e => setNuevoRep(p => ({...p, codigo: e.target.value}))}/>
            <input style={{ ...inputSm, width: "100%" }} type="number" min="1" placeholder="1" value={nuevoRep.cantidad} onChange={e => setNuevoRep(p => ({...p, cantidad: parseInt(e.target.value)||1}))}/>
            <input style={inputSm} type="number" placeholder="Precio L." value={nuevoRep.precio} onChange={e => setNuevoRep(p => ({...p, precio: e.target.value}))}/>
            <button onClick={addRep} style={{ padding: "7px 12px", background: "#1928FD", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, fontFamily: "Inter", cursor: "pointer" }}>+ Add</button>
          </div>
          <div style={{ marginTop: 12, textAlign: "right", fontSize: 12.5, fontFamily: "Inter", color: "#374151" }}>
            Total Repuestos: <strong style={{ color: "#1928FD", fontSize: 14 }}>L {totalRepuestos.toFixed(2)}</strong>
          </div>
        </div>
      )}

      {/* Tab: Mano de Obra */}
      {activeTab === "mano" && (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "Inter" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #F3F4F6" }}>
                {["Actividad","Horas","Tarifa/Hr","Subtotal",""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horas.map(h => (
                <tr key={h.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                  <td style={{ padding: "8px 8px", color: "#111827" }}>{h.descripcion}</td>
                  <td style={{ padding: "8px 8px", color: "#111827", textAlign: "center" }}>{h.horas}h</td>
                  <td style={{ padding: "8px 8px", color: "#6B7280" }}>L {h.tarifa}/hr</td>
                  <td style={{ padding: "8px 8px", fontWeight: 600, color: "#111827" }}>L {(h.horas * h.tarifa).toFixed(2)}</td>
                  <td><button onClick={() => setHoras(p => p.filter(x => x.id !== h.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#FE0000", fontSize: 14 }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr auto", gap: 6, marginTop: 10, alignItems: "center" }}>
            <input style={inputSm} placeholder="Actividad realizada..." value={nuevaHora.descripcion} onChange={e => setNuevaHora(p => ({...p, descripcion: e.target.value}))}/>
            <input style={inputSm} type="number" placeholder="Hrs" value={nuevaHora.horas} onChange={e => setNuevaHora(p => ({...p, horas: e.target.value}))}/>
            <input style={inputSm} type="number" placeholder="Tarifa L." value={nuevaHora.tarifa} onChange={e => setNuevaHora(p => ({...p, tarifa: parseFloat(e.target.value)||400}))}/>
            <button onClick={addHora} style={{ padding: "7px 12px", background: "#1928FD", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, fontFamily: "Inter", cursor: "pointer" }}>+ Add</button>
          </div>
          <div style={{ marginTop: 12, textAlign: "right", fontSize: 12.5, fontFamily: "Inter", color: "#374151" }}>
            Total Mano de Obra: <strong style={{ color: "#1928FD", fontSize: 14 }}>L {totalMano.toFixed(2)}</strong>
          </div>
        </div>
      )}

      {/* Tab: Fotos */}
      {activeTab === "fotos" && (
        <div>
          <div onClick={() => fileRef2.current.click()}
            onDrop={e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files).map(f => ({name:f.name,url:URL.createObjectURL(f)})); setFotoFalla(p=>[...p,...files]); }}
            onDragOver={e => e.preventDefault()}
            style={{ border: "2px dashed #D1D5DB", borderRadius: 12, padding: 20, textAlign: "center", cursor: "pointer", background: "#F9FAFB", marginBottom: 12 }}>
            <input ref={fileRef2} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => {
              const files = Array.from(e.target.files).map(f => ({name:f.name,url:URL.createObjectURL(f)}));
              setFotoFalla(p=>[...p,...files]);
            }}/>
            <p style={{ margin: 0, fontSize: 12.5, color: "#6B7280", fontFamily: "Inter" }}>
              📷 Arrastra fotos de la falla o <span style={{color:"#1928FD",fontWeight:600}}>haz clic</span>
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {fotoFalla.length === 0 && (
              <div style={{ width: "100%", textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: 12, fontFamily: "Inter" }}>
                Sin fotos adjuntas. Documenta la falla para respaldo técnico.
              </div>
            )}
            {fotoFalla.map((p, i) => (
              <div key={i} style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "1.5px solid #E5E7EB", position: "relative" }}>
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                <button onClick={() => setFotoFalla(pp => pp.filter((_,j)=>j!==i))}
                  style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#FE0000", border: "none", color: "#fff", fontSize: 10, cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totales */}
      <div style={{ marginTop: 16, padding: "12px 14px", background: "#F4F6FB", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
          Repuestos: <span style={{ color: "#111827", fontWeight: 600 }}>L {totalRepuestos.toFixed(2)}</span>
          <span style={{ margin: "0 8px", color: "#D1D5DB" }}>|</span>
          Mano de Obra: <span style={{ color: "#111827", fontWeight: 600 }}>L {totalMano.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1928FD", fontFamily: "Inter" }}>
          Total: L {totalGeneral.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TechnicalWorkbench });
