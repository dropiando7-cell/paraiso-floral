
// StatusStepper.jsx — Timeline visual de progreso de orden de servicio
const StatusStepper = ({ currentStep = 2, orderData = {} }) => {
  const steps = [
    { id: 0, key: "recepcion",    label: "Recepción",    sublabel: "Ingreso del equipo",      icon: "inbox" },
    { id: 1, key: "diagnostico",  label: "Diagnóstico",  sublabel: "Evaluación técnica",       icon: "search-check" },
    { id: 2, key: "presupuesto",  label: "Presupuesto",  sublabel: "Aprobación del costo",     icon: "receipt" },
    { id: 3, key: "reparacion",   label: "Reparación",   sublabel: "Trabajo en progreso",      icon: "wrench" },
    { id: 4, key: "listo",        label: "Listo",        sublabel: "Entrega al cliente",       icon: "check-circle" },
  ];

  const iconPaths = {
    inbox:        <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></>,
    "search-check":<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><polyline points="8 11 10 13 14 9"/></>,
    receipt:      <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></>,
    wrench:       <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
    "check-circle":<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  };

  const getStepState = (stepId) => {
    if (stepId < currentStep) return "done";
    if (stepId === currentStep) return "active";
    return "pending";
  };

  const stateStyles = {
    done:    { bg: "#1928FD", border: "#1928FD", iconColor: "#fff", labelColor: "#0B1221", subColor: "#6B7280" },
    active:  { bg: "#fff",    border: "#1928FD", iconColor: "#1928FD", labelColor: "#1928FD", subColor: "#1928FD" },
    pending: { bg: "#fff",    border: "#D1D5DB", iconColor: "#9CA3AF", labelColor: "#9CA3AF", subColor: "#D1D5DB" },
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "24px 28px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      marginBottom: 20
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0B1221", fontFamily: "Inter" }}>
            Estado del Servicio
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
            Orden #{orderData.id || "SVC-2024-0847"} · {orderData.equipo || "Monitor Fetal — S/N: MF-20938"}
          </p>
        </div>
        <div style={{
          background: currentStep === 4 ? "#DCFCE7" : "#EEF2FF",
          color: currentStep === 4 ? "#16A34A" : "#1928FD",
          padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "Inter"
        }}>
          {currentStep === 4 ? "✓ Completado" : `Paso ${currentStep + 1} de ${steps.length}`}
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
        {steps.map((step, idx) => {
          const state = getStepState(step.id);
          const s = stateStyles[state];
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: isLast ? "0 0 auto" : 1, minWidth: 0 }}>
                {/* Circle */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: s.bg, border: `2px solid ${s.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: state === "active" ? "0 0 0 4px rgba(25,40,253,0.12)" : "none",
                  transition: "all 0.2s", flexShrink: 0, zIndex: 2, position: "relative"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {iconPaths[step.icon]}
                  </svg>
                </div>
                {/* Labels */}
                <div style={{ textAlign: "center", marginTop: 8, maxWidth: 90 }}>
                  <div style={{ fontSize: 12, fontWeight: state === "pending" ? 400 : 600, color: s.labelColor, fontFamily: "Inter", lineHeight: 1.3 }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: s.subColor, fontFamily: "Inter", marginTop: 2, lineHeight: 1.3 }}>
                    {step.sublabel}
                  </div>
                  {state === "done" && (
                    <div style={{ fontSize: 10, color: "#16A34A", fontFamily: "Inter", marginTop: 3, fontWeight: 600 }}>
                      ✓ Completado
                    </div>
                  )}
                  {state === "active" && (
                    <div style={{ fontSize: 10, color: "#1928FD", fontFamily: "Inter", marginTop: 3, fontWeight: 600, animation: "pulse 2s infinite" }}>
                      ● En curso
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 32, marginLeft: -1, marginRight: -1,
                  background: step.id < currentStep ? "#1928FD" : "#E5E7EB",
                  transition: "background 0.3s", zIndex: 1
                }}/>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { StatusStepper });
