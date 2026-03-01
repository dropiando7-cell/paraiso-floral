"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Printer, Plus, Users, UserPlus, FileText, CheckCircle2, ArrowLeft, Maximize, Minimize, CheckSquare, XCircle, Info, ScanLine, Camera, Edit2, Settings, Beaker, School, ShieldCheck } from "lucide-react";
import { getCheckinData, addKid, doCheckIn, doCheckOut, addClassroom, updateClassroom, generateMockKids } from "@/app/(dashboard)/checkin/actions";
import { useLayoutControls } from "@/components/layout/MobileDashboardWrapper";
import ScannerComponent from './ScannerComponent';

import QRCode from "react-qr-code";

function QRCodeCanvas({ value, size = 120 }: { value: string, size?: number }) {
    return (
        <div style={{ background: 'white', padding: '8px', borderRadius: '8px', display: 'inline-block' }}>
            <QRCode value={value} size={size - 16} level="H" />
        </div>
    );
}

// ─── Data ───────────────────────────────────────────────────────────────────
const CLASSROOMS = [
    { id: "c1", name: "Semillitas", ageRange: "0–2 años", teacher: "Hermana María", capacity: 10, color: "bg-pink-100 text-pink-700 border-pink-200" },
    { id: "c2", name: "Jardín de Dios", ageRange: "3–5 años", teacher: "Hermano Pablo", capacity: 15, color: "bg-teal-100 text-teal-700 border-teal-200" },
    { id: "c3", name: "Guerreros de Fe", ageRange: "6–8 años", teacher: "Hermana Ana", capacity: 20, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    { id: "c4", name: "Héroes Bíblicos", ageRange: "9–11 años", teacher: "Hermano Luis", capacity: 20, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { id: "c5", name: "Jóvenes Creyentes", ageRange: "12–14 años", teacher: "Hermana Rosa", capacity: 18, color: "bg-purple-100 text-purple-700 border-purple-200" },
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

const VIEWS = { HOME: "home", CHECKIN: "checkin", TICKET: "ticket", CLASSROOMS: "classrooms", CLASSROOM_DETAIL: "classroom_detail", MANAGE_CLASSROOM: "manage_classroom", SCANNER: "scanner" };

export function ChurchCheckInApp({ initialData }: { initialData?: any }) {
    const { isFullscreen, setIsFullscreen } = useLayoutControls();
    // Determine early if we have data to skip loading skeleton
    const [isLoading, setIsLoading] = useState(!initialData);
    const [view, setView] = useState(VIEWS.HOME);
    const [searchQuery, setSearchQuery] = useState("");

    // Lazy rendering state
    const [visibleCount, setVisibleCount] = useState(5);
    const [directoryVisibleCount, setDirectoryVisibleCount] = useState(24);
    const [showRecentCheckIns, setShowRecentCheckIns] = useState(false);
    const [observerReady, setObserverReady] = useState(false);

    // Default initialization from initialData
    const [classrooms, setClassrooms] = useState<any[]>(initialData?.classrooms || []);
    const [allKids, setAllKids] = useState<any[]>(initialData?.kids || []);
    const [checkedInKids, setCheckedInKids] = useState<any[]>(() => {
        if (!initialData?.activeCheckins) return [];
        return initialData.activeCheckins.map((ci: any) => ({
            ...ci.kid,
            code: ci.securityCode,
            checkInTime: new Date(ci.createdAt).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
            qrValue: `IGLESIA-CHECKIN:${ci.kidId}:${ci.securityCode}:${new Date(ci.createdAt).getTime()}`,
            notifStatus: ci.notifProvider
        }));
    });

    const [currentTicket, setCurrentTicket] = useState<any>(null);
    const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("checkin");
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const [isCameraActive, setIsCameraActive] = useState(false);

    const [newKidForm, setNewKidForm] = useState({ name: "", age: "", gender: "No Especificado", parentName: "", parentPhone: "", allergies: "", classroom: classrooms[0]?.id || "" });
    const [checkingIn, setCheckingIn] = useState(false);
    const [notifStatus, setNotifStatus] = useState<any>(null);
    const [showNewKidPanel, setShowNewKidPanel] = useState(false);
    const [newKidStep, setNewKidStep] = useState(1);
    const [savingNewKid, setSavingNewKid] = useState(false);

    // Classroom State Handling
    const [classroomForm, setClassroomForm] = useState({ id: "", name: "", ageRange: "", teacher: "", capacity: 20, color: "bg-brand-100 text-brand-700 border-brand-200" });
    const [savingClassroom, setSavingClassroom] = useState(false);

    // Checkout Confirmation Handling
    const [kidToCheckout, setKidToCheckout] = useState<any>(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Scanner Handling
    const [scannerInput, setScannerInput] = useState("");
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Prevent observer from firing immediately on mount when items haven't fully rendered
        const timer = setTimeout(() => setObserverReady(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!loadMoreRef.current || !observerReady) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setDirectoryVisibleCount((prev) => prev + 24);
                }
            },
            { rootMargin: "100px", threshold: 0.1 }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [view, showNewKidPanel, searchQuery, allKids.length, observerReady]);

    useEffect(() => {
        if (view === VIEWS.SCANNER && scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, [view]);

    const handleScannerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = scannerInput.trim();
        if (code) {
            const kid = checkedInKids.find(k => k.code.toUpperCase() === code.toUpperCase());
            if (kid) {
                setKidToCheckout(kid);
                setView(VIEWS.HOME);
            } else {
                showToast(`CÓDIGO NO ENCONTRADO (${code})`, "error");
            }
        }
        setScannerInput("");
    };

    useEffect(() => {
        if (!initialData) {
            getCheckinData().then(data => {
                if (data.classrooms) {
                    setClassrooms(data.classrooms);
                    if (data.classrooms.length > 0) setNewKidForm(p => ({ ...p, classroom: data.classrooms[0].id }));
                }
                if (data.kids) setAllKids(data.kids);
                if (data.activeCheckins) {
                    const mapped = data.activeCheckins.map((ci: any) => ({
                        ...ci.kid,
                        code: ci.securityCode,
                        checkInTime: new Date(ci.createdAt).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
                        qrValue: `IGLESIA-CHECKIN:${ci.kidId}:${ci.securityCode}:${new Date(ci.createdAt).getTime()}`,
                        notifStatus: ci.notifProvider
                    }));
                    setCheckedInKids(mapped);
                }
                setIsLoading(false);
            });
        }
    }, [initialData]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                // Confirm Checkout Modal
                if (kidToCheckout && !isCheckingOut) {
                    e.preventDefault();
                    handleCheckOut();
                }
                // Confirm New Kid Registration
                else if (showNewKidPanel && newKidStep === 2 && !savingNewKid && newKidForm.parentName && newKidForm.parentPhone) {
                    e.preventDefault();
                    handleAddKid(true); // "Registrar y Check-In" action
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [kidToCheckout, isCheckingOut, showNewKidPanel, newKidStep, savingNewKid, newKidForm]);

    const handleGenerateMockData = async () => {
        setCheckingIn(true);
        showToast("Generando 50 niños ficticios...", "info");
        const res = await generateMockKids(50);
        if (res.error) showToast(res.error, "error");
        else {
            showToast(res.message || "Datos generados. Recargando...", "success");
            setTimeout(() => window.location.reload(), 1500);
        }
        setCheckingIn(false);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const filteredKids = allKids.filter(k => {
        const checkedInInfo = checkedInKids.find(ci => ci.id === k.id);
        const matchesName = k.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesParent = k.parentName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCode = checkedInInfo && checkedInInfo.code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesName || matchesParent || matchesCode;
    });

    const handleCheckIn = async (kid: any) => {
        setCheckingIn(true);
        const code = generateTicketCode();

        const result = await doCheckIn(kid.id, code);

        if (result.error) {
            showToast(result.error, "error");
            setCheckingIn(false);
            return;
        }

        const ticket = {
            ...kid, code,
            checkInTime: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
            checkInDate: new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
            qrValue: `IGLESIA-CHECKIN:${kid.id}:${code}:${Date.now()}`,
            notifStatus: result.notification?.sent ? "WhatsApp" : "Ninguna"
        };

        setCurrentTicket(ticket);
        setCheckedInKids(prev => [...prev.filter(k => k.id !== kid.id), ticket]);
        setView(VIEWS.TICKET);

        if (result.notification?.sent) {
            showToast(`✅ Registrado y notificado por WhatsApp`, "success");
            setNotifStatus({ state: "sent", channel: "WhatsApp" });
        } else {
            showToast(`✅ Registrado (Sin notificar: ${result.notification?.error || "Falta config"})`, "warning");
            setNotifStatus({ state: "error", channel: "WhatsApp" });
        }

        setCheckingIn(false);
    };

    const handleCheckOut = async () => {
        if (!kidToCheckout) return;
        setIsCheckingOut(true);
        const result = await doCheckOut(kidToCheckout.id);
        setIsCheckingOut(false);
        if (result.error) {
            showToast(result.error, "error");
            setKidToCheckout(null);
            return;
        }
        setCheckedInKids(prev => prev.filter(k => k.id !== kidToCheckout.id));
        setKidToCheckout(null);
        showToast("👋 Niño entregado a sus padres", "info");
    };

    const isCheckedIn = (kidId: string) => checkedInKids.some(k => k.id === kidId);

    const handleAddKid = async (autoCheckIn = false) => {
        if (!newKidForm.name || !newKidForm.age || !newKidForm.parentName) return;
        setSavingNewKid(true);
        const photo = parseInt(newKidForm.age) <= 3 ? "👧" : parseInt(newKidForm.age) <= 7 ? "🧒" : "👦";

        const payload = {
            ...newKidForm,
            age: parseInt(newKidForm.age),
            photoEmoji: photo,
            classroomId: newKidForm.classroom
        };

        const result = await addKid(payload);
        if (result.error) {
            showToast(result.error, "error");
            setSavingNewKid(false);
            return;
        }

        setAllKids(prev => [...prev, result.kid]);
        setNewKidForm({ name: "", age: "", gender: "No Especificado", parentName: "", parentPhone: "", allergies: "", classroom: classrooms[0]?.id || "" });

        if (autoCheckIn) {
            // Wait for the checkIn to complete fully so WhatsApp triggers in this same frame
            await handleCheckIn(result.kid);
            showToast("✅ Niño registrado e ingresado con éxito");
        } else {
            showToast("✅ Niño registrado en el sistema");
        }

        setShowNewKidPanel(false);
        setNewKidStep(1);
        setSavingNewKid(false);
    };

    const classroomKids = (classroomId: string) => checkedInKids.filter(k => k.classroom === classroomId);
    const totalCheckedIn = checkedInKids.length;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#F0F4FF] flex flex-col items-center pb-24 font-sans text-[#1B2E6B]">
            {toast && (
                <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border border-slate-200 bg-white text-slate-800 backdrop-blur-md">
                        {toast.type === 'success' ? <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                            : toast.type === 'info' ? <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Info className="w-5 h-5 text-blue-500" /></div>
                                : toast.type === 'warning' ? <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0"><Info className="w-5 h-5 text-amber-500" /></div>
                                    : <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5 text-red-500" /></div>}
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-5xl bg-white min-h-[calc(100vh-4rem)] shadow-xl relative overflow-hidden flex flex-col">

                {/* NEW HEADER (Demo 1 Style) */}
                <div className="bg-white px-5 py-4 border-b-2 border-slate-200 flex items-center justify-between gap-4 flex-wrap print:hidden shrink-0 z-10 w-full relative rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#2563EB] rounded-xl flex items-center justify-center text-xl shrink-0">
                            ⛪
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold text-[#1B2E6B] leading-tight">Sistema de Check-In</h1>
                            <span className="text-[11px] text-slate-500 font-medium">Elim Honduras · Escuela Bíblica Elim</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#FFF0D6] border-[1.5px] border-[#F5A623] text-[#B07000] text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wide shrink-0">
                        <div className="w-2 h-2 bg-[#F5A623] rounded-full animate-pulse"></div>
                        EN VIVO · {new Date().toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short" }).replace('.', '')}
                    </div>
                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="ml-auto flex items-center gap-2 bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-xl transition-colors shrink-0 print:hidden"
                        title={isFullscreen ? "Salir de pantalla completa" : "Modo Kiosco (Pantalla completa)"}
                    >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                            {isFullscreen ? "Salir Modo Kiosco" : "Modo Kiosco"}
                        </span>
                    </button>
                </div>

                {/* NEW STATS BAR (Demo 1 Style) */}
                <div className="bg-[#2563EB] flex justify-center w-full overflow-x-auto print:hidden shrink-0">
                    {[
                        { label: "Check-Ins", val: totalCheckedIn, icon: "🟢" },
                        { label: "Salones", val: classrooms.filter(c => classroomKids(c.id).length > 0).length, icon: "🏛️" },
                        { label: "Niños", val: allKids.length, icon: "👶" },
                    ].map((s, idx) => (
                        <div key={s.label} className={`flex items-center justify-center gap-3 py-4 flex-1 min-w-[120px] ${idx < 2 ? 'border-r border-white/10' : ''}`}>
                            <div className="text-2xl">{s.icon}</div>
                            <div className="flex flex-col">
                                <div className="text-2xl font-extrabold text-white leading-none">{s.val}</div>
                                <div className="text-[10px] text-white/60 font-medium uppercase tracking-wider">{s.label}</div>
                            </div>
                        </div>
                    ))}
                    {/* Tiny Mock Data Button overlaid or aligned next to it */}
                    <button onClick={handleGenerateMockData} disabled={checkingIn} className="absolute right-2 top-[80px] bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white/80 transition-colors" title="Generar datos demo">
                        <Beaker className="w-4 h-4" />
                    </button>
                </div>

                {/* ── NAV TOP ── */}
                <nav className="w-full bg-white border-b-2 border-slate-200 py-2 flex justify-around shrink-0 z-40 sticky top-0 shadow-sm print:hidden">
                    {[
                        { icon: "🏠", label: "Inicio", v: VIEWS.HOME },
                        { icon: "✅", label: "Check-in", v: VIEWS.CHECKIN },
                        { icon: "🏛️", label: "Salones", v: VIEWS.CLASSROOMS },
                    ].map(item => {
                        const isActive = view === item.v || (view === VIEWS.TICKET && item.v === VIEWS.CHECKIN) || (view === VIEWS.CLASSROOM_DETAIL && item.v === VIEWS.CLASSROOMS);
                        return (
                            <button key={item.v} onClick={() => setView(item.v)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${isActive ? 'bg-[#F0F4FF] text-[#3B6FE8]' : 'text-[#7A8DB8] hover:bg-slate-50 hover:text-[#2563EB]'
                                    }`}>
                                <div className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>{item.icon}</div>
                                <span className={`text-[0.75rem] font-bold uppercase tracking-[0.05em] hidden sm:inline-block ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* ── VIEWS ── */}
                <div className="p-5 relative z-0 h-full">

                    {/* HOME */}
                    {view === VIEWS.HOME && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-lg font-black text-slate-900 mb-4 tracking-tight">Acciones Rápidas</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                {[
                                    {
                                        icon: "✅", title: "Check-In Especial", sub: "Buscar y registrar entrada", action: () => { setView(VIEWS.CHECKIN); setShowNewKidPanel(false); setActiveTab("checkin"); },
                                        styleClass: "bg-[#2563EB] border-[#2563EB] text-white shadow-[0_8px_32px_rgba(37,99,235,0.13)]", iconBg: "bg-white/15", titleColor: "text-white text-[1rem]", subColor: "text-white/65", arrow: "text-white/50 group-hover:text-white"
                                    },
                                    {
                                        icon: "👤", title: "Nuevo Visitante", sub: "Registrar primera vez", action: () => { setView(VIEWS.CHECKIN); setShowNewKidPanel(true); setNewKidStep(1); },
                                        styleClass: "bg-white border-[#D6E0FF] text-[#1B2E6B] shadow-[0_8px_32px_rgba(39,72,181,0.13)]", iconBg: "bg-[#F0EEFF]", titleColor: "text-[#1B2E6B] text-[1rem]", subColor: "text-[#7A8DB8]", arrow: "text-[#7A8DB8] group-hover:text-[#3B6FE8]"
                                    },
                                    {
                                        icon: "📷", title: "Escanear QR Gafete", sub: "Escanear para Check-out", action: () => setView(VIEWS.SCANNER),
                                        styleClass: "bg-white border-[#D6E0FF] text-[#1B2E6B] shadow-[0_8px_32px_rgba(39,72,181,0.13)]", iconBg: "bg-[#E6FFFE]", titleColor: "text-[#1B2E6B] text-[1rem]", subColor: "text-[#7A8DB8]", arrow: "text-[#7A8DB8] group-hover:text-[#3B6FE8]"
                                    },
                                    {
                                        icon: "🏫", title: "Monitorear Salones", sub: "Ver ocupación por clase", action: () => setView(VIEWS.CLASSROOMS),
                                        styleClass: "bg-white border-[#D6E0FF] text-[#1B2E6B] shadow-[0_8px_32px_rgba(39,72,181,0.13)]", iconBg: "bg-[#FFF5E6]", titleColor: "text-[#1B2E6B] text-[1rem]", subColor: "text-[#7A8DB8]", arrow: "text-[#7A8DB8] group-hover:text-[#3B6FE8]"
                                    },
                                ].map(item => (
                                    <button key={item.title} onClick={item.action}
                                        className={`w-full text-left border-2 p-6 md:p-8 rounded-[20px] transition-all hover:-translate-y-1 hover:border-[#3B6FE8] flex flex-col items-start gap-3 relative overflow-hidden group ${item.styleClass}`}>
                                        <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl shrink-0 ${item.iconBg}`}>
                                            {item.icon}
                                        </div>
                                        <div className="flex-1 z-10">
                                            <h3 className={`font-bold leading-tight ${item.titleColor}`}>{item.title}</h3>
                                            <p className={`text-[0.78rem] mt-1 ${item.subColor}`}>{item.sub}</p>
                                        </div>
                                        <div className={`absolute bottom-6 right-6 font-sans text-xl transition-transform group-hover:translate-x-1 ${item.arrow}`}>
                                            →
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {isLoading ? (
                                <>
                                    <div className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <span>Cargando asistencia...</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm relative overflow-hidden h-[66px]">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 animate-pulse"></div>
                                                <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse ml-2 shrink-0"></div>
                                                <div className="flex-1 space-y-2 py-1">
                                                    <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
                                                    <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse shrink-0"></div>
                                                    <div className="w-14 h-8 rounded-lg bg-red-50/50 animate-pulse shrink-0"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : checkedInKids.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between text-xs font-bold tracking-widest uppercase text-slate-400 mb-3 border-b border-slate-100 pb-2">
                                        <span>Últimos Registros y Total ({checkedInKids.length})</span>
                                        <button
                                            onClick={() => setShowRecentCheckIns(!showRecentCheckIns)}
                                            className="text-[#3B6FE8] hover:text-[#1B2E6B] transition-colors"
                                        >
                                            {showRecentCheckIns ? "Ocultar" : "Mostrar"}
                                        </button>
                                    </div>

                                    {showRecentCheckIns && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {checkedInKids.slice(0, visibleCount).map((kid, index) => {
                                                const cls = classrooms.find(c => c.id === kid.classroom);
                                                return (
                                                    <div key={`${kid.id}-${index}`} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm relative overflow-hidden group">
                                                        <div className={`absolute top-0 left-0 w-1 h-full ${cls?.color.split(' ')[0] || 'bg-brand-500'}`}></div>
                                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 text-xl ml-2">
                                                            {kid.photo}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-[#1B2E6B] text-base truncate leading-tight">{kid.name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                                                                <span className="font-semibold">{cls?.name}</span>
                                                                <span>·</span>
                                                                <span className="text-emerald-600 font-semibold" suppressHydrationWarning>{kid.checkInTime}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => { setCurrentTicket(kid); setView(VIEWS.TICKET); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F0F4FF] text-[#3B6FE8] hover:bg-[#D6E0FF] transition-colors">
                                                                <FileText className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => setKidToCheckout(kid)} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors">
                                                                Salida
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {checkedInKids.length > visibleCount && (
                                                <button onClick={() => setVisibleCount(p => p + 10)} className="w-full col-span-1 sm:col-span-2 lg:col-span-3 py-4 text-sm font-bold text-[#3B6FE8] hover:bg-[#F0F4FF] border border-dashed border-[#D6E0FF] rounded-xl transition-colors">
                                                    Ver {Math.min(10, checkedInKids.length - visibleCount)} más... ({checkedInKids.length - visibleCount} restantes)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* --- SCANNER VIEW --- */}
                    {view === VIEWS.SCANNER && (
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-32">
                            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border-2 border-[#D6E0FF] shadow-2xl relative overflow-hidden text-center mt-8">
                                <h2 className="text-2xl font-black text-[#1B2E6B] mb-2">Modo Escáner</h2>
                                <p className="text-[#7A8DB8] text-sm mb-8">Pasa el lector de código de barras físico o escribe el código del gafete.</p>

                                <div className="w-32 h-32 mx-auto bg-[#F0EEFF] rounded-full flex items-center justify-center mb-8 relative">
                                    <ScanLine className="w-12 h-12 text-[#3B6FE8] animate-pulse relative z-10" />
                                    <div className="absolute inset-0 rounded-full border-4 border-[#3B6FE8] opacity-20 animate-ping"></div>
                                </div>

                                {!isCameraActive ? (
                                    <>
                                        <form onSubmit={handleScannerSubmit}>
                                            <input
                                                ref={scannerInputRef}
                                                type="text"
                                                value={scannerInput}
                                                onChange={(e) => setScannerInput(e.target.value)}
                                                placeholder="AB12C..."
                                                className="w-full text-center text-3xl font-black tracking-[0.2em] text-[#1B2E6B] border-2 border-[#D6E0FF] rounded-xl p-4 uppercase focus:outline-none focus:border-[#3B6FE8] focus:ring-4 focus:ring-[#3B6FE8]/20 transition-all placeholder:text-slate-300"
                                                autoFocus
                                            />
                                            <button type="submit" className="hidden">Buscar</button>
                                        </form>

                                        <div className="mt-6 flex flex-col gap-3">
                                            <button
                                                onClick={() => setIsCameraActive(true)}
                                                className="w-full flex items-center justify-center gap-2 bg-[#F0F4FF] hover:bg-[#D6E0FF] text-[#3B6FE8] font-bold py-3.5 rounded-xl transition-all"
                                            >
                                                <Camera className="w-5 h-5" /> Activar Cámara
                                            </button>

                                            <button
                                                onClick={() => setView(VIEWS.HOME)}
                                                className="w-full text-[#7A8DB8] font-bold text-sm hover:text-[#1B2E6B] transition-colors py-2"
                                            >
                                                Cancelar y volver
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-6">
                                        <ScannerComponent
                                            onScan={(decodedText) => {
                                                console.log("Scanned:", decodedText);
                                                setIsCameraActive(false);

                                                // If it's the full QR code payload (e.g. IGLESIA-CHECKIN:id:code:timestamp)
                                                if (decodedText.startsWith("IGLESIA-CHECKIN:")) {
                                                    const parts = decodedText.split(":");
                                                    if (parts.length >= 3) {
                                                        const ticketCode = parts[2];
                                                        setScannerInput(ticketCode);
                                                        // Automatically trigger the effect of pressing Enter
                                                        setTimeout(() => {
                                                            if (scannerInputRef.current) {
                                                                const event = new Event('submit', { cancelable: true, bubbles: true });
                                                                scannerInputRef.current.form?.dispatchEvent(event);
                                                            }
                                                        }, 100);
                                                    }
                                                } else {
                                                    // Barcode fallback
                                                    setScannerInput(decodedText);
                                                    setTimeout(() => {
                                                        if (scannerInputRef.current) {
                                                            const event = new Event('submit', { cancelable: true, bubbles: true });
                                                            scannerInputRef.current.form?.dispatchEvent(event);
                                                        }
                                                    }, 100);
                                                }
                                            }}
                                            onCancel={() => {
                                                setIsCameraActive(false);
                                                // Refocus the input
                                                setTimeout(() => scannerInputRef.current?.focus(), 100);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CHECK-IN */}
                    {view === VIEWS.CHECKIN && (
                        <div className="animate-in fade-in duration-300">
                            {/* Search bar + New Kid button */}
                            <div className="sticky top-[60px] sm:top-[68px] bg-white/80 backdrop-blur-xl z-30 -mx-5 px-5 py-3 border-b border-slate-100 mb-4 flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-10 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none"
                                        placeholder="Buscar niño o padre..."
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setShowNewKidPanel(false); }}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setShowNewKidPanel(p => !p); setNewKidStep(1); setSearchQuery(""); }}
                                    className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-white shadow-md transition-all ${showNewKidPanel ? 'bg-slate-800' : 'bg-brand-600 hover:bg-brand-700'}`}>
                                    {showNewKidPanel ? <XCircle className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
                                </button>
                            </div>

                            {/* Quick "add new" hint when no results */}
                            {!showNewKidPanel && searchQuery && filteredKids.length === 0 && (
                                <button
                                    onClick={() => { setShowNewKidPanel(true); setNewKidForm(p => ({ ...p, name: searchQuery })); setSearchQuery(""); setNewKidStep(1); }}
                                    className="w-full mb-4 bg-brand-50 border border-brand-200 border-dashed rounded-2xl p-4 text-brand-700 font-bold text-sm text-left flex items-center justify-between hover:bg-brand-100 transition-colors">
                                    <span>➕ Registrar "{searchQuery}" como nuevo</span>
                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                </button>
                            )}

                            {/* ── INLINE NEW KID PANEL ── */}
                            {showNewKidPanel && (
                                <div className="bg-white border-2 border-brand-100 rounded-3xl overflow-hidden shadow-lg shadow-brand-100/50 mb-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="bg-brand-50 px-5 py-4 border-b border-brand-100 flex justify-between items-center">
                                        <div>
                                            <div className="font-black text-brand-900 flex items-center gap-2">
                                                <UserPlus className="w-4 h-4 text-brand-600" /> Nuevo Visitante
                                            </div>
                                            <div className="text-xs font-medium text-brand-600/70 mt-0.5">Registro y check-in exprés</div>
                                        </div>
                                        {/* Steps */}
                                        <div className="flex items-center gap-2">
                                            {[1, 2].map(s => (
                                                <div key={s} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${newKidStep === s ? 'bg-brand-600 text-white' :
                                                    newKidStep > s ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                                                    }`}>
                                                    {newKidStep > s ? '✓' : s}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        {/* STEP 1 */}
                                        {newKidStep === 1 && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Nombre completo del niño *</label>
                                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium"
                                                        placeholder="ej. Ana González" value={newKidForm.name} onChange={e => setNewKidForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Edad *</label>
                                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium"
                                                            type="number" min="0" max="17" placeholder="ej. 7" value={newKidForm.age} onChange={e => setNewKidForm(p => ({ ...p, age: e.target.value }))} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Sexo *</label>
                                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium text-slate-700"
                                                            value={newKidForm.gender} onChange={e => setNewKidForm(p => ({ ...p, gender: e.target.value }))}>
                                                            <option value="No Especificado">Seleccionar...</option>
                                                            <option value="Masculino">Masculino</option>
                                                            <option value="Femenino">Femenino</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Salón (Auto)</label>
                                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium text-slate-700"
                                                        value={newKidForm.classroom} onChange={e => setNewKidForm(p => ({ ...p, classroom: e.target.value }))}>
                                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>

                                                {newKidForm.age && classrooms.length > 0 && (() => {
                                                    const age = parseInt(newKidForm.age);
                                                    const suggestedCls = classrooms.find(c => {
                                                        if (!c.ageRange) return false;
                                                        // Extract numbers from something like "3-5 años"
                                                        const match = c.ageRange.match(/(\d+)[\s-–a]*(\d+)?/);
                                                        if (match) {
                                                            const min = parseInt(match[1]);
                                                            const max = match[2] ? parseInt(match[2]) : min;
                                                            return age >= min && age <= max;
                                                        }
                                                        return false;
                                                    });

                                                    if (suggestedCls && suggestedCls.id !== newKidForm.classroom) return (
                                                        <button onClick={() => setNewKidForm(p => ({ ...p, classroom: suggestedCls.id }))}
                                                            className="w-full flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl px-3 py-2 text-xs font-bold hover:bg-indigo-100 transition-colors text-left">
                                                            <span>💡</span> <span>Sugerido por edad: <strong>{suggestedCls.name}</strong>. ¿Asignar?</span>
                                                        </button>
                                                    );
                                                })()}

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Alergias / Notas</label>
                                                    <input className="w-full bg-slate-50 border border-amber-200/50 rounded-xl px-4 py-3 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium"
                                                        placeholder="ej. Maní, Asma · o vacío" value={newKidForm.allergies} onChange={e => setNewKidForm(p => ({ ...p, allergies: e.target.value }))} />
                                                </div>

                                                <button onClick={() => { if (newKidForm.name && newKidForm.age) setNewKidStep(2); }} disabled={!newKidForm.name || !newKidForm.age}
                                                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-2 flex justify-center items-center gap-2">
                                                    Siguiente <ArrowLeft className="w-4 h-4 rotate-180" />
                                                </button>
                                            </div>
                                        )}

                                        {/* STEP 2 */}
                                        {newKidStep === 2 && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                                                    <div className="text-3xl">{parseInt(newKidForm.age) <= 3 ? "👧" : parseInt(newKidForm.age) <= 7 ? "🧒" : "👦"}</div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-slate-900">{newKidForm.name}</div>
                                                        <div className="text-xs text-slate-500">{newKidForm.age} años · {classrooms.find(c => c.id === newKidForm.classroom)?.name}</div>
                                                    </div>
                                                    <button onClick={() => setNewKidStep(1)} className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">Editar</button>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tutor / Padre *</label>
                                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium"
                                                        placeholder="ej. Juan González" value={newKidForm.parentName} onChange={e => setNewKidForm(p => ({ ...p, parentName: e.target.value }))} autoFocus />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">WhatsApp *</label>
                                                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
                                                        <div className="flex items-center justify-center pl-4 pr-2 bg-slate-100 border-r border-slate-200 text-slate-500 font-bold text-sm select-none">
                                                            +504
                                                        </div>
                                                        <input className="w-full bg-transparent px-3 py-3 text-sm outline-none font-medium"
                                                            placeholder="9999-0000" type="tel" value={newKidForm.parentPhone.replace(/^\+504\s*/, '')} onChange={e => setNewKidForm(p => ({ ...p, parentPhone: `+504 ${e.target.value}` }))} />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1 text-center">Se enviará el sticker digital por WhatsApp</p>
                                                </div>

                                                <div className="grid gap-2 pt-2">
                                                    <button onClick={() => handleAddKid(true)} disabled={!newKidForm.parentName || !newKidForm.parentPhone || savingNewKid}
                                                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                                                        {savingNewKid ? "⏳ Guardando..." : "✅ Registrar y Check-In"}
                                                    </button>
                                                    <button onClick={() => handleAddKid(false)} disabled={!newKidForm.parentName || savingNewKid}
                                                        className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm">
                                                        Registrar sin chequear
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* KIDS LIST */}
                            {!showNewKidPanel && (
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1 border-b border-slate-100 pb-2 flex justify-between">
                                        <span>Directorio</span>
                                        <span>{filteredKids.length} niños</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {filteredKids.slice(0, directoryVisibleCount).map(kid => {
                                            const cls = classrooms.find(c => c.id === kid.classroom);
                                            const alreadyIn = isCheckedIn(kid.id);
                                            return (
                                                <div key={kid.id} className="bg-white border border-[#D6E0FF] rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-[0_8px_32px_rgba(39,72,181,0.12)] transition-shadow">
                                                    <div className="w-14 h-14 rounded-2xl bg-[#F0EEFF] flex items-center justify-center text-3xl shrink-0 border border-white">
                                                        {kid.photo}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-[#1B2E6B] text-lg truncate leading-tight">{kid.name}</div>
                                                        <div className="text-xs text-[#7A8DB8] mt-0.5 truncate font-medium">
                                                            <span className="font-semibold text-slate-700">{kid.age}a</span> · {cls?.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide flex items-center gap-1">
                                                            <span>👤</span> {kid.parentName}
                                                        </div>
                                                    </div>
                                                    {alreadyIn ? (
                                                        <button onClick={() => setKidToCheckout(kid)} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black uppercase tracking-wider transition-colors">
                                                            Salida
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleCheckIn(kid)} disabled={checkingIn}
                                                            className="px-5 py-2.5 bg-[#F0F4FF] text-[#3B6FE8] hover:bg-[#3B6FE8] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50">
                                                            Entrada
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {filteredKids.length > directoryVisibleCount && (
                                            <div ref={loadMoreRef} className="w-full col-span-1 sm:col-span-2 lg:col-span-3 py-6 flex justify-center items-center">
                                                <div className="w-6 h-6 border-2 border-[#3B6FE8] border-t-transparent rounded-full animate-spin"></div>
                                                <span className="ml-3 text-sm font-bold text-[#3B6FE8] animate-pulse">Cargando más niños...</span>
                                            </div>
                                        )}
                                    </div>
                                    {filteredKids.length === 0 && !searchQuery && (
                                        <div className="text-center py-16 px-4">
                                            <div className="w-16 h-16 bg-[#F0F4FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Search className="w-8 h-8 text-[#3B6FE8]/50" />
                                            </div>
                                            <h3 className="text-[#1B2E6B] font-bold mb-1">Busca un niño</h3>
                                            <p className="text-[#7A8DB8] text-sm font-medium">O toca el botón + destacado para registrar por primera vez.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TICKET (For Printing / Showing) */}
                    {view === VIEWS.TICKET && currentTicket && (() => {
                        const cls = classrooms.find(c => c.id === currentTicket.classroom);
                        return (
                            <div className="animate-in slide-in-from-right-8 duration-300">
                                <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50 py-2 z-10 print:hidden">
                                    <button onClick={() => setView(VIEWS.HOME)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm text-slate-600 hover:bg-slate-50">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-lg font-black text-slate-900">Pase Generado</h2>
                                </div>

                                {/* Printable Ticket Area */}
                                <div id="print-ticket" className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200 mb-6 print:fixed print:inset-0 print:z-[99999] print:m-0 print:p-0 print:w-full print:h-auto print:bg-white print:border-none print:shadow-none print:rounded-none print:block print:overflow-visible">

                                    {/* Screen UI - Hidden on Print */}
                                    <div className={`px-4 py-3 text-center relative overflow-hidden print:hidden ${cls?.color.split(' ')[0] || 'bg-brand-600'}`}>
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="text-[10px] font-black tracking-[0.2em] text-white/90 uppercase mb-2">Elim Honduras</div>
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-2 border-white mx-auto flex items-center justify-center shadow-sm mb-2 overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blanco-1.png" alt="Elim Logo" className="w-10 h-10 object-contain" />
                                            </div>
                                            <h3 className="text-xl font-black text-white leading-tight">{currentTicket.name}</h3>
                                            <p className="text-xs font-bold text-white/90 mt-0.5">{cls?.name}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 text-center print:hidden">
                                        <div className="flex flex-col items-center gap-4 mb-6">
                                            {/* QR Code */}
                                            <div className="inline-block p-4 bg-white rounded-2xl shadow-inner border-2 border-slate-100">
                                                <QRCode value={currentTicket.qrValue} size={160} level="H" />
                                            </div>

                                            <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Escanea para Check-out</div>

                                            {/* Barcode */}
                                            <div className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                                                <img
                                                    src={`https://barcodeapi.org/api/128/${currentTicket.code}`}
                                                    alt={`Barcode ${currentTicket.code}`}
                                                    className="w-full max-w-[200px] h-auto object-contain mb-2"
                                                />
                                                <div className="text-3xl font-black tracking-[0.2em] text-[#0f172a] font-mono mt-2 whitespace-nowrap">
                                                    {currentTicket.code.split('').join(' ')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-left border-t border-dashed border-slate-200 pt-5">
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Encargado</div>
                                                <div className="text-sm font-bold text-slate-800 truncate">{currentTicket.parentName}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hora Entrada</div>
                                                <div className="text-sm font-bold text-slate-800">{currentTicket.checkInTime}</div>
                                            </div>
                                        </div>

                                        {currentTicket.allergies !== "Ninguna" && (
                                            <div className="mt-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex items-start gap-3 text-left">
                                                <div className="text-xl">⚠️</div>
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-wider">Alerta Médica</div>
                                                    <div className="text-sm font-semibold">{currentTicket.allergies}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Print UI - Only Visible on Print */}
                                    {/* PAGE 1: Child's Sticker (Planning Center Layout) */}
                                    <div className="hidden print:flex print:flex-col font-sans text-black bg-white p-3 box-border w-[3in] h-[2in] print:break-after-page relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1 pr-2">
                                                <h1 className="text-[28px] font-extrabold leading-none text-slate-900 tracking-tight mb-0.5 truncate">
                                                    {currentTicket.name.split(' ')[0]}
                                                </h1>
                                                <h2 className="text-[20px] font-extrabold leading-none text-slate-700 tracking-tight truncate">
                                                    {currentTicket.name.split(' ').slice(1).join(' ')}
                                                </h2>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end">
                                                <div className="bg-slate-700 text-white font-black text-xl px-2 py-1 rounded-xl mb-1 tabular-nums border-[2px] border-slate-800 print:text-black print:bg-white print:border-black">
                                                    {currentTicket.code}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-600 print:text-black text-right max-w-[1.2in] leading-tight">
                                                    Checked in by:<br />{currentTicket.parentName.split(' ')[0]}
                                                </div>
                                            </div>
                                        </div>

                                        <hr className="border-t-[2px] border-slate-800 my-1.5 print:border-black" />

                                        <div className="flex-1 space-y-1 mt-0.5">
                                            <div className="text-[10px] font-bold text-slate-700 print:text-black flex justify-between">
                                                <span>{new Date().toLocaleDateString('es-HN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                <span className="truncate ml-2">{cls?.name}</span>
                                            </div>

                                            {currentTicket.allergies !== "Ninguna" ? (
                                                <div className="text-xs font-black text-slate-900 flex items-start gap-1 print:text-black mt-1 bg-slate-100 p-1 rounded-md print:bg-white print:border print:border-black">
                                                    <span>⚠️</span>
                                                    <span className="leading-tight">{currentTicket.allergies}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[9px] font-semibold text-slate-500 print:text-gray-600 mt-1">Sin alergias</div>
                                            )}
                                        </div>

                                        <div className="absolute bottom-1.5 right-3 text-[8px] font-bold text-slate-500 print:text-black uppercase tracking-widest text-right">
                                            Elim Kids
                                        </div>
                                    </div>

                                    {/* PAGE 2: Parent Receipt with QR */}
                                    <div className="hidden print:flex print:flex-col font-sans text-black bg-white p-3 box-border w-[3in] h-[2in] relative justify-between overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 pr-2">
                                                <div className="text-[9px] font-black uppercase tracking-widest print:text-black mb-1">Recibo de Padre</div>
                                                <h2 className="text-base font-black leading-none text-slate-900 print:text-black truncate">{currentTicket.name}</h2>
                                                <div className="text-[9px] font-bold print:text-black mt-1">{new Date().toLocaleDateString('es-HN')} · {currentTicket.checkInTime}</div>
                                            </div>
                                            <div className="bg-slate-700 text-white font-black text-lg px-2 py-1 rounded-lg tabular-nums border-[2px] border-slate-800 print:text-black print:bg-white print:border-black shrink-0">
                                                {currentTicket.code}
                                            </div>
                                        </div>

                                        <div className="flex flex-row items-center justify-center gap-3 mt-1.5 h-full">
                                            <div className="border-[2px] border-slate-800 print:border-black rounded-lg p-0.5 shrink-0">
                                                <div style={{ background: 'white', padding: '2px' }}>
                                                    <QRCode value={currentTicket.qrValue} size={70} level="L" />
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-black tracking-wider text-slate-900 print:text-black uppercase text-center leading-relaxed">
                                                Escanea tu QR <br /> para hacer <br /> check-out
                                            </div>
                                        </div>

                                        <div className="absolute bottom-1.5 right-3 text-[8px] font-bold text-slate-500 print:text-black text-right">
                                            Por favor no pierda este comprobante.
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 print:hidden">
                                    <button onClick={() => window.print()} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                                        <Printer className="w-5 h-5" /> Imprimir
                                    </button>
                                    <button onClick={() => setView(VIEWS.HOME)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all">
                                        Nuevo Check-in
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {/* CLASSROOMS */}
                    {view === VIEWS.CLASSROOMS && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <School className="w-5 h-5 text-indigo-500" /> Monitoreo de Salones
                                </h2>
                                <button onClick={() => { setClassroomForm({ id: "", name: "", ageRange: "", teacher: "", capacity: 20, color: "bg-brand-100 text-brand-700 border-brand-200" }); setView(VIEWS.MANAGE_CLASSROOM); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {classrooms.map(cls => {
                                    const kids = classroomKids(cls.id);
                                    const occupancy = (kids.length / cls.capacity) * 100;
                                    const [bgColor, textColor] = cls.color.split(' ');
                                    return (
                                        <div key={cls.id} onClick={() => { setSelectedClassroom(cls); setView(VIEWS.CLASSROOM_DETAIL); }}
                                            className="w-full cursor-pointer text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                            <div className={`absolute top-0 left-0 w-1.5 h-full ${bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`}></div>

                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-bold text-slate-900 text-lg">{cls.name}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{cls.ageRange} · {cls.teacher}</div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <div className="text-right">
                                                        <div className={`text-2xl font-black ${textColor.replace('text-', 'text-').replace('-700', '-600')}`}>{kids.length}</div>
                                                        <div className="text-[10px] font-bold text-slate-400">de {cls.capacity} disp.</div>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); setClassroomForm({ id: cls.id, name: cls.name, ageRange: cls.ageRange || "", teacher: cls.teacher || "", capacity: cls.capacity || 20, color: cls.color || "bg-indigo-100 text-indigo-700 border-indigo-200" }); setView(VIEWS.MANAGE_CLASSROOM); }} className="w-8 h-8 ml-2 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className={`h-2 rounded-full transition-all duration-1000 ${bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`} style={{ width: `${occupancy}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* MANAGE CLASSROOM FORM */}
                    {view === VIEWS.MANAGE_CLASSROOM && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setView(VIEWS.CLASSROOMS)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold mb-6">
                                <ArrowLeft className="w-4 h-4" /> Volver a Salones
                            </button>

                            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                <Settings className="w-6 h-6 text-indigo-500" /> {classroomForm.id ? "Editar Salón" : "Nuevo Salón"}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Nombre del Salón *</label>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium"
                                        placeholder="ej. Semillitas" value={classroomForm.name} onChange={e => setClassroomForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Edades</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium"
                                            placeholder="ej. 0-2 años" value={classroomForm.ageRange} onChange={e => setClassroomForm(p => ({ ...p, ageRange: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Capacidad *</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium"
                                            type="number" value={classroomForm.capacity} onChange={e => setClassroomForm(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Maestro(a) Encargado</label>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium"
                                        placeholder="Nombre del maestro" value={classroomForm.teacher} onChange={e => setClassroomForm(p => ({ ...p, teacher: e.target.value }))} />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Color de Distinción</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:border-indigo-500 outline-none"
                                        value={classroomForm.color} onChange={e => setClassroomForm(p => ({ ...p, color: e.target.value }))}>
                                        <option value="bg-brand-100 text-brand-700 border-brand-200">Naranja (Marca)</option>
                                        <option value="bg-pink-100 text-pink-700 border-pink-200">Rosado Claro</option>
                                        <option value="bg-teal-100 text-teal-700 border-teal-200">Verde Teal</option>
                                        <option value="bg-yellow-100 text-yellow-700 border-yellow-200">Amarillo Fuerte</option>
                                        <option value="bg-emerald-100 text-emerald-700 border-emerald-200">Esmeralda</option>
                                        <option value="bg-purple-100 text-purple-700 border-purple-200">Púrpura</option>
                                        <option value="bg-indigo-100 text-indigo-700 border-indigo-200">Índigo Azul</option>
                                        <option value="bg-red-100 text-red-700 border-red-200">Rojo Brillante</option>
                                    </select>
                                </div>

                                <button onClick={async () => {
                                    if (!classroomForm.name) return;
                                    setSavingClassroom(true);
                                    let res: any;
                                    if (classroomForm.id) {
                                        res = await updateClassroom(classroomForm.id, classroomForm);
                                    } else {
                                        res = await addClassroom(classroomForm);
                                    }
                                    if (res?.error) showToast(res.error, "error");
                                    else if (res?.classroom) {
                                        showToast(classroomForm.id ? "¡Salón actualizado!" : "¡Salón creado!", "success");
                                        if (classroomForm.id) {
                                            setClassrooms(prev => prev.map(c => c.id === classroomForm.id ? res.classroom : c));
                                        } else {
                                            setClassrooms(prev => [...prev, res.classroom]);
                                        }
                                        setView(VIEWS.CLASSROOMS);
                                    } else {
                                        showToast("Error desconocido al guardar", "error");
                                    }
                                    setSavingClassroom(false);
                                }} disabled={savingClassroom} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-4">
                                    {savingClassroom ? "⏳ Guardando..." : "✅ Guardar Salón"}
                                </button>
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* Modal de Check-out */}
            {kidToCheckout && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-red-500 p-6 text-center text-white relative">
                            <button onClick={() => setKidToCheckout(null)} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl shadow-inner border border-white/20">
                                {kidToCheckout.photoEmoji || kidToCheckout.photo || "🧒"}
                            </div>
                            <h3 className="text-xl font-black leading-tight tracking-tight">Confirmar Salida</h3>
                            <p className="text-sm font-medium text-red-100 mt-1 flex items-center justify-center gap-1">
                                ¿Entregar a <strong className="text-white">{kidToCheckout.name}</strong>?
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Padre / Tutor</span>
                                    <span className="text-sm font-black text-slate-800 flex items-center gap-1">👤 {kidToCheckout.parentName}</span>
                                </div>
                                <div className="w-full h-px bg-slate-200 border-dashed border-b"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Salón Actual</span>
                                    <span className="text-sm font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">{classrooms.find(c => c.id === kidToCheckout.classroom)?.name || "N/A"}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setKidToCheckout(null)} disabled={isCheckingOut} className="px-4 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shadow-sm">
                                    Cancelar
                                </button>
                                <button onClick={handleCheckOut} disabled={isCheckingOut} className="px-4 py-3.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex justify-center items-center gap-2 shadow-md">
                                    {isCheckingOut ? "Entregando..." : "Sí, entregar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tailwind Print Styles Injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
            body { background: white !important; }
            @page { margin: 0; size: 100mm 62mm; } /* Landscape ticket size 100mm width x 62mm height */
            /* Scale elements correctly */
            #print-ticket { display: block !important; }
        }
      `}} />
        </div >
    );
}
