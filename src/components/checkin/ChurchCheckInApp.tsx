// @ts-nocheck
"use client";
// components/church-checkin/ChurchCheckInApp.tsx
// Auto-generated — editable por tu IA (Claude Sonnet 4.6)

import { useState, useEffect, useRef } from "react";

// Mock QR code using canvas (no external lib needed)
function QRCodeCanvas({ value, size = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cellSize = size / 25;

    // Generate a deterministic pattern from value string
    const hash = [...value].reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);

    // Draw finder patterns (corners)
    const drawFinder = (x, y) => {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = "#fff";
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };
    drawFinder(0, 0);
    drawFinder(18, 0);
    drawFinder(0, 18);

    // Draw data cells
    ctx.fillStyle = "#1a1a2e";
    let seed = Math.abs(hash);
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const inFinder =
          (row < 8 && col < 8) ||
          (row < 8 && col > 16) ||
          (row > 16 && col < 8);
        if (!inFinder) {
          seed = (seed * 1664525 + 1013904223) & 0xffffffff;
          if (Math.abs(seed) % 2 === 0) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }
    }
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 4 }} />;
}

// ─── Data ───────────────────────────────────────────────────────────────────
const CLASSROOMS = [
  { id: "c1", name: "Semillitas", ageRange: "0–2 años", teacher: "Hermana María", capacity: 10, color: "#FF6B9D" },
  { id: "c2", name: "Jardín de Dios", ageRange: "3–5 años", teacher: "Hermano Pablo", capacity: 15, color: "#4ECDC4" },
  { id: "c3", name: "Guerreros de Fe", ageRange: "6–8 años", teacher: "Hermana Ana", capacity: 20, color: "#FFE66D" },
  { id: "c4", name: "Héroes Bíblicos", ageRange: "9–11 años", teacher: "Hermano Luis", capacity: 20, color: "#A8E6CF" },
  { id: "c5", name: "Jóvenes Creyentes", ageRange: "12–14 años", teacher: "Hermana Rosa", capacity: 18, color: "#C3A6FF" },
];

const SAMPLE_KIDS = [
  { id: "k1", name: "Sofía García", age: 4, classroom: "c2", allergies: "Ninguna", parentName: "Carlos García", parentPhone: "+504 9999-1111", photo: "🧒" },
  { id: "k2", name: "Mateo López", age: 7, classroom: "c3", allergies: "Maní", parentName: "Lucía López", parentPhone: "+504 9999-2222", photo: "👦" },
  { id: "k3", name: "Valentina Cruz", age: 2, classroom: "c1", allergies: "Látex", parentName: "Jorge Cruz", parentPhone: "+504 9999-3333", photo: "👧" },
  { id: "k4", name: "Daniel Martínez", age: 10, classroom: "c4", allergies: "Ninguna", parentName: "Sandra Martínez", parentPhone: "+504 9999-4444", photo: "👦" },
  { id: "k5", name: "Isabella Reyes", age: 5, classroom: "c2", allergies: "Gluten", parentName: "Miguel Reyes", parentPhone: "+504 9999-5555", photo: "🧒" },
];

function generateTicketCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Views ───────────────────────────────────────────────────────────────────
const VIEWS = {
  HOME: "home",
  CHECKIN: "checkin",
  TICKET: "ticket",
  CLASSROOMS: "classrooms",
  CLASSROOM_DETAIL: "classroom_detail",
  ADMIN: "admin",
};

export function ChurchCheckInApp() {
  const [view, setView] = useState(VIEWS.HOME);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKid, setSelectedKid] = useState(null);
  const [checkedInKids, setCheckedInKids] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [activeTab, setActiveTab] = useState("checkin");
  const [notification, setNotification] = useState(null);
  const [newKidForm, setNewKidForm] = useState({ name: "", age: "", parentName: "", parentPhone: "", allergies: "", classroom: "c1" });
  const [allKids, setAllKids] = useState(SAMPLE_KIDS);
  const [checkingIn, setCheckingIn] = useState(false);
  const [notifStatus, setNotifStatus] = useState(null);
  const [showNewKidPanel, setShowNewKidPanel] = useState(false);
  const [newKidStep, setNewKidStep] = useState(1);
  const [savingNewKid, setSavingNewKid] = useState(false);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredKids = allKids.filter(k =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.parentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckIn = async (kid) => {
    setCheckingIn(true);
    const cls = CLASSROOMS.find(c => c.id === kid.classroom);

    // Optimistically generate ticket locally
    const code = generateTicketCode();
    const checkInTime = new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
    const ticket = {
      ...kid,
      code,
      checkInTime,
      checkInDate: new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      qrValue: `IGLESIA-CHECKIN:${kid.id}:${code}:${Date.now()}`,
      notifStatus: null, // will update after API call
    };

    setCurrentTicket(ticket);
    setCheckedInKids(prev => [...prev.filter(k => k.id !== kid.id), ticket]);
    setView(VIEWS.TICKET);
    setNotifStatus({ state: "sending", channel: "WhatsApp" });

    // Call backend API (replace URL with your actual Next.js API)
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidId: kid.id,
          kidName: kid.name,
          kidAge: kid.age,
          classroomId: kid.classroom,
          classroomName: cls?.name || "",
          teacherName: cls?.teacher || "",
          parentName: kid.parentName,
          parentPhone: kid.parentPhone,
          allergies: kid.allergies,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const notif = data.data.notification;
        const channelLabel =
          notif.provider === "twilio_whatsapp" ? "WhatsApp"
            : notif.provider === "meta_whatsapp" ? "WhatsApp (Meta)"
              : "SMS";

        const updatedTicket = {
          ...ticket,
          code: data.data.securityCode || code, // use server code if available
          qrValue: data.data.qrValue || ticket.qrValue,
        };
        setCurrentTicket(updatedTicket);
        setCheckedInKids(prev => prev.map(k => k.id === kid.id ? updatedTicket : k));

        if (notif.sent) {
          setNotifStatus({ state: "sent", channel: channelLabel, provider: notif.provider });
          showNotif(`✅ ${kid.name} registrado · ${channelLabel} enviado a ${kid.parentName}`);
        } else {
          setNotifStatus({ state: "failed", channel: channelLabel, error: notif.error });
          showNotif(`✅ Registrado · ⚠️ No se pudo notificar al padre`, "warning");
        }
      } else {
        // API error but we already showed the ticket — just flag notif as failed
        setNotifStatus({ state: "failed", channel: "WhatsApp", error: data.error });
        showNotif(`✅ ${kid.name} registrado localmente`, "info");
      }
    } catch (err) {
      // Network error or API not available (e.g. demo mode)
      setNotifStatus({ state: "demo", channel: "WhatsApp" });
      showNotif(`✅ ${kid.name} registrado · (API en modo demo)`, "info");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = (kidId) => {
    setCheckedInKids(prev => prev.filter(k => k.id !== kidId));
    showNotif("👋 Niño entregado a sus padres", "info");
  };

  const isCheckedIn = (kidId) => checkedInKids.some(k => k.id === kidId);

  const handleAddKid = (autoCheckIn = false) => {
    if (!newKidForm.name || !newKidForm.age || !newKidForm.parentName) return;
    setSavingNewKid(true);
    const newKid = {
      id: "k" + Date.now(),
      ...newKidForm,
      age: parseInt(newKidForm.age),
      allergies: newKidForm.allergies || "Ninguna",
      photo: parseInt(newKidForm.age) <= 3 ? "👧" : parseInt(newKidForm.age) <= 7 ? "🧒" : "👦",
    };
    setAllKids(prev => [...prev, newKid]);
    setNewKidForm({ name: "", age: "", parentName: "", parentPhone: "", allergies: "", classroom: "c1" });
    setShowNewKidPanel(false);
    setNewKidStep(1);
    setSavingNewKid(false);
    showNotif("✅ Niño registrado en el sistema");
    if (autoCheckIn) {
      setTimeout(() => handleCheckIn(newKid), 150);
    }
  };

  const classroomKids = (classroomId) => checkedInKids.filter(k => k.classroom === classroomId);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    app: {
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      background: "#0F1628",
      minHeight: "100vh",
      color: "#E8F0FE",
      position: "relative",
      overflow: "hidden",
    },
    bg: {
      position: "fixed", inset: 0, zIndex: 0,
      background: "radial-gradient(ellipse at 20% 20%, #1a2a6c22 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, #b21f1f15 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, #fdbb2d10 0%, transparent 70%)",
      pointerEvents: "none",
    },
    content: { position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "0 0 80px 0", minHeight: "100vh" },
    // Header
    header: {
      background: "linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)",
      padding: "20px 20px 16px",
      borderRadius: "0 0 28px 28px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    },
    headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    logo: { fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#fff", opacity: 0.9 },
    headerTitle: { fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
    badge: {
      background: "rgba(255,255,255,0.2)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: 20, padding: "4px 12px",
      fontSize: 12, fontWeight: 700, color: "#fff",
    },
    // Nav
    nav: {
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, background: "#0F1628",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", zIndex: 100,
      boxShadow: "0 -8px 30px rgba(0,0,0,0.5)",
    },
    navBtn: (active) => ({
      flex: 1, padding: "10px 4px", border: "none", background: "transparent",
      color: active ? "#fdbb2d" : "rgba(255,255,255,0.4)",
      cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      transition: "color 0.2s",
    }),
    navIcon: { fontSize: 20 },
    // Cards
    card: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20, padding: 20, marginBottom: 12,
      backdropFilter: "blur(10px)",
    },
    // Search
    searchWrap: { padding: "16px 20px 8px", position: "sticky", top: 0, background: "#0F1628", zIndex: 10 },
    searchInput: {
      width: "100%", background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14,
      padding: "12px 16px 12px 44px", color: "#E8F0FE",
      fontSize: 15, outline: "none", boxSizing: "border-box",
    },
    // Kid row
    kidRow: {
      display: "flex", alignItems: "center", gap: 14,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "14px 16px", marginBottom: 8,
      transition: "background 0.2s",
    },
    kidEmoji: { fontSize: 32, width: 48, height: 48, background: "rgba(255,255,255,0.08)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    kidInfo: { flex: 1 },
    kidName: { fontWeight: 800, fontSize: 15, color: "#E8F0FE" },
    kidMeta: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
    // Buttons
    btnPrimary: {
      background: "linear-gradient(135deg, #fdbb2d, #e8930a)",
      border: "none", borderRadius: 12, padding: "10px 20px",
      color: "#1a1a1a", fontWeight: 800, fontSize: 13, cursor: "pointer",
      letterSpacing: 0.3, transition: "transform 0.15s, box-shadow 0.15s",
      boxShadow: "0 4px 15px rgba(253,187,45,0.3)",
    },
    btnDanger: {
      background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)",
      borderRadius: 12, padding: "10px 20px",
      color: "#ff6b6b", fontWeight: 800, fontSize: 13, cursor: "pointer",
    },
    btnGhost: {
      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12, padding: "10px 20px",
      color: "#E8F0FE", fontWeight: 700, fontSize: 13, cursor: "pointer",
    },
    // Ticket
    ticket: {
      background: "#fff", color: "#1a1a2e", borderRadius: 24,
      margin: "20px", overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    },
    ticketHeader: (color) => ({
      background: `linear-gradient(135deg, ${color || "#1a2a6c"}, ${color ? color + "99" : "#b21f1f"})`,
      padding: "24px 24px 20px", color: "#fff",
    }),
    ticketBody: { padding: 24 },
    ticketRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    ticketLabel: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#888", marginBottom: 4 },
    ticketValue: { fontSize: 15, fontWeight: 700, color: "#1a1a2e" },
    ticketDivider: { height: 1, background: "repeating-linear-gradient(90deg, #eee 0, #eee 6px, transparent 6px, transparent 12px)", margin: "20px 0" },
    codeBox: {
      background: "linear-gradient(135deg, #1a2a6c, #b21f1f)",
      borderRadius: 16, padding: "12px 20px", textAlign: "center",
      marginBottom: 20,
    },
    codeText: { fontSize: 32, fontWeight: 900, letterSpacing: 8, color: "#fdbb2d" },
    // Stats
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 20px" },
    statCard: (color) => ({
      background: `linear-gradient(135deg, ${color}22, ${color}11)`,
      border: `1px solid ${color}33`,
      borderRadius: 18, padding: "16px",
    }),
    statNum: (color) => ({ fontSize: 32, fontWeight: 900, color, letterSpacing: -1 }),
    statLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginTop: 4 },
    // Notification
    notif: (type) => ({
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: type === "success" ? "linear-gradient(135deg,#2ecc71,#27ae60)" : type === "info" ? "linear-gradient(135deg,#3498db,#2980b9)" : "linear-gradient(135deg,#e74c3c,#c0392b)",
      color: "#fff", padding: "12px 24px", borderRadius: 40,
      fontWeight: 800, fontSize: 14, zIndex: 9999,
      boxShadow: "0 8px 25px rgba(0,0,0,0.4)", letterSpacing: 0.3,
      whiteSpace: "nowrap",
    }),
    // Input
    input: {
      width: "100%", background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
      padding: "12px 14px", color: "#E8F0FE",
      fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10,
    },
    label: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block" },
    select: {
      width: "100%", background: "#1a2240",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
      padding: "12px 14px", color: "#E8F0FE",
      fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10,
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const totalCheckedIn = checkedInKids.length;

  return (
    <div style={S.app}>
      <div style={S.bg} />
      {notification && <div style={S.notif(notification.type)}>{notification.msg}</div>}

      <div style={S.content}>
        {/* ── HEADER ── */}
        <div style={S.header}>
          <div style={S.headerTop}>
            <div>
              <div style={S.logo}>✝ Misión Cristiana Elim Honduras</div>
              <div style={S.headerTitle}>Kids Check-In</div>
              <div style={S.headerSub}>Sistema de control de niños</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={S.badge}>🟢 En vivo</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                {new Date().toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short" })}
              </div>
            </div>
          </div>

          {/* Stat Pills */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "Registrados", val: totalCheckedIn, icon: "👦" },
              { label: "Salones Activos", val: CLASSROOMS.filter(c => classroomKids(c.id).length > 0).length, icon: "🏫" },
              { label: "Familias", val: allKids.length, icon: "👨‍👩‍👧" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "6px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                <span>{s.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#fdbb2d" }}>{s.val}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── VIEWS ── */}

        {/* HOME */}
        {view === VIEWS.HOME && (
          <div style={{ padding: "20px 20px 0" }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 16, letterSpacing: -0.5 }}>
              ¿Qué deseas hacer?
            </div>
            {[
              { icon: "✅", title: "Registrar Niño", sub: "Check-in rápido para el servicio", action: () => { setView(VIEWS.CHECKIN); setShowNewKidPanel(false); setActiveTab("checkin"); }, color: "#fdbb2d" },
              { icon: "➕", title: "Nuevo Niño + Check-In", sub: "Primer visit: registra y entra en un paso", action: () => { setView(VIEWS.CHECKIN); setShowNewKidPanel(true); setNewKidStep(1); }, color: "#2ecc71" },
              { icon: "🏫", title: "Ver Salones", sub: "Control de asistencia por clase", action: () => setView(VIEWS.CLASSROOMS), color: "#4ECDC4" },
              { icon: "⚙️", title: "Administración", sub: "Reportes y configuración", action: () => setView(VIEWS.ADMIN), color: "#C3A6FF" },
            ].map(item => (
              <div key={item.title} onClick={item.action} style={{ ...S.kidRow, cursor: "pointer", padding: "18px 20px", marginBottom: 12 }}>
                <div style={{ ...S.kidEmoji, fontSize: 28, background: item.color + "22", border: `1px solid ${item.color}44` }}>{item.icon}</div>
                <div style={S.kidInfo}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{item.title}</div>
                  <div style={S.kidMeta}>{item.sub}</div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 20 }}>›</div>
              </div>
            ))}

            {checkedInKids.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: 20, marginBottom: 12 }}>
                  Actualmente en iglesia
                </div>
                {checkedInKids.map(kid => {
                  const cls = CLASSROOMS.find(c => c.id === kid.classroom);
                  return (
                    <div key={kid.id} style={{ ...S.kidRow, borderLeft: `3px solid ${cls?.color || "#fdbb2d"}` }}>
                      <div style={{ ...S.kidEmoji, fontSize: 24 }}>{kid.photo}</div>
                      <div style={S.kidInfo}>
                        <div style={S.kidName}>{kid.name}</div>
                        <div style={S.kidMeta}>{cls?.name} · ✅ {kid.checkInTime}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setCurrentTicket(kid); setView(VIEWS.TICKET); }} style={{ ...S.btnGhost, padding: "8px 12px", fontSize: 11 }}>🎫 Ticket</button>
                        <button onClick={() => handleCheckOut(kid.id)} style={{ ...S.btnDanger, padding: "8px 12px", fontSize: 11 }}>Entrega</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* CHECK-IN */}
        {view === VIEWS.CHECKIN && (
          <>
            {/* Search bar + New Kid button */}
            <div style={S.searchWrap}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, opacity: 0.5 }}>🔍</span>
                  <input
                    style={S.searchInput}
                    placeholder="Buscar niño o padre..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowNewKidPanel(false); }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16 }}>✕</button>
                  )}
                </div>
                <button
                  onClick={() => { setShowNewKidPanel(p => !p); setNewKidStep(1); setSearchQuery(""); }}
                  style={{
                    ...S.btnPrimary, padding: "12px 14px", fontSize: 20, lineHeight: 1,
                    borderRadius: 14, flexShrink: 0,
                    background: showNewKidPanel ? "linear-gradient(135deg,#ff6b9d,#c0392b)" : "linear-gradient(135deg,#fdbb2d,#e8930a)",
                  }}>
                  {showNewKidPanel ? "✕" : "＋"}
                </button>
              </div>

              {/* Quick "add new" hint when no results */}
              {!showNewKidPanel && searchQuery && filteredKids.length === 0 && (
                <button
                  onClick={() => { setShowNewKidPanel(true); setNewKidForm(p => ({ ...p, name: searchQuery })); setSearchQuery(""); setNewKidStep(1); }}
                  style={{ width: "100%", marginTop: 8, background: "rgba(253,187,45,0.12)", border: "1px dashed rgba(253,187,45,0.4)", borderRadius: 12, padding: "10px 16px", color: "#fdbb2d", fontWeight: 800, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  ➕ Registrar "{searchQuery}" como niño nuevo →
                </button>
              )}
            </div>

            {/* ── INLINE NEW KID PANEL ─────────────────────────────────── */}
            {showNewKidPanel && (
              <div style={{ margin: "0 20px 16px", background: "rgba(253,187,45,0.06)", border: "1px solid rgba(253,187,45,0.25)", borderRadius: 22, overflow: "hidden" }}>

                {/* Panel header */}
                <div style={{ background: "linear-gradient(135deg, rgba(253,187,45,0.2), rgba(253,187,45,0.08))", padding: "16px 20px 12px", borderBottom: "1px solid rgba(253,187,45,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16, color: "#fdbb2d" }}>➕ Nuevo Niño</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Registra y haz check-in en un solo paso</div>
                    </div>
                    {/* Step indicator */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {[1, 2].map(s => (
                        <div key={s} style={{
                          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, transition: "all 0.2s",
                          background: newKidStep === s ? "linear-gradient(135deg,#fdbb2d,#e8930a)" : newKidStep > s ? "rgba(46,204,113,0.3)" : "rgba(255,255,255,0.1)",
                          color: newKidStep === s ? "#1a1a1a" : newKidStep > s ? "#2ecc71" : "rgba(255,255,255,0.3)",
                          border: newKidStep > s ? "1px solid rgba(46,204,113,0.5)" : "none",
                        }}>
                          {newKidStep > s ? "✓" : s}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Step labels */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {["👦 Info del Niño", "👨‍👩‍👧 Info del Padre"].map((label, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, color: newKidStep === i + 1 ? "#fdbb2d" : "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>{label}</div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "18px 20px" }}>

                  {/* STEP 1 — Kid info */}
                  {newKidStep === 1 && (
                    <>
                      <label style={S.label}>Nombre completo del niño *</label>
                      <input style={{ ...S.input, borderColor: newKidForm.name ? "rgba(253,187,45,0.4)" : "rgba(255,255,255,0.12)" }}
                        placeholder="ej. Ana González"
                        value={newKidForm.name}
                        onChange={e => setNewKidForm(p => ({ ...p, name: e.target.value }))}
                        autoFocus
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={S.label}>Edad *</label>
                          <input style={{ ...S.input, borderColor: newKidForm.age ? "rgba(253,187,45,0.4)" : "rgba(255,255,255,0.12)" }}
                            type="number" min="0" max="17" placeholder="ej. 7"
                            value={newKidForm.age}
                            onChange={e => setNewKidForm(p => ({ ...p, age: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label style={S.label}>Salón</label>
                          <select style={S.select} value={newKidForm.classroom} onChange={e => setNewKidForm(p => ({ ...p, classroom: e.target.value }))}>
                            {CLASSROOMS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Auto-suggest classroom based on age */}
                      {newKidForm.age && (() => {
                        const age = parseInt(newKidForm.age);
                        const suggested = age <= 2 ? "c1" : age <= 5 ? "c2" : age <= 8 ? "c3" : age <= 11 ? "c4" : "c5";
                        const suggestedCls = CLASSROOMS.find(c => c.id === suggested);
                        if (suggested !== newKidForm.classroom) return (
                          <button onClick={() => setNewKidForm(p => ({ ...p, classroom: suggested }))}
                            style={{ width: "100%", marginBottom: 10, background: "rgba(78,205,196,0.1)", border: "1px dashed rgba(78,205,196,0.4)", borderRadius: 10, padding: "8px 12px", color: "#4ECDC4", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                            💡 Por edad ({newKidForm.age} años) → {suggestedCls?.name} recomendado. ¿Asignar?
                          </button>
                        );
                      })()}

                      <label style={S.label}>Alergias / Notas médicas</label>
                      <input style={S.input}
                        placeholder="ej. Maní, Látex · o deja vacío si ninguna"
                        value={newKidForm.allergies}
                        onChange={e => setNewKidForm(p => ({ ...p, allergies: e.target.value }))}
                      />

                      <button
                        onClick={() => { if (newKidForm.name && newKidForm.age) setNewKidStep(2); }}
                        disabled={!newKidForm.name || !newKidForm.age}
                        style={{ ...S.btnPrimary, width: "100%", padding: 14, fontSize: 14, opacity: (!newKidForm.name || !newKidForm.age) ? 0.4 : 1, marginTop: 4 }}>
                        Continuar → Info del Padre
                      </button>
                    </>
                  )}

                  {/* STEP 2 — Parent info */}
                  {newKidStep === 2 && (
                    <>
                      {/* Kid summary chip */}
                      <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
                        <span style={{ fontSize: 28 }}>{parseInt(newKidForm.age) <= 3 ? "👧" : parseInt(newKidForm.age) <= 7 ? "🧒" : "👦"}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{newKidForm.name}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                            {newKidForm.age} años · {CLASSROOMS.find(c => c.id === newKidForm.classroom)?.name}
                            {newKidForm.allergies && <span style={{ color: "#ff6b6b" }}> · ⚠️ {newKidForm.allergies}</span>}
                          </div>
                        </div>
                        <button onClick={() => setNewKidStep(1)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✏️ Editar</button>
                      </div>

                      <label style={S.label}>Nombre del padre / madre / encargado *</label>
                      <input style={{ ...S.input, borderColor: newKidForm.parentName ? "rgba(253,187,45,0.4)" : "rgba(255,255,255,0.12)" }}
                        placeholder="ej. Juan González"
                        value={newKidForm.parentName}
                        onChange={e => setNewKidForm(p => ({ ...p, parentName: e.target.value }))}
                        autoFocus
                      />

                      <label style={S.label}>Teléfono / WhatsApp *</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>📱</span>
                        <input style={{ ...S.input, paddingLeft: 42, borderColor: newKidForm.parentPhone ? "rgba(253,187,45,0.4)" : "rgba(255,255,255,0.12)" }}
                          placeholder="+504 9999-0000"
                          value={newKidForm.parentPhone}
                          onChange={e => setNewKidForm(p => ({ ...p, parentPhone: e.target.value }))}
                          type="tel"
                        />
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: -6, marginBottom: 14 }}>
                        Se enviará WhatsApp con el código de seguridad
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <button
                          onClick={() => handleAddKid(true)}
                          disabled={!newKidForm.parentName || !newKidForm.parentPhone || savingNewKid}
                          style={{
                            ...S.btnPrimary, padding: 16, fontSize: 15, opacity: (!newKidForm.parentName || !newKidForm.parentPhone) ? 0.4 : 1,
                            background: "linear-gradient(135deg,#2ecc71,#27ae60)",
                            boxShadow: "0 4px 20px rgba(46,204,113,0.35)"
                          }}>
                          {savingNewKid ? "⏳ Registrando..." : "✅ Registrar y hacer Check-In ahora"}
                        </button>
                        <button
                          onClick={() => handleAddKid(false)}
                          disabled={!newKidForm.parentName || savingNewKid}
                          style={{ ...S.btnGhost, padding: 13, fontSize: 13, opacity: !newKidForm.parentName ? 0.4 : 1 }}>
                          Registrar sin Check-In por ahora
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── KIDS LIST ─────────────────────────────────────────────── */}
            {!showNewKidPanel && (
              <div style={{ padding: "0 20px" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                  {filteredKids.length} niño{filteredKids.length !== 1 ? "s" : ""} encontrado{filteredKids.length !== 1 ? "s" : ""}
                </div>
                {filteredKids.map(kid => {
                  const cls = CLASSROOMS.find(c => c.id === kid.classroom);
                  const alreadyIn = isCheckedIn(kid.id);
                  return (
                    <div key={kid.id} style={S.kidRow}>
                      <div style={{ ...S.kidEmoji, fontSize: 26 }}>{kid.photo}</div>
                      <div style={S.kidInfo}>
                        <div style={S.kidName}>{kid.name}</div>
                        <div style={S.kidMeta}>
                          {kid.age} años · {cls?.name}
                          {kid.allergies !== "Ninguna" && <span style={{ color: "#ff6b6b", marginLeft: 6 }}>⚠️ {kid.allergies}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>👤 {kid.parentName}</div>
                      </div>
                      {alreadyIn ? (
                        <button onClick={() => handleCheckOut(kid.id)} style={{ ...S.btnDanger, padding: "8px 14px", fontSize: 12 }}>Entrega</button>
                      ) : (
                        <button onClick={() => handleCheckIn(kid)} disabled={checkingIn} style={{ ...S.btnPrimary, padding: "8px 14px", fontSize: 12, opacity: checkingIn ? 0.7 : 1 }}>
                          {checkingIn ? "⏳" : "Check-In"}
                        </button>
                      )}
                    </div>
                  );
                })}
                {filteredKids.length === 0 && !searchQuery && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontWeight: 700 }}>Busca un niño arriba</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>O toca <strong style={{ color: "#fdbb2d" }}>＋</strong> para registrar uno nuevo</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TICKET */}
        {view === VIEWS.TICKET && currentTicket && (() => {
          const cls = CLASSROOMS.find(c => c.id === currentTicket.classroom);
          return (
            <div style={{ padding: "20px 0 0" }}>
              <div style={{ padding: "0 20px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => setView(VIEWS.HOME)} style={S.btnGhost}>← Volver</button>
                <div style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>Ticket Generado</div>
              </div>

              {/* Child Ticket */}
              <div style={S.ticket}>
                <div style={S.ticketHeader(cls?.color)}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8, marginBottom: 4 }}>✝ Misión Cristiana Elim Honduras · Kids Check-In</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 48 }}>{currentTicket.photo}</div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{currentTicket.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
                        {currentTicket.age} años · {cls?.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={S.ticketBody}>
                  {/* Code */}
                  <div style={S.codeBox}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: 2, marginBottom: 4 }}>CÓDIGO DE SEGURIDAD</div>
                    <div style={S.codeText}>{currentTicket.code}</div>
                  </div>

                  {/* QR */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ display: "inline-block", background: "#fff", padding: 12, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                      <QRCodeCanvas value={currentTicket.qrValue} size={140} />
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 8, fontWeight: 700, letterSpacing: 1 }}>ESCANEAR PARA VERIFICAR</div>
                  </div>

                  <div style={S.ticketDivider} />

                  {/* Notification Status Banner */}
                  {notifStatus && (() => {
                    const configs = {
                      sending: { bg: "#e3f2fd", border: "#90caf9", icon: "⏳", color: "#1565c0", text: `Enviando ${notifStatus.channel} a ${currentTicket.parentName}...` },
                      sent: { bg: "#e8f5e9", border: "#81c784", icon: "✅", color: "#2e7d32", text: `${notifStatus.channel} enviado exitosamente a ${currentTicket.parentName}` },
                      failed: { bg: "#fff3e0", border: "#ffb74d", icon: "⚠️", color: "#e65100", text: `No se pudo enviar ${notifStatus.channel}. Informa al padre el código manualmente.` },
                      demo: { bg: "#f3e5f5", border: "#ce93d8", icon: "🔧", color: "#6a1b9a", text: `Modo demo — conecta la API para enviar ${notifStatus.channel} real` },
                    };
                    const cfg = configs[notifStatus.state];
                    return (
                      <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: cfg.color, letterSpacing: 0.5 }}>
                            {notifStatus.state === "sent" ? "NOTIFICACIÓN ENVIADA" : notifStatus.state === "sending" ? "ENVIANDO..." : notifStatus.state === "demo" ? "MODO DEMO" : "ERROR DE NOTIFICACIÓN"}
                          </div>
                          <div style={{ fontSize: 12, color: cfg.color, marginTop: 2, lineHeight: 1.4 }}>{cfg.text}</div>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={S.ticketRow}>
                    <div>
                      <div style={S.ticketLabel}>Salón</div>
                      <div style={S.ticketValue}>{cls?.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={S.ticketLabel}>Maestro/a</div>
                      <div style={S.ticketValue}>{cls?.teacher}</div>
                    </div>
                  </div>

                  <div style={S.ticketRow}>
                    <div>
                      <div style={S.ticketLabel}>Check-In</div>
                      <div style={S.ticketValue}>{currentTicket.checkInTime}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={S.ticketLabel}>Padre/Madre</div>
                      <div style={S.ticketValue}>{currentTicket.parentName}</div>
                    </div>
                  </div>

                  {currentTicket.allergies !== "Ninguna" && (
                    <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#856404" }}>ALERTA MÉDICA</div>
                        <div style={{ fontSize: 13, color: "#856404", fontWeight: 700 }}>Alergia a: {currentTicket.allergies}</div>
                      </div>
                    </div>
                  )}

                  <div style={S.ticketDivider} />
                  <div style={{ textAlign: "center", fontSize: 11, color: "#999" }}>
                    {currentTicket.checkInDate}
                  </div>
                </div>
              </div>

              {/* Parent Receipt */}
              <div style={{ margin: "0 20px", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                  🎫 Talón para Padres
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{currentTicket.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{cls?.name} · {currentTicket.checkInTime}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#fdbb2d", letterSpacing: 4 }}>{currentTicket.code}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>CÓDIGO SEGURIDAD</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                  Presente este código al retirar a su hijo/a
                </div>
              </div>

              <div style={{ padding: "0 20px", display: "flex", gap: 10 }}>
                <button onClick={() => window.print && window.print()} style={{ ...S.btnPrimary, flex: 1, padding: 14, fontSize: 14 }}>🖨️ Imprimir Ticket</button>
                <button onClick={() => setView(VIEWS.HOME)} style={{ ...S.btnGhost, flex: 1, padding: 14, fontSize: 14 }}>Listo</button>
              </div>
            </div>
          );
        })()}

        {/* CLASSROOMS */}
        {view === VIEWS.CLASSROOMS && (
          <div style={{ padding: "20px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>🏫 Salones</div>
            {CLASSROOMS.map(cls => {
              const kids = classroomKids(cls.id);
              return (
                <div key={cls.id} onClick={() => { setSelectedClassroom(cls); setView(VIEWS.CLASSROOM_DETAIL); }}
                  style={{ ...S.kidRow, cursor: "pointer", borderLeft: `3px solid ${cls.color}`, padding: "18px 20px", marginBottom: 12 }}>
                  <div style={{ ...S.kidEmoji, background: cls.color + "22", fontSize: 22 }}>🏫</div>
                  <div style={S.kidInfo}>
                    <div style={S.kidName}>{cls.name}</div>
                    <div style={S.kidMeta}>{cls.ageRange} · {cls.teacher}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: cls.color }}>{kids.length}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>/ {cls.capacity}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CLASSROOM DETAIL */}
        {view === VIEWS.CLASSROOM_DETAIL && selectedClassroom && (() => {
          const kids = classroomKids(selectedClassroom.id);
          return (
            <div style={{ padding: "20px" }}>
              <button onClick={() => setView(VIEWS.CLASSROOMS)} style={{ ...S.btnGhost, marginBottom: 16 }}>← Salones</button>
              <div style={{ background: selectedClassroom.color + "22", border: `1px solid ${selectedClassroom.color}44`, borderRadius: 20, padding: 20, marginBottom: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: selectedClassroom.color }}>{selectedClassroom.name}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{selectedClassroom.ageRange} · {selectedClassroom.teacher}</div>
                <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
                  <div><span style={{ fontSize: 22, fontWeight: 900, color: selectedClassroom.color }}>{kids.length}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>presentes</span></div>
                  <div><span style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.4)" }}>{selectedClassroom.capacity - kids.length}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>disponibles</span></div>
                </div>
              </div>

              {kids.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🪑</div>
                  <div>Salón vacío</div>
                </div>
              ) : (
                kids.map(kid => (
                  <div key={kid.id} style={S.kidRow}>
                    <div style={{ ...S.kidEmoji, fontSize: 24 }}>{kid.photo}</div>
                    <div style={S.kidInfo}>
                      <div style={S.kidName}>{kid.name}</div>
                      <div style={S.kidMeta}>✅ Llegó a las {kid.checkInTime}</div>
                      {kid.allergies !== "Ninguna" && <div style={{ fontSize: 11, color: "#ff6b6b", marginTop: 2 }}>⚠️ Alergia: {kid.allergies}</div>}
                    </div>
                    <button onClick={() => handleCheckOut(kid.id)} style={{ ...S.btnDanger, padding: "8px 12px", fontSize: 11 }}>Entrega</button>
                  </div>
                ))
              )}
            </div>
          );
        })()}

        {/* ADMIN */}
        {view === VIEWS.ADMIN && (
          <div style={{ padding: "20px" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4 }}>
              {[["add", "➕ Nuevo Niño"], ["list", "📋 Niños"], ["reports", "📊 Reportes"]].map(([t, l]) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  flex: 1, padding: "10px 8px", border: "none", borderRadius: 10,
                  background: activeTab === t ? "rgba(253,187,45,0.2)" : "transparent",
                  color: activeTab === t ? "#fdbb2d" : "rgba(255,255,255,0.4)",
                  fontWeight: 800, fontSize: 11, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s",
                }}>{l}</button>
              ))}
            </div>

            {activeTab === "add" && (
              <div style={S.card}>
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16 }}>Registrar Nuevo Niño</div>
                <label style={S.label}>Nombre Completo</label>
                <input style={S.input} placeholder="ej. Ana González" value={newKidForm.name} onChange={e => setNewKidForm(p => ({ ...p, name: e.target.value }))} />
                <label style={S.label}>Edad</label>
                <input style={S.input} type="number" placeholder="ej. 7" value={newKidForm.age} onChange={e => setNewKidForm(p => ({ ...p, age: e.target.value }))} />
                <label style={S.label}>Nombre del Padre/Madre</label>
                <input style={S.input} placeholder="ej. Juan González" value={newKidForm.parentName} onChange={e => setNewKidForm(p => ({ ...p, parentName: e.target.value }))} />
                <label style={S.label}>Teléfono del Padre</label>
                <input style={S.input} placeholder="+504 9999-0000" value={newKidForm.parentPhone} onChange={e => setNewKidForm(p => ({ ...p, parentPhone: e.target.value }))} />
                <label style={S.label}>Alergias / Notas Médicas</label>
                <input style={S.input} placeholder="ej. Maní, Látex... o Ninguna" value={newKidForm.allergies} onChange={e => setNewKidForm(p => ({ ...p, allergies: e.target.value }))} />
                <label style={S.label}>Salón Asignado</label>
                <select style={S.select} value={newKidForm.classroom} onChange={e => setNewKidForm(p => ({ ...p, classroom: e.target.value }))}>
                  {CLASSROOMS.map(c => <option key={c.id} value={c.id}>{c.name} ({c.ageRange})</option>)}
                </select>
                <button onClick={handleAddKid} style={{ ...S.btnPrimary, width: "100%", padding: 14, fontSize: 14, marginTop: 6 }}>
                  ✅ Registrar Niño
                </button>
              </div>
            )}

            {activeTab === "list" && (
              <>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{allKids.length} niños registrados</div>
                {allKids.map(kid => {
                  const cls = CLASSROOMS.find(c => c.id === kid.classroom);
                  return (
                    <div key={kid.id} style={S.kidRow}>
                      <div style={{ ...S.kidEmoji, fontSize: 24 }}>{kid.photo}</div>
                      <div style={S.kidInfo}>
                        <div style={S.kidName}>{kid.name}</div>
                        <div style={S.kidMeta}>{kid.age} años · {cls?.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>👤 {kid.parentName}</div>
                      </div>
                      {isCheckedIn(kid.id) && <div style={{ fontSize: 10, color: "#2ecc71", fontWeight: 800, letterSpacing: 1 }}>ACTIVO</div>}
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === "reports" && (
              <>
                <div style={S.statGrid}>
                  {[
                    { label: "Total Registrados", val: allKids.length, color: "#4ECDC4", icon: "👶" },
                    { label: "Check-ins Hoy", val: checkedInKids.length, color: "#fdbb2d", icon: "✅" },
                    { label: "Salones Activos", val: CLASSROOMS.filter(c => classroomKids(c.id).length > 0).length, color: "#C3A6FF", icon: "🏫" },
                    { label: "Con Alergias", val: allKids.filter(k => k.allergies !== "Ninguna").length, color: "#FF6B9D", icon: "⚠️" },
                  ].map(s => (
                    <div key={s.label} style={S.statCard(s.color)}>
                      <div style={{ fontSize: 24 }}>{s.icon}</div>
                      <div style={S.statNum(s.color)}>{s.val}</div>
                      <div style={S.statLabel}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 14 }}>Asistencia por Salón</div>
                  {CLASSROOMS.map(cls => {
                    const count = classroomKids(cls.id).length;
                    const pct = (count / cls.capacity) * 100;
                    return (
                      <div key={cls.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{cls.name}</span>
                          <span style={{ fontSize: 13, color: cls.color, fontWeight: 800 }}>{count}/{cls.capacity}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 6 }}>
                          <div style={{ width: `${pct}%`, background: cls.color, borderRadius: 6, height: "100%", transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ ...S.card, background: "rgba(253,187,45,0.08)", borderColor: "rgba(253,187,45,0.2)" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#fdbb2d", marginBottom: 8 }}>⚙️ Integración API</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    Conecta con tu backend via:<br />
                    <code style={{ color: "#4ECDC4", fontFamily: "monospace" }}>POST /api/checkin</code><br />
                    <code style={{ color: "#4ECDC4", fontFamily: "monospace" }}>GET /api/kids</code><br />
                    <code style={{ color: "#4ECDC4", fontFamily: "monospace" }}>POST /api/checkout</code><br />
                    Compatible con Next.js API Routes + n8n Webhooks
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav style={S.nav}>
        {[
          { icon: "🏠", label: "Inicio", v: VIEWS.HOME },
          { icon: "✅", label: "Check-In", v: VIEWS.CHECKIN },
          { icon: "🏫", label: "Salones", v: VIEWS.CLASSROOMS },
          { icon: "⚙️", label: "Admin", v: VIEWS.ADMIN },
        ].map(item => (
          <button key={item.v} onClick={() => setView(item.v)} style={S.navBtn(view === item.v || (view === VIEWS.TICKET && item.v === VIEWS.CHECKIN) || (view === VIEWS.CLASSROOM_DETAIL && item.v === VIEWS.CLASSROOMS))}>
            <span style={S.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        * { -webkit-tap-highlight-color: transparent; }
        input, select { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}
