
// App.jsx — Vista principal unificada con grid de 12 columnas
const { useState: useStateApp, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "currentStep": 2,
  "activeRole": "Yensi — Recepción",
  "darkStepper": false,
  "accentColor": "#1928FD"
}/*EDITMODE-END*/;

const HistoryPanel = () => {
  const orders = [
    { id: "SVC-2024-0847", cliente: "Clínica Bendaña", equipo: "Monitor Fetal GE", estado: "presupuesto", fecha: "20 Abr 2026", monto: "L 2,085" },
    { id: "SVC-2024-0832", cliente: "Hospital Escuela", equipo: "Desfibrilador Zoll", estado: "listo", fecha: "17 Abr 2026", monto: "L 4,200" },
    { id: "SVC-2024-0819", cliente: "Clínica Miramontes", equipo: "Aire Acond. 3T", estado: "reparacion", fecha: "14 Abr 2026", monto: "L 1,380" },
    { id: "SVC-2024-0801", cliente: "IHSS Tegucigalpa", equipo: "ECG 12 derivaciones", estado: "listo", fecha: "09 Abr 2026", monto: "L 890" },
    { id: "SVC-2024-0794", cliente: "Clínica Viera", equipo: "Autoclave 23L", estado: "diagnostico", fecha: "07 Abr 2026", monto: "—" },
  ];
  const estadoColors = {
    recepcion:   { bg: "#F4F6FB", color: "#6B7280" },
    diagnostico: { bg: "#FFF7ED", color: "#C2410C" },
    presupuesto: { bg: "#EEF2FF", color: "#1928FD" },
    reparacion:  { bg: "#FFF1F1", color: "#FE0000" },
    listo:       { bg: "#DCFCE7", color: "#16A34A" },
  };
  const estadoLabel = { recepcion:"Recepción", diagnostico:"Diagnóstico", presupuesto:"Presupuesto", reparacion:"Reparación", listo:"Listo ✓" };

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0B1221", fontFamily: "Inter" }}>Historial de Servicios</h4>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#6B7280", fontFamily: "Inter" }}>Últimas 5 órdenes · Trazabilidad completa</p>
        </div>
        <button style={{ padding: "6px 12px", background: "#F4F6FB", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "Inter", cursor: "pointer" }}>
          Ver todas →
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "Inter" }}>
        <thead>
          <tr style={{ borderBottom: "1.5px solid #F3F4F6" }}>
            {["Orden","Cliente","Equipo","Estado","Fecha","Monto"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const s = estadoColors[o.estado];
            return (
              <tr key={o.id} style={{ borderBottom: "1px solid #F9FAFB", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 10px" }}><span style={{ color: "#1928FD", fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{o.id}</span></td>
                <td style={{ padding: "10px 10px", color: "#374151" }}>{o.cliente}</td>
                <td style={{ padding: "10px 10px", color: "#6B7280" }}>{o.equipo}</td>
                <td style={{ padding: "10px 10px" }}>
                  <span style={{ background: s.bg, color: s.color, padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {estadoLabel[o.estado]}
                  </span>
                </td>
                <td style={{ padding: "10px 10px", color: "#9CA3AF", fontSize: 11.5 }}>{o.fecha}</td>
                <td style={{ padding: "10px 10px", color: "#111827", fontWeight: 600 }}>{o.monto}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const KpiRow = ({ step }) => {
  const stats = [
    { label: "Órdenes Activas", value: "12", sub: "+3 esta semana", color: "#1928FD", bg: "#EEF2FF" },
    { label: "En Diagnóstico", value: "4", sub: "Pendientes técnico", color: "#C2410C", bg: "#FFF7ED" },
    { label: "Listos p/ Entrega", value: "3", sub: "Avisar a clientes", color: "#16A34A", bg: "#DCFCE7" },
    { label: "Ingresos del Mes", value: "L 38,420", sub: "↑ 12% vs anterior", color: "#1928FD", bg: "#F4F6FB" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: "Inter", letterSpacing: 0.5, marginBottom: 6 }}>{s.label.toUpperCase()}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Inter", marginBottom: 4 }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const [tweaks, setTweaks] = useStateApp(TWEAK_DEFAULTS);
  const [step, setStep] = useStateApp(TWEAK_DEFAULTS.currentStep);
  const [role, setRole] = useStateApp(TWEAK_DEFAULTS.activeRole);
  const [showTweaks, setShowTweaks] = useStateApp(false);
  const [orderData] = useStateApp({ totalCosto: 2085, id: "SVC-2024-0847", equipo: "Monitor Fetal GE Dash 4000" });

  useEffect(() => {
    window.addEventListener("message", (e) => {
      if (e.data?.type === "__activate_edit_mode") setShowTweaks(true);
      if (e.data?.type === "__deactivate_edit_mode") setShowTweaks(false);
    });
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
  }, []);

  const isYensi  = role.startsWith("Yensi");
  const isCarlos = role.startsWith("Carlos");
  const isManuel = role.startsWith("Manuel");
  const isGlobal = role.startsWith("Vista");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6FB", fontFamily: "Inter" }}>
      <Sidebar activeRole={role} onRoleChange={setRole}/>

      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>
        <Header activeRole={role} onRoleChange={r => { setRole(r); }}/>

        <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>

          {/* Page Title */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: "#1928FD", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0B1221", fontFamily: "Inter", letterSpacing: -0.5 }}>
                    Soporte y Reparaciones
                  </h1>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
                    Bioelectrónica Honduras · Módulo Técnico
                  </p>
                </div>
              </div>
            </div>
            <button style={{
              padding: "9px 18px", background: "#1928FD", color: "#fff", border: "none",
              borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "Inter", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva Orden
            </button>
          </div>

          {/* KPIs */}
          <KpiRow step={step}/>

          {/* StatusStepper — always visible */}
          <StatusStepper currentStep={step} orderData={orderData}/>

          {/* Main grid: 12 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>

            {/* Yensi view: Reception form (8 cols) + QR (4 cols) */}
            {(isYensi || isGlobal) && (
              <>
                <div style={{ gridColumn: isGlobal ? "span 5" : "span 8" }}>
                  <ReceptionForm onSave={() => setStep(1)}/>
                </div>
                <div style={{ gridColumn: isGlobal ? "span 3" : "span 4", display: "flex", flexDirection: "column", gap: 16 }}>
                  <QRGenerator orderId="SVC-2024-0847" serie="MF-20938" cliente="Clínica Bendaña"/>
                  {/* Mini status card */}
                  <div style={{ background: "#EEF2FF", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1928FD", fontFamily: "Inter", letterSpacing: 0.5, marginBottom: 8 }}>ACCIÓN REQUERIDA</div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#1928FD", fontFamily: "Inter", lineHeight: 1.5 }}>
                      Completar recepción e imprimir etiqueta de trazabilidad. Fotografiar estado físico antes de entregar al técnico.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Carlos view: Technical workbench (8 cols) */}
            {(isCarlos || isGlobal) && (
              <div style={{ gridColumn: isGlobal ? "span 4" : "span 8" }}>
                <TechnicalWorkbench orderData={orderData}/>
              </div>
            )}

            {/* Manuel view: Approval card (4 cols) */}
            {(isManuel || isGlobal) && (
              <div style={{ gridColumn: isGlobal ? "span 4" : "span 6" }}>
                <ApprovalCard orderData={orderData}/>
              </div>
            )}

            {/* History — always at bottom, full width */}
            <div style={{ gridColumn: "span 12", marginTop: 4 }}>
              <HistoryPanel/>
            </div>
          </div>
        </main>
      </div>

      {/* Tweaks Panel */}
      {showTweaks && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, width: 280,
          background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          padding: "20px 22px", zIndex: 999, border: "1.5px solid #E5E7EB"
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1221", fontFamily: "Inter", marginBottom: 16 }}>⚙ Tweaks</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", fontFamily: "Inter", display: "block", marginBottom: 6 }}>
              Paso del Stepper ({step + 1}/5)
            </label>
            <input type="range" min="0" max="4" step="1" value={step} onChange={e => {
              const v = Number(e.target.value);
              setStep(v);
              window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { currentStep: v } }, "*");
            }} style={{ width: "100%", accentColor: "#1928FD" }}/>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>
              {["Recepción","Diagnóstico","Presupuesto","Reparación","Listo"].map(l => <span key={l}>{l[0]}</span>)}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", fontFamily: "Inter", display: "block", marginBottom: 6 }}>Vista de Rol</label>
            {["Yensi — Recepción","Carlos — Técnico","Manuel — Gerente","Vista Global"].map(r => (
              <button key={r} onClick={() => { setRole(r); window.parent.postMessage({type:"__edit_mode_set_keys", edits:{activeRole:r}},"*"); }} style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7,
                border: "none", marginBottom: 4, cursor: "pointer", fontFamily: "Inter", fontSize: 12,
                background: role === r ? "#EEF2FF" : "#F4F6FB",
                color: role === r ? "#1928FD" : "#374151",
                fontWeight: role === r ? 700 : 400
              }}>{r}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
