
// ApprovalCard.jsx + QRGenerator.jsx
const { useState: useStateAC } = React;

// ── QR Generator ──────────────────────────────────────────────
const QRGenerator = ({ orderId = "SVC-2024-0847", serie = "MF-20938", cliente = "Clínica Bendaña" }) => {
  const canvasRef = React.useRef();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 80;
    canvas.width = size; canvas.height = size;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);

    // Fake QR pattern based on orderId hash
    const hash = orderId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const modules = 14;
    const cell = size / modules;
    ctx.fillStyle = "#0B1221";

    // Finder patterns (corners)
    const finder = (ox, oy) => {
      ctx.fillRect(ox*cell, oy*cell, 7*cell, 7*cell);
      ctx.fillStyle = "#fff";
      ctx.fillRect((ox+1)*cell, (oy+1)*cell, 5*cell, 5*cell);
      ctx.fillStyle = "#0B1221";
      ctx.fillRect((ox+2)*cell, (oy+2)*cell, 3*cell, 3*cell);
    };
    finder(0, 0); finder(7, 0); finder(0, 7);

    // Data modules
    const pseudo = (r, c) => (((r * 17 + c * 13 + hash) % 7) < 3);
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c > 5) || (r > 5 && c < 8)) continue;
        if (pseudo(r, c)) {
          ctx.fillStyle = "#0B1221";
          ctx.fillRect(c * cell, r * cell, cell - 0.5, cell - 0.5);
        }
      }
    }
  }, [orderId]);

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", height: "100%", boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, background: "#F4F6FB", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0B1221", fontFamily: "Inter" }}>Etiqueta de Trazabilidad</span>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ border: "2px solid #0B1221", padding: 4, borderRadius: 6, flexShrink: 0 }}>
          <canvas ref={canvasRef} style={{ display: "block" }}/>
        </div>
        <div style={{ flex: 1 }}>
          {[
            ["Orden", orderId],
            ["Serie", serie],
            ["Cliente", cliente],
            ["Fecha", new Date().toLocaleDateString("es-HN")],
          ].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", fontWeight: 600, letterSpacing: 0.5 }}>{k.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: "#111827", fontFamily: "monospace", fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <button style={{
        width: "100%", marginTop: 14, padding: "8px 0", background: "#F4F6FB",
        border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontWeight: 600,
        color: "#374151", fontFamily: "Inter", cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", gap: 6
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Imprimir Etiqueta
      </button>
    </div>
  );
};

// ── Approval Card ─────────────────────────────────────────────
const ApprovalCard = ({ orderData = {}, onApprove }) => {
  const [margen, setMargen] = useStateAC(30);
  const [approved, setApproved] = useStateAC(false);
  const [whatsappSent, setWhatsappSent] = useStateAC(false);
  const [nota, setNota] = useStateAC("");

  const costo = orderData.totalCosto || 2085.00;
  const precioVenta = (costo * (1 + margen / 100));
  const ganancia = precioVenta - costo;
  const itv = precioVenta * 0.15;
  const totalFinal = precioVenta + itv;

  const sendWhatsApp = () => {
    const msg = encodeURIComponent(
      `*Bioelectrónica Honduras*\n\n` +
      `📋 Orden: SVC-2024-0847\n` +
      `🏥 Equipo: Monitor Fetal GE Dash 4000\n` +
      `🔧 Falla: Fuente de poder quemada\n\n` +
      `💰 *Presupuesto de Reparación*\n` +
      `Costo de repuestos + mano de obra: L ${costo.toFixed(2)}\n` +
      `Precio de venta (con ${margen}% margen): L ${precioVenta.toFixed(2)}\n` +
      `ITV (15%): L ${itv.toFixed(2)}\n` +
      `*Total: L ${totalFinal.toFixed(2)}*\n\n` +
      `Para aprobar el presupuesto responda con "APRUEBO".\n\nBioelectrónica Honduras · +504 2234-5678`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setWhatsappSent(true);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "22px 24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", height: "100%", boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, background: "#EEF2FF", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1928FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0B1221", fontFamily: "Inter" }}>Aprobación de Presupuesto</h4>
          <p style={{ margin: 0, fontSize: 11.5, color: "#6B7280", fontFamily: "Inter" }}>Gerente: Manuel Ortega</p>
        </div>
        {approved && <div style={{ marginLeft: "auto", background: "#DCFCE7", color: "#16A34A", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "Inter" }}>✓ Aprobado</div>}
      </div>

      {/* Resumen de costos */}
      <div style={{ background: "#F4F6FB", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: "Inter", letterSpacing: 0.6, marginBottom: 10 }}>DESGLOSE DE COSTOS</div>
        {[
          ["Repuestos", "L 985.00", false],
          ["Mano de Obra", "L 1,100.00", false],
          ["Subtotal de Costo", `L ${costo.toFixed(2)}`, true],
        ].map(([k, v, bold]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, borderTop: bold ? "1px solid #E5E7EB" : "none", paddingTop: bold ? 7 : 0 }}>
            <span style={{ fontSize: 12.5, color: bold ? "#0B1221" : "#6B7280", fontFamily: "Inter", fontWeight: bold ? 700 : 400 }}>{k}</span>
            <span style={{ fontSize: 12.5, color: bold ? "#0B1221" : "#374151", fontFamily: "Inter", fontWeight: bold ? 700 : 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Margen slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "Inter" }}>Margen de Ganancia</label>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1928FD", fontFamily: "Inter" }}>{margen}%</span>
        </div>
        <input type="range" min="10" max="80" step="5" value={margen} onChange={e => setMargen(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#1928FD" }}/>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>
          <span>10%</span><span>80%</span>
        </div>
      </div>

      {/* Precio final bento */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          ["Precio Venta", `L ${precioVenta.toFixed(2)}`, "#EEF2FF", "#1928FD"],
          ["Ganancia", `L ${ganancia.toFixed(2)}`, "#F0FDF4", "#16A34A"],
          ["Total + ITV", `L ${totalFinal.toFixed(2)}`, "#FFF7ED", "#C2410C"],
        ].map(([label, value, bg, color]) => (
          <div key={label} style={{ background: bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color, fontFamily: "Inter", fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color, fontFamily: "Inter", fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Nota */}
      <div style={{ marginBottom: 14 }}>
        <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota interna o condiciones especiales..."
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 12, fontFamily: "Inter", resize: "none", height: 52, boxSizing: "border-box", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "#1928FD"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}/>
      </div>

      {/* Botones */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setApproved(true)} style={{
          flex: 1, padding: "10px 0", background: approved ? "#DCFCE7" : "#1928FD",
          color: approved ? "#16A34A" : "#fff", border: approved ? "1.5px solid #16A34A" : "none",
          borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "Inter", cursor: "pointer",
          transition: "all 0.2s"
        }}>
          {approved ? "✓ Presupuesto Aprobado" : "Aprobar Presupuesto"}
        </button>
        <button onClick={sendWhatsApp} style={{
          flex: 1, padding: "10px 0",
          background: whatsappSent ? "#DCFCE7" : "#25D366",
          color: whatsappSent ? "#16A34A" : "#fff", border: "none",
          borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "Inter", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "background 0.2s"
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49"/>
          </svg>
          {whatsappSent ? "Enviado ✓" : "Enviar a WhatsApp"}
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { ApprovalCard, QRGenerator });
