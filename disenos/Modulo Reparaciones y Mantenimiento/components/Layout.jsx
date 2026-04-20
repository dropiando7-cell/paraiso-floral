
// Layout.jsx — Sidebar + Header replicating Bioelectrónica Honduras visual language
const { useState } = React;

const menuData = [
  { icon: "grid", label: "Portal Bioelectrónica", active: false },
  { icon: "cpu", label: "Inventario IA", badge: "NUEVO", active: false },
  { icon: "monitor", label: "Rentas de Equipos", active: false },
  { icon: "bar-chart-2", label: "Gráficas e Informes", active: false },
  {
    section: "INVENTARIO Y VENTAS",
    children: [
      { icon: "layers", label: "Inventario y Catálogos", expandable: true, expanded: false },
      { icon: "shopping-bag", label: "Ventas y Servicios", expandable: true, expanded: true,
        children: [
          { label: "Directorio de Contactos" },
          { label: "Soporte y Reparaciones", active: true },
          { label: "Cotizaciones" },
          { label: "Facturación" },
        ]
      },
    ]
  },
  { section: "ADMINISTRACIÓN", children: [
    { icon: "settings", label: "Usuarios y Roles" },
  ]}
];

// Icon component using simple SVG paths
const Icon = ({ name, size = 16, color = "currentColor", ...props }) => {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></>,
    "bar-chart-2": <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    "shopping-bag": <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    "chevron-down": <polyline points="6 9 12 15 18 9"/>,
    "chevron-right": <polyline points="9 18 15 12 9 6"/>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    wrench: <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
    "plus-circle": <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    tool: <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {icons[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

const Sidebar = ({ activeRole, onRoleChange }) => {
  const [expanded, setExpanded] = useState({ "Ventas y Servicios": true, "Inventario y Catálogos": false });

  return (
    <aside style={{
      width: 220, minWidth: 220, height: "100vh", background: "#0B1221",
      display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 50,
      overflowY: "auto", scrollbarWidth: "none"
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          width: 30, height: 30, background: "#1928FD", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "Inter" }}>BE</span>
        </div>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "Inter", letterSpacing: -0.3 }}>Bioelectrónica</span>
        <Icon name="zap" size={13} color="#1928FD" style={{ marginLeft: "auto" }}/>
      </div>

      {/* Portal Button */}
      <div style={{ padding: "12px 12px 4px" }}>
        <button style={{
          width: "100%", padding: "8px 12px", background: "#1928FD", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer"
        }}>
          <Icon name="grid" size={14} color="#fff"/>
          <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 600, fontFamily: "Inter" }}>Portal Bioelectrónica</span>
        </button>
      </div>

      {/* Top items */}
      {[
        { icon: "cpu", label: "Inventario IA", badge: "NUEVO" },
        { icon: "monitor", label: "Rentas de Equipos" },
        { icon: "bar-chart-2", label: "Gráficas e Informes" },
      ].map(item => (
        <div key={item.label} style={{ padding: "2px 12px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
            borderRadius: 7, cursor: "pointer",
          }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
             onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Icon name={item.icon} size={14} color="rgba(255,255,255,0.5)"/>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12.5, fontFamily: "Inter", flex: 1 }}>{item.label}</span>
            {item.badge && <span style={{
              background: "#1928FD", color: "#fff", fontSize: 9, fontWeight: 700,
              padding: "2px 5px", borderRadius: 4, fontFamily: "Inter"
            }}>{item.badge}</span>}
          </div>
        </div>
      ))}

      {/* Section: Inventario y Ventas */}
      <div style={{ padding: "14px 16px 4px" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, fontFamily: "Inter", letterSpacing: 0.8 }}>INVENTARIO Y VENTAS</span>
      </div>

      {/* Inventario y Catálogos */}
      <div style={{ padding: "2px 12px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
          borderRadius: 7, cursor: "pointer"
        }} onClick={() => setExpanded(p => ({...p, "Inventario y Catálogos": !p["Inventario y Catálogos"]}))}
           onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
           onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Icon name="layers" size={14} color="rgba(255,255,255,0.5)"/>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12.5, fontFamily: "Inter", flex: 1 }}>Inventario y Catálogos</span>
          <Icon name={expanded["Inventario y Catálogos"] ? "chevron-down" : "chevron-right"} size={12} color="rgba(255,255,255,0.3)"/>
        </div>
        {expanded["Inventario y Catálogos"] && ["Control de Inventario","Catálogo de Modelos","Entradas / Compras","Salidas / Descargas","Kardex de Movimientos","Gestor de Precios","Ubicaciones y Sucursales","Inventario (Odoo)"].map(sub => (
          <div key={sub} style={{ padding: "5px 10px 5px 32px", cursor: "pointer", borderRadius: 6 }}
               onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
               onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter" }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Ventas y Servicios */}
      <div style={{ padding: "2px 12px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
          background: "rgba(25,40,253,0.15)", borderRadius: 7, cursor: "pointer"
        }} onClick={() => setExpanded(p => ({...p, "Ventas y Servicios": !p["Ventas y Servicios"]}))}>
          <Icon name="shopping-bag" size={14} color="#1928FD"/>
          <span style={{ color: "#fff", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600, flex: 1 }}>Ventas y Servicios</span>
          <Icon name={expanded["Ventas y Servicios"] ? "chevron-down" : "chevron-right"} size={12} color="rgba(255,255,255,0.5)"/>
        </div>
        {expanded["Ventas y Servicios"] && ["Directorio de Contactos","Soporte y Reparaciones","Cotizaciones","Facturación"].map(sub => (
          <div key={sub} style={{
            padding: "5px 10px 5px 32px", cursor: "pointer", borderRadius: 6,
            background: sub === "Soporte y Reparaciones" ? "#1928FD" : "transparent",
            margin: sub === "Soporte y Reparaciones" ? "2px 4px" : "0 4px"
          }}
          onMouseEnter={e => { if (sub !== "Soporte y Reparaciones") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (sub !== "Soporte y Reparaciones") e.currentTarget.style.background = "transparent"; }}>
            <span style={{
              color: sub === "Soporte y Reparaciones" ? "#fff" : "rgba(255,255,255,0.55)",
              fontSize: 12, fontFamily: "Inter",
              fontWeight: sub === "Soporte y Reparaciones" ? 600 : 400
            }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Section: Administración */}
      <div style={{ padding: "14px 16px 4px" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, fontFamily: "Inter", letterSpacing: 0.8 }}>ADMINISTRACIÓN</span>
      </div>
      <div style={{ padding: "2px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer" }}
             onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
             onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Icon name="settings" size={14} color="rgba(255,255,255,0.5)"/>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12.5, fontFamily: "Inter" }}>Usuarios y Roles</span>
        </div>
      </div>

      {/* Bottom user */}
      <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, background: "#1928FD", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "Inter" }}>N</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter" }}>samuel.test</span>
      </div>
    </aside>
  );
};

const Header = ({ activeRole, onRoleChange }) => {
  const roles = ["Yensi — Recepción", "Carlos — Técnico", "Manuel — Gerente", "Vista Global"];
  return (
    <header style={{
      height: 56, background: "#fff", borderBottom: "1px solid #E8EAED",
      display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 20,
      gap: 12, position: "sticky", top: 0, zIndex: 40, marginLeft: 220
    }}>
      {/* Search */}
      <div style={{
        flex: 1, maxWidth: 380, background: "#F4F6FB", borderRadius: 8,
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 34, border: "1px solid #E8EAED"
      }}>
        <Icon name="search" size={14} color="#9CA3AF"/>
        <input placeholder="Buscar en toda la plataforma..." style={{
          border: "none", background: "transparent", flex: 1, fontSize: 12.5,
          fontFamily: "Inter", color: "#374151", outline: "none"
        }}/>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", background: "#E5E7EB", padding: "1px 5px", borderRadius: 3 }}>⌘K</span>
      </div>

      {/* Role Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11.5, color: "#6B7280", fontFamily: "Inter", marginRight: 4 }}>Vista:</span>
        {roles.map(r => (
          <button key={r} onClick={() => onRoleChange(r)} style={{
            padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
            fontFamily: "Inter", fontSize: 11.5, fontWeight: activeRole === r ? 600 : 400,
            background: activeRole === r ? "#1928FD" : "#F4F6FB",
            color: activeRole === r ? "#fff" : "#6B7280",
            transition: "all 0.15s"
          }}>{r.split(" — ")[0]}</button>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 7, height: 7, background: "#22C55E", borderRadius: "50%" }}/>
          <span style={{ fontSize: 12, color: "#374151", fontFamily: "Inter" }}>Sistema Operativo</span>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: "#F4F6FB",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
        }}>
          <Icon name="bell" size={15} color="#6B7280"/>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F4F6FB", padding: "4px 8px 4px 4px", borderRadius: 8 }}>
          <div style={{ width: 26, height: 26, background: "#1928FD", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "Inter" }}>SA</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#111827", fontFamily: "Inter", lineHeight: 1.2 }}>samuel.test</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>Administrador General</div>
          </div>
        </div>
      </div>
    </header>
  );
};

Object.assign(window, { Sidebar, Header, Icon });
