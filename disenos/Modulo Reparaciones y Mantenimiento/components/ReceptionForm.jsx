
// ReceptionForm.jsx — Formulario digital para Yensi (recepción de equipos)
const { useState: useStateRF, useRef } = React;

const ReceptionForm = ({ onSave }) => {
  const [form, setFormRF] = useStateRF({
    cliente: "", telefono: "", equipo: "medico", modelo: "", serie: "",
    marca: "", descripcionFalla: "", prioridad: "normal", tecnico: "Carlos Mejía"
  });
  const [photos, setPhotos] = useStateRF([]);
  const [saved, setSaved] = useStateRF(false);
  const fileRef = useRef();

  const set = (k, v) => setFormRF(p => ({ ...p, [k]: v }));

  const handleFiles = (files) => {
    const newPhotos = Array.from(files).map(f => ({
      name: f.name, url: URL.createObjectURL(f), size: (f.size / 1024).toFixed(0)
    }));
    setPhotos(p => [...p, ...newPhotos]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    setSaved(true);
    onSave && onSave({ ...form, photos, id: "SVC-2024-0847", timestamp: new Date().toLocaleString("es-HN") });
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB",
    fontSize: 13, fontFamily: "Inter", color: "#111827", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s", background: "#fff"
  };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: "#374151", fontFamily: "Inter", marginBottom: 4, display: "block" };
  const fieldStyle = { marginBottom: 14 };

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, background: "#EEF2FF", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1928FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
          </svg>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0B1221", fontFamily: "Inter" }}>Recepción de Equipo</h4>
          <p style={{ margin: 0, fontSize: 11.5, color: "#6B7280", fontFamily: "Inter" }}>Responsable: Yensi Amaya</p>
        </div>
      </div>

      {/* Cliente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Cliente / Empresa</label>
          <input style={inputStyle} value={form.cliente} onChange={e => set("cliente", e.target.value)} placeholder="Clínica Bendaña S.A."
            onFocus={e => e.target.style.borderColor = "#1928FD"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}/>
        </div>
        <div>
          <label style={labelStyle}>Teléfono / WhatsApp</label>
          <input style={inputStyle} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="+504 9999-0000"
            onFocus={e => e.target.style.borderColor = "#1928FD"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}/>
        </div>
      </div>

      {/* Tipo equipo */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Tipo de Equipo</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["medico","🏥 Médico"],["aire","❄️ Aire Acond."],["otro","🔧 Otro"]].map(([v,l]) => (
            <button key={v} onClick={() => set("equipo", v)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${form.equipo === v ? "#1928FD" : "#E5E7EB"}`,
              background: form.equipo === v ? "#EEF2FF" : "#fff", fontFamily: "Inter", fontSize: 12,
              fontWeight: form.equipo === v ? 600 : 400, color: form.equipo === v ? "#1928FD" : "#6B7280",
              cursor: "pointer", transition: "all 0.15s"
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Modelo / Serie / Marca */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        {[["modelo","Modelo","GE Dash 4000"],["serie","N° de Serie","MF-20938"],["marca","Marca","GE Healthcare"]].map(([k,l,ph]) => (
          <div key={k}>
            <label style={labelStyle}>{l}</label>
            <input style={inputStyle} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
              onFocus={e => e.target.style.borderColor = "#1928FD"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}/>
          </div>
        ))}
      </div>

      {/* Falla */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Descripción de la Falla Reportada</label>
        <textarea style={{ ...inputStyle, height: 72, resize: "vertical" }}
          value={form.descripcionFalla} onChange={e => set("descripcionFalla", e.target.value)}
          placeholder="El cliente reporta que el monitor no enciende al presionar el botón de encendido..."
          onFocus={e => e.target.style.borderColor = "#1928FD"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}/>
      </div>

      {/* Prioridad + Técnico */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Prioridad</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.prioridad} onChange={e => set("prioridad", e.target.value)}>
            <option value="baja">🟢 Baja</option>
            <option value="normal">🟡 Normal</option>
            <option value="alta">🟠 Alta</option>
            <option value="urgente">🔴 Urgente</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Técnico Asignado</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.tecnico} onChange={e => set("tecnico", e.target.value)}>
            <option>Carlos Mejía</option>
            <option>Roberto López</option>
            <option>Sin asignar</option>
          </select>
        </div>
      </div>

      {/* Dropzone */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Fotos del Estado Físico Inicial</label>
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#1928FD"; e.currentTarget.style.background = "#EEF2FF"; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.background = "#F9FAFB"; }}
          onClick={() => fileRef.current.click()}
          style={{
            border: "2px dashed #D1D5DB", borderRadius: 12, padding: "16px", textAlign: "center",
            cursor: "pointer", background: "#F9FAFB", transition: "all 0.15s"
          }}>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }}
            onChange={e => handleFiles(e.target.files)}/>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
            Arrastra fotos aquí o <span style={{ color: "#1928FD", fontWeight: 600 }}>haz clic</span>
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>JPG, PNG, HEIC · Máx. 10MB c/u</p>
        </div>
        {photos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", border: "1.5px solid #E5E7EB", position: "relative" }}>
                <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                <button onClick={e => { e.stopPropagation(); setPhotos(pp => pp.filter((_,j) => j !== i)); }} style={{
                  position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%",
                  background: "#FE0000", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                }}>×</button>
              </div>
            ))}
            <div style={{
              width: 60, height: 60, borderRadius: 8, border: "2px dashed #D1D5DB",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9CA3AF", fontSize: 20
            }} onClick={() => fileRef.current.click()}>+</div>
          </div>
        )}
      </div>

      <button onClick={handleSubmit} style={{
        width: "100%", padding: "11px 0", background: saved ? "#16A34A" : "#1928FD",
        color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
        fontFamily: "Inter", cursor: "pointer", transition: "background 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8
      }}>
        {saved ? "✓ Orden Creada — SVC-2024-0847" : "Crear Orden de Servicio"}
      </button>
    </div>
  );
};

Object.assign(window, { ReceptionForm });
