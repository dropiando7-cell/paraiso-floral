"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Printer, Plus, Users, UserPlus, FileText, CheckCircle2, ArrowLeft, Maximize, Minimize, CheckSquare, XCircle, Info, ScanLine, Camera, Edit2, Settings, Beaker, School, ShieldCheck, MessageSquare, Send, LayoutGrid, LayoutList } from "lucide-react";
import { getCheckinData, addKid, doCheckIn, doCheckOut, addClassroom, updateClassroom, generateMockKids } from "@/app/(dashboard)/checkin/actions";
import { useLayoutControls } from "@/components/layout/MobileDashboardWrapper";
import ScannerComponent from './ScannerComponent';

import QRCode from "react-qr-code";
import { createClient } from "@/utils/supabase/client";

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

const VIEWS = { HOME: "home", CHECKIN: "checkin", TICKET: "ticket", CLASSROOMS: "classrooms", CLASSROOM_DETAIL: "classroom_detail", MANAGE_CLASSROOM: "manage_classroom", SCANNER: "scanner", MESSAGES: "messages" };

export function ChurchCheckInApp({ initialData }: { initialData?: any }) {
    const { isFullscreen, setIsFullscreen } = useLayoutControls();
    // Determine early if we have data to skip loading skeleton
    const [isLoading, setIsLoading] = useState(!initialData);
    const [view, setView] = useState(VIEWS.HOME);
    const [searchQuery, setSearchQuery] = useState("");
    const [printMode, setPrintMode] = useState<'DIRECT' | 'SERVER'>('SERVER');

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
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'list'>('grid');

    const defaultKid = { name: "", age: "", gender: "No Especificado", allergies: "", classroom: "" };
    const [parentForm, setParentForm] = useState({ parentName: "", parentPhone: "" });
    const [kidsForm, setKidsForm] = useState<any[]>([{ ...defaultKid }]);
    const [checkingIn, setCheckingIn] = useState(false);
    const [notifStatus, setNotifStatus] = useState<any>(null);
    const [showNewKidPanel, setShowNewKidPanel] = useState(false);
    const [newKidStep, setNewKidStep] = useState(1);
    const [savingNewKid, setSavingNewKid] = useState(false);

    // Classroom State Handling
    const [classroomForm, setClassroomForm] = useState({ id: "", name: "", ageRange: "", teacher: "", capacity: 20, color: "bg-brand-100 text-brand-700 border-brand-200" });
    const [savingClassroom, setSavingClassroom] = useState(false);

    // Checkout Confirmation Handling
    const [kidsToCheckout, setKidsToCheckout] = useState<any[]>([]);
    const [selectedKidsForCheckout, setSelectedKidsForCheckout] = useState<Set<string>>(new Set());
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Scanner Handling
    const [scannerInput, setScannerInput] = useState("");
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Multi-select for Check-in
    const [selectedKidsForCheckin, setSelectedKidsForCheckin] = useState<Set<string>>(new Set());

    // User Role Reference
    const userRole = initialData?.userRole || "USER";
    const canSendMassMessages = ["SUPER_ADMIN", "ORG_ADMIN", "CHECKIN_KIDS_ADMIN"].includes(userRole);

    // Messages State
    const [messageTab, setMessageTab] = useState<'mass' | 'individual'>(canSendMassMessages ? 'mass' : 'individual');
    const [messageBody, setMessageBody] = useState("");
    const [messageContext, setMessageContext] = useState(""); // Variable {{1}}
    const [sendingMessage, setSendingMessage] = useState(false);
    const [selectedKidForMessage, setSelectedKidForMessage] = useState<any>(null);

    useEffect(() => {
        // Prevent observer from firing immediately on mount when items haven't fully rendered
        const timer = setTimeout(() => setObserverReady(true), 1000);
        const savedMode = localStorage.getItem('checkinPrintMode');
        if (savedMode === 'DIRECT' || savedMode === 'SERVER') setPrintMode(savedMode);
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
            const matchedKids = checkedInKids.filter(k => k.code.toUpperCase() === code.toUpperCase());
            if (matchedKids.length > 0) {
                setKidsToCheckout(matchedKids);
                setSelectedKidsForCheckout(new Set(matchedKids.map(k => k.id)));
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
                    if (data.classrooms.length > 0) {
                        setKidsForm([{ ...defaultKid, classroom: data.classrooms[0].id }]);
                    }
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

        // Setup Realtime subscriptions
        const supabase = createClient();

        // Listen to new kids being registered
        const kidsSubscription = supabase
            .channel('public:Kid')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Kid' }, (payload) => {
                const newKid = payload.new;
                setAllKids(currentKids => {
                    // Check if we already have it to avoid duplicates
                    if (currentKids.some(k => k.id === newKid.id)) return currentKids;
                    // Because we sort DESC by createdAt in the initial fetch, prepend it
                    return [newKid, ...currentKids];
                });
            })
            .subscribe();

        // Listen to checkin events
        const checkinSubscription = supabase
            .channel('public:CheckIn')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'CheckIn' }, async (payload) => {
                const newCheckin = payload.new;

                // We need the kid data associated with this checkin
                // Could fetch just the kid, or trust `allKids` has it
                setAllKids(currentKids => {
                    const kid = currentKids.find(k => k.id === newCheckin.kidId);
                    if (kid) {
                        setCheckedInKids(currentChecked => {
                            if (currentChecked.some(c => c.id === kid.id)) return currentChecked;

                            const ticket = {
                                ...kid,
                                code: newCheckin.securityCode,
                                checkInTime: new Date(newCheckin.createdAt).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
                                qrValue: `IGLESIA-CHECKIN:${kid.id}:${newCheckin.securityCode}:${new Date(newCheckin.createdAt).getTime()}`,
                                notifStatus: newCheckin.notifProvider || "Ninguna"
                            };
                            return [...currentChecked, ticket];
                        });
                    }
                    return currentKids;
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'CheckIn' }, (payload) => {
                const updatedCheckin = payload.new;
                if (updatedCheckin.checkedOut) {
                    setCheckedInKids(current => current.filter(k => k.id !== updatedCheckin.kidId));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(kidsSubscription);
            supabase.removeChannel(checkinSubscription);
        };
    }, [initialData]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                // Confirm Checkout Modal
                if (kidsToCheckout.length > 0 && !isCheckingOut) {
                    e.preventDefault();
                    handleCheckOut();
                }
                // Confirm New Kid Registration
                else if (showNewKidPanel && newKidStep === 2 && !savingNewKid && !kidsForm.some(k => !k.name || !k.age)) {
                    e.preventDefault();
                    handleAddKid(true); // "Registrar y Check-In" action
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [kidsToCheckout, isCheckingOut, showNewKidPanel, newKidStep, savingNewKid, parentForm, kidsForm]);

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
        const isCheckedIn = !!checkedInInfo;

        // 1. Text Search Filter
        const q = searchQuery.toLowerCase().trim();
        let passesTextSearch = true;
        if (q !== "") {
            const terms = q.split(/\s+/);
            const target = `${k.name} ${k.parentName || ""} ${checkedInInfo ? checkedInInfo.code : ""}`.toLowerCase();
            passesTextSearch = terms.every(term => target.includes(term));
        }

        // 2. Status Filter
        let passesStatusFilter = true;
        if (filterStatus === 'IN') passesStatusFilter = isCheckedIn;
        if (filterStatus === 'OUT') passesStatusFilter = !isCheckedIn;

        return passesTextSearch && passesStatusFilter;
    }).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    const handleGroupCheckIn = async (kidIds: string[]) => {
        if (kidIds.length === 0) return;
        setCheckingIn(true);
        const code = generateTicketCode();

        // Check if any of these are already checked in (failsafe)
        const alreadyCheckedIn = kidIds.filter(id => isCheckedIn(id));
        if (alreadyCheckedIn.length > 0) {
            showToast("Algunos niños ya estaban ingresados. Se omitieron.", "warning");
        }

        const validKidIds = kidIds.filter(id => !isCheckedIn(id));
        if (validKidIds.length === 0) {
            setCheckingIn(false);
            return;
        }

        const result = await doCheckIn(validKidIds, code);

        if (result.error) {
            showToast(result.error, "error");
            setCheckingIn(false);
            return;
        }

        const newTickets = validKidIds.map(id => {
            const kid = allKids.find(k => k.id === id);
            return {
                ...kid, code,
                checkInTime: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
                checkInDate: new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
                qrValue: `IGLESIA-CHECKIN:FAMILY:${code}:${Date.now()}`,
                notifStatus: result.notification?.sent ? "WhatsApp" : "Ninguna"
            };
        });

        // Current ticket should ideally show the "Family Code" or the first kid
        // We will store the array of tickets to print them all
        setCurrentTicket({ type: "FAMILY", tickets: newTickets, code, qrValue: newTickets[0].qrValue, parentName: newTickets[0].parentName, checkInTime: newTickets[0].checkInTime, autoPrint: true });

        setCheckedInKids(prev => {
            const filtered = prev.filter(k => !validKidIds.includes(k.id));
            return [...filtered, ...newTickets];
        });

        setView(VIEWS.TICKET);
        setSelectedKidsForCheckin(new Set()); // clear selection

        if (result.notification?.sent) {
            showToast(`✅ ${validKidIds.length} registrados y notificados`, "success");
            setNotifStatus({ state: "sent", channel: "WhatsApp" });
        } else {
            showToast(`✅ ${validKidIds.length} registrados (Sin WhatsApp: ${result.notification?.error || "Falta config"})`, "warning");
            setNotifStatus({ state: "error", channel: "WhatsApp" });
        }

        setCheckingIn(false);
    };



    const handleCheckOut = async () => {
        if (kidsToCheckout.length === 0 || selectedKidsForCheckout.size === 0) return;
        setIsCheckingOut(true);

        const idsArray = Array.from(selectedKidsForCheckout);

        // Loop over the selected kids to check them out
        for (const kidId of idsArray) {
            const res = await doCheckOut(kidId);
            if (res.error) {
                showToast(res.error, "error");
                // Stop evaluating the rest if there's an issue
                setIsCheckingOut(false);
                return;
            }
        }

        setCheckedInKids(prev => prev.filter(k => !selectedKidsForCheckout.has(k.id)));
        setKidsToCheckout([]);
        setSelectedKidsForCheckout(new Set());
        showToast("👋 Niños seleccionados entregados a sus padres", "info");
        setIsCheckingOut(false);
    };

    const isCheckedIn = (kidId: string) => checkedInKids.some(k => k.id === kidId);

    const handleAddKid = async (autoCheckIn = false) => {
        if (!parentForm.parentName || kidsForm.some(k => !k.name || !k.age)) return;
        setSavingNewKid(true);

        const addedKidIds: string[] = [];
        const addedKidObjects: any[] = [];
        let hasError = false;

        for (const kidForm of kidsForm) {
            const photo = parseInt(kidForm.age) <= 3 ? "👧" : parseInt(kidForm.age) <= 7 ? "🧒" : "👦";
            const payload = {
                ...kidForm,
                age: parseInt(kidForm.age),
                photoEmoji: photo,
                classroomId: kidForm.classroom,
                parentName: parentForm.parentName,
                parentPhone: parentForm.parentPhone
            };

            const result = await addKid(payload);
            if (result.error) {
                showToast(`Error al añadir ${kidForm.name}: ${result.error}`, "error");
                hasError = true;
                break;
            }
            addedKidIds.push(result.kid!.id);
            addedKidObjects.push(result.kid);
            setAllKids(prev => [result.kid, ...prev]);
        }

        if (hasError) {
            setSavingNewKid(false);
            return;
        }

        setParentForm({ parentName: "", parentPhone: "" });
        setKidsForm([{ name: "", age: "", gender: "No Especificado", allergies: "", classroom: classrooms[0]?.id || "" }]);
        setNewKidStep(1);
        setShowNewKidPanel(false);

        if (autoCheckIn && addedKidIds.length > 0) {
            setCheckingIn(true);
            const code = generateTicketCode();

            const checkInRes = await doCheckIn(addedKidIds, code);

            if (checkInRes.error) {
                showToast(checkInRes.error, "error");
                setCheckingIn(false);
                return;
            }

            const ticketObjects = addedKidObjects.map(k => ({
                ...k, code,
                checkInTime: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
                checkInDate: new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
                qrValue: `IGLESIA-CHECKIN:FAMILY:${code}:${Date.now()}`,
                notifStatus: checkInRes.notification?.sent ? "WhatsApp" : "Ninguna"
            }));

            setCurrentTicket({ type: "FAMILY", tickets: ticketObjects, code, qrValue: ticketObjects[0].qrValue, parentName: parentForm.parentName, checkInTime: ticketObjects[0].checkInTime, autoPrint: true });

            setCheckedInKids(prev => {
                const filtered = prev.filter(k => !addedKidIds.includes(k.id));
                return [...filtered, ...ticketObjects];
            });
            setView(VIEWS.TICKET);

            if (checkInRes.notification?.sent) {
                showToast(`✅ Registrado y notificado por WhatsApp`, "success");
                setNotifStatus({ state: "sent", channel: "WhatsApp" });
            } else {
                showToast(`✅ Registrado (Sin notificar: ${checkInRes.notification?.error || "Falta config"})`, "warning");
                setNotifStatus({ state: "error", channel: "WhatsApp" });
            }

            setCheckingIn(false);
        } else {
            setSavingNewKid(false);
            showToast("✅ Registro familiar exitoso", "success");
        }
    }

    const handleTestPrint = () => {
        const testCode = "PCXGT2";
        const dummyTicket = {
            type: "FAMILY",
            code: testCode,
            qrValue: `IGLESIA-CHECKIN:FAMILY:${testCode}:${Date.now()}`,
            parentName: "Carlos García",
            parentPhone: "+504 9465-5361",
            checkInTime: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
            tickets: [
                {
                    id: "test1",
                    name: "Arnold Swuasineger",
                    classroom: classrooms[0]?.id || "c1",
                    code: testCode,
                    parentName: "Carlos García",
                    parentPhone: "+504 9465-5361",
                    qrValue: `IGLESIA-CHECKIN:test1:${testCode}:${Date.now()}`,
                    allergies: "Maní, Gluten",
                }
            ],
            autoPrint: true
        };
        setCurrentTicket(dummyTicket);
        setView(VIEWS.TICKET);
    };

    const classroomKids = (classroomId: string) => checkedInKids.filter(k => (k.classroomId || k.classroom) === classroomId);
    const totalCheckedIn = checkedInKids.length;

    useEffect(() => {
        if (view === VIEWS.TICKET && currentTicket?.autoPrint) {
            if (printMode === 'DIRECT') {
                const timer = setTimeout(() => {
                    window.print();
                    setCurrentTicket((prev: any) => ({ ...prev, autoPrint: false }));
                }, 500); // Wait 500ms for DOM to render
                return () => clearTimeout(timer);
            } else {
                fetch('/api/checkin/encolar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketData: currentTicket })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast("Impresión enviada a la cola remota", "success");
                    } else {
                        showToast(`Error de impresión: ${data.error}`, "error");
                    }
                    setCurrentTicket((prev: any) => ({ ...prev, autoPrint: false }));
                })
                .catch(err => {
                    showToast("Error conectando con el servidor de impresión", "error");
                    setCurrentTicket((prev: any) => ({ ...prev, autoPrint: false }));
                });
            }
        }
    }, [view, currentTicket, printMode]);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#F0F4FF] flex flex-col items-center pb-24 font-sans text-[#1B2E6B]">
            <style>{`
                @media print {
                    @page { 
                        size: 3in 2in; 
                        margin: 0; 
                    }
                    html, body {
                        width: 3in !important;
                        height: 2in !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-ticket, #print-ticket * {
                        visibility: visible;
                    }
                    #print-ticket {
                        position: fixed;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 3in !important;
                        height: 2in !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        overflow: hidden !important;
                    }
                }
            `}</style>
            <div className="contents">
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
                        {/* Fullscreen & Print Mode Toggle */}
                        <div className="ml-auto flex items-center gap-2 print:hidden shrink-0">
                            <button
                                onClick={() => {
                                    const newMode = printMode === 'DIRECT' ? 'SERVER' : 'DIRECT';
                                    setPrintMode(newMode);
                                    localStorage.setItem('checkinPrintMode', newMode);
                                    showToast(`Impresión: ${newMode === 'DIRECT' ? 'Directa (Navegador)' : 'Remota (Servidor)'}`, "info");
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${printMode === 'SERVER' ? 'bg-[#3B6FE8] text-white hover:bg-[#2748B5]' : 'bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-700'}`}
                                title={printMode === 'DIRECT' ? "Usar Impresora Local" : "Usar Servidor Remoto"}
                            >
                                <Printer className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                    {printMode === 'DIRECT' ? "Modo Local" : "Modo Remoto"}
                                </span>
                            </button>
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="flex items-center gap-2 bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-xl transition-colors"
                                title={isFullscreen ? "Salir de pantalla completa" : "Modo Kiosco (Pantalla completa)"}
                            >
                                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                    {isFullscreen ? "Salir Modo" : "Modo Kiosco"}
                                </span>
                            </button>
                        </div>
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
                        {/* Admin Actions */}
                        {["SUPER_ADMIN", "ORG_ADMIN", "CHECKIN_KIDS_ADMIN"].includes(userRole) && (
                            <div className="absolute right-2 top-[80px] flex gap-2">
                                <button onClick={handleTestPrint} disabled={checkingIn} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-white transition-colors flex items-center gap-2 shadow-sm border border-white/10 print:hidden" title="Probar Etiqueta (Debug)">
                                    <Printer className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Test Print</span>
                                </button>
                                <button onClick={handleGenerateMockData} disabled={checkingIn} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white/80 transition-colors print:hidden" title="Generar datos demo">
                                    <Beaker className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── NAV TOP ── */}
                    <nav className="w-full bg-white border-b-2 border-slate-200 py-2 flex justify-around shrink-0 z-40 sticky top-0 shadow-sm print:hidden">
                        {[
                            { icon: "🏠", label: "Inicio", v: VIEWS.HOME },
                            { icon: "✅", label: "Check-in", v: VIEWS.CHECKIN },
                            { icon: "💬", label: "Mensajes", v: VIEWS.MESSAGES },
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
                                            icon: "📸", title: "Escanear QR Gafete", sub: "Escanear para Check-out", action: () => setView(VIEWS.SCANNER),
                                            styleClass: "bg-white border-[#D6E0FF] text-[#1B2E6B] shadow-[0_8px_32px_rgba(39,72,181,0.13)]", iconBg: "bg-[#E6FFFE]", titleColor: "text-[#1B2E6B] text-[1rem]", subColor: "text-[#7A8DB8]", arrow: "text-[#7A8DB8] group-hover:text-[#3B6FE8]"
                                        },
                                        {
                                            icon: "💬", title: "Centro de Mensajes", sub: "Enviar mensaje a padres", action: () => setView(VIEWS.MESSAGES),
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
                                                {[...checkedInKids].reverse().slice(0, visibleCount).map((kid, index) => {
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
                                                                <button onClick={() => {
                                                                    setKidsToCheckout([kid]);
                                                                    setSelectedKidsForCheckout(new Set([kid.id]));
                                                                }} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors">
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
                                        onClick={() => { setShowNewKidPanel(true); setKidsForm([{ name: searchQuery, age: "", gender: "No Especificado", allergies: "", classroom: classrooms[0]?.id || "" }]); setSearchQuery(""); setNewKidStep(1); }}
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
                                            {/* STEP 1: Parent Info */}
                                            {newKidStep === 1 && (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tutor / Padre *</label>
                                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium"
                                                            placeholder="ej. Juan González" value={parentForm.parentName} onChange={e => setParentForm(p => ({ ...p, parentName: e.target.value }))} autoFocus />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">WhatsApp *</label>
                                                        <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
                                                            <div className="flex items-center justify-center pl-4 pr-2 bg-slate-100 border-r border-slate-200 text-slate-500 font-bold text-sm select-none">
                                                                +504
                                                            </div>
                                                            <input className="w-full bg-transparent px-3 py-3 text-sm outline-none font-medium"
                                                                placeholder="9999-0000" type="tel" value={parentForm.parentPhone.replace(/^\+504\s*/, '')} onChange={e => setParentForm(p => ({ ...p, parentPhone: `+504 ${e.target.value}` }))} />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1 text-center">Se enviará el sticker digital por WhatsApp</p>
                                                    </div>

                                                    <button onClick={() => { if (parentForm.parentName && parentForm.parentPhone) setNewKidStep(2); }} disabled={!parentForm.parentName || !parentForm.parentPhone}
                                                        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-2 flex justify-center items-center gap-2">
                                                        Siguiente <ArrowLeft className="w-4 h-4 rotate-180" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* STEP 2: Kids Info */}
                                            {newKidStep === 2 && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-h-[60vh] overflow-y-auto pr-2 pb-4">
                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center gap-3 sticky top-0 z-10 shadow-sm">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-slate-900">Familia: {parentForm.parentName}</div>
                                                            <div className="text-xs text-slate-500">{parentForm.parentPhone}</div>
                                                        </div>
                                                        <button onClick={() => setNewKidStep(1)} className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">Editar Padre</button>
                                                    </div>

                                                    {kidsForm.map((kid, index) => (
                                                        <div key={index} className="space-y-4 border-l-2 border-brand-200 pl-4 relative pt-2">
                                                            {kidsForm.length > 1 && (
                                                                <button onClick={() => setKidsForm(p => p.filter((_, i) => i !== index))} className="absolute top-0 -right-2 text-red-400 hover:text-red-500 bg-white rounded-full">
                                                                    <XCircle className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            <div className="text-xs font-bold text-brand-700 uppercase flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-brand-100 flex justify-center items-center text-brand-700">{index + 1}</div> Niño
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Nombre completo *</label>
                                                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium"
                                                                    placeholder="ej. Ana González" value={kid.name} onChange={e => {
                                                                        const k = [...kidsForm]; k[index].name = e.target.value; setKidsForm(k);
                                                                    }} autoFocus={index === 0} />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Edad *</label>
                                                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium"
                                                                        type="number" min="0" max="17" placeholder="ej. 7" value={kid.age} onChange={e => {
                                                                            const k = [...kidsForm];
                                                                            k[index].age = e.target.value;

                                                                            // Auto-assign classroom if age matches
                                                                            const ageVal = parseInt(e.target.value);
                                                                            if (!isNaN(ageVal) && classrooms.length > 0) {
                                                                                const suggested = classrooms.find(c => {
                                                                                    if (!c.ageRange) return false;
                                                                                    const match = c.ageRange.match(/(\d+)[\s-–a]*(\d+)?/);
                                                                                    if (match) {
                                                                                        const min = parseInt(match[1]);
                                                                                        const max = match[2] ? parseInt(match[2]) : min;
                                                                                        return ageVal >= min && ageVal <= max;
                                                                                    }
                                                                                    return false;
                                                                                });
                                                                                if (suggested) {
                                                                                    k[index].classroom = suggested.id;
                                                                                }
                                                                            }

                                                                            setKidsForm(k);
                                                                        }} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Sexo *</label>
                                                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium text-slate-700"
                                                                        value={kid.gender} onChange={e => {
                                                                            const k = [...kidsForm]; k[index].gender = e.target.value; setKidsForm(k);
                                                                        }}>
                                                                        <option value="No Especificado">Seleccionar...</option>
                                                                        <option value="Masculino">Masculino</option>
                                                                        <option value="Femenino">Femenino</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Salón (Auto)</label>
                                                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-medium text-slate-700"
                                                                    value={kid.classroom} onChange={e => {
                                                                        const k = [...kidsForm]; k[index].classroom = e.target.value; setKidsForm(k);
                                                                    }}>
                                                                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                </select>
                                                            </div>

                                                            {kid.age && classrooms.length > 0 && (() => {
                                                                const age = parseInt(kid.age);
                                                                const suggestedCls = classrooms.find(c => {
                                                                    if (!c.ageRange) return false;
                                                                    const match = c.ageRange.match(/(\d+)[\s-–a]*(\d+)?/);
                                                                    if (match) {
                                                                        const min = parseInt(match[1]);
                                                                        const max = match[2] ? parseInt(match[2]) : min;
                                                                        return age >= min && age <= max;
                                                                    }
                                                                    return false;
                                                                });

                                                                if (suggestedCls && suggestedCls.id !== kid.classroom) return (
                                                                    <button onClick={() => {
                                                                        const k = [...kidsForm]; k[index].classroom = suggestedCls.id; setKidsForm(k);
                                                                    }}
                                                                        className="w-full flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl px-3 py-2 text-xs font-bold hover:bg-indigo-100 transition-colors text-left uppercase mt-2">
                                                                        <span>💡</span> <span>Sugerir salón: <strong>{suggestedCls.name}</strong></span>
                                                                    </button>
                                                                );
                                                            })()}

                                                            <div>
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Alergias / Notas</label>
                                                                <input className="w-full bg-slate-50 border border-amber-200/50 rounded-xl px-4 py-3 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium"
                                                                    placeholder="ej. Maní, Asma · o vacío" value={kid.allergies} maxLength={60} onChange={e => {
                                                                        const k = [...kidsForm]; k[index].allergies = e.target.value; setKidsForm(k);
                                                                    }} />
                                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">{kid.allergies.length}/60 carácteres</p>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button onClick={() => {
                                                        setKidsForm(p => [...p, { name: "", age: "", gender: "No Especificado", allergies: "", classroom: classrooms[0]?.id || "" }]);
                                                    }} className="w-full py-3 border-2 border-dashed border-brand-300 rounded-xl text-brand-600 font-bold text-sm hover:bg-brand-50 transition-colors flex justify-center items-center gap-2 mt-4">
                                                        <UserPlus className="w-5 h-5" /> Añadir otro niño
                                                    </button>

                                                    <div className="grid gap-2 pt-4 border-t border-slate-200 mt-4">
                                                        <button onClick={() => handleAddKid(true)} disabled={kidsForm.some(k => !k.name || !k.age) || savingNewKid}
                                                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                                                            {savingNewKid ? "⏳ Guardando..." : `✅ Registrar y Check-In (${kidsForm.length})`}
                                                        </button>
                                                        <button onClick={() => handleAddKid(false)} disabled={kidsForm.some(k => !k.name || !k.age) || savingNewKid}
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
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex-1">
                                                <span>Directorio</span>
                                                <span className="ml-2 text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">{filteredKids.length} resultados</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Status Filters */}
                                                <div className="flex p-1 bg-slate-100 rounded-xl overflow-hidden">
                                                    {[
                                                        { id: 'ALL', label: 'Todos' },
                                                        { id: 'IN', label: 'Adentro' },
                                                        { id: 'OUT', label: 'Afuera' }
                                                    ].map(filter => (
                                                        <button
                                                            key={filter.id}
                                                            onClick={() => setFilterStatus(filter.id as any)}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterStatus === filter.id
                                                                ? 'bg-white text-brand-700 shadow-sm'
                                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                                                }`}
                                                        >
                                                            {filter.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* View Mode Toggle */}
                                                <div className="flex p-1 bg-slate-100 rounded-xl">
                                                    <button
                                                        onClick={() => setDirectoryViewMode('grid')}
                                                        className={`p-1.5 rounded-lg transition-all ${directoryViewMode === 'grid' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        title="Vista cuadrícula"
                                                    >
                                                        <LayoutGrid className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDirectoryViewMode('list')}
                                                        className={`p-1.5 rounded-lg transition-all ${directoryViewMode === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        title="Vista listado"
                                                    >
                                                        <LayoutList className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── GRID VIEW ── */}
                                        {directoryViewMode === 'grid' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {filteredKids.slice(0, directoryVisibleCount).map(kid => {
                                                    const cls = classrooms.find(c => c.id === (kid.classroomId || kid.classroom));
                                                    const alreadyIn = isCheckedIn(kid.id);
                                                    const checkedInData = checkedInKids.find(ci => ci.id === kid.id);
                                                    // Show first name + first last name to avoid truncation
                                                    const nameParts = kid.name?.split(' ') || [];
                                                    const displayName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : kid.name;
                                                    return (
                                                        <div key={kid.id} className="bg-white border border-[#D6E0FF] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-[0_8px_32px_rgba(39,72,181,0.12)] transition-shadow">
                                                            <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] flex items-center justify-center text-2xl shrink-0 border border-white">
                                                                {kid.photoEmoji || kid.photo || '🧒'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-[#1B2E6B] text-base leading-tight">{displayName}</div>
                                                                <div className="text-xs text-[#7A8DB8] mt-0.5 font-medium truncate">
                                                                    <span className="font-semibold text-slate-700">{kid.age}a</span> · {cls?.name || '—'}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide flex items-center gap-1 truncate">
                                                                    <span>👤</span> {kid.parentName}
                                                                </div>
                                                            </div>
                                                            {alreadyIn ? (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {/* Reprint QR button */}
                                                                    <button
                                                                        onClick={() => {
                                                                            if (checkedInData) {
                                                                                setCurrentTicket({ type: 'FAMILY', tickets: [checkedInData], code: checkedInData.code, qrValue: checkedInData.qrValue, parentName: checkedInData.parentName, checkInTime: checkedInData.checkInTime, autoPrint: false });
                                                                                setView(VIEWS.TICKET);
                                                                            }
                                                                        }}
                                                                        className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 hover:text-brand-600 rounded-xl border border-slate-200 shadow-sm transition-all"
                                                                        title="Reimprimir etiqueta QR"
                                                                    >
                                                                        <Printer className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => {
                                                                        setKidsToCheckout([kid]);
                                                                        setSelectedKidsForCheckout(new Set([kid.id]));
                                                                    }} className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-red-100 border-b-2 active:border-b-0 active:translate-y-[2px]">
                                                                        Salida
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newSet = new Set(selectedKidsForCheckin);
                                                                            if (newSet.has(kid.id)) newSet.delete(kid.id);
                                                                            else newSet.add(kid.id);
                                                                            setSelectedKidsForCheckin(newSet);
                                                                        }}
                                                                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedKidsForCheckin.has(kid.id) ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand-400'}`}
                                                                    >
                                                                        <CheckCircle2 className="w-5 h-5" />
                                                                    </button>
                                                                    {selectedKidsForCheckin.size === 0 && (
                                                                        <button onClick={() => handleGroupCheckIn([kid.id])} disabled={checkingIn}
                                                                            className="px-4 py-2 bg-[#F0F4FF] text-[#3B6FE8] hover:bg-[#3B6FE8] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50">
                                                                            Entrada
                                                                        </button>
                                                                    )}
                                                                </div>
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
                                        )}

                                        {/* ── LIST VIEW ── */}
                                        {directoryViewMode === 'list' && (
                                            <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
                                                {filteredKids.slice(0, directoryVisibleCount).map(kid => {
                                                    const cls = classrooms.find(c => c.id === (kid.classroomId || kid.classroom));
                                                    const alreadyIn = isCheckedIn(kid.id);
                                                    const checkedInData = checkedInKids.find(ci => ci.id === kid.id);
                                                    return (
                                                        <div key={kid.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                                            <div className="w-9 h-9 rounded-xl bg-[#F0EEFF] flex items-center justify-center text-xl shrink-0">
                                                                {kid.photoEmoji || kid.photo || '🧒'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-[#1B2E6B] text-sm leading-tight">{kid.name}</div>
                                                                <div className="text-[11px] text-slate-400 font-medium truncate">
                                                                    {kid.age}a · {cls?.name || '—'} · <span className="text-slate-500">{kid.parentName}</span>
                                                                </div>
                                                            </div>
                                                            {alreadyIn ? (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            if (checkedInData) {
                                                                                setCurrentTicket({ type: 'FAMILY', tickets: [checkedInData], code: checkedInData.code, qrValue: checkedInData.qrValue, parentName: checkedInData.parentName, checkInTime: checkedInData.checkInTime, autoPrint: false });
                                                                                setView(VIEWS.TICKET);
                                                                            }
                                                                        }}
                                                                        className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                                                                        title="Reimprimir etiqueta QR"
                                                                    >
                                                                        <Printer className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => {
                                                                        setKidsToCheckout([kid]);
                                                                        setSelectedKidsForCheckout(new Set([kid.id]));
                                                                    }} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all">
                                                                        Salida
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newSet = new Set(selectedKidsForCheckin);
                                                                            if (newSet.has(kid.id)) newSet.delete(kid.id);
                                                                            else newSet.add(kid.id);
                                                                            setSelectedKidsForCheckin(newSet);
                                                                        }}
                                                                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedKidsForCheckin.has(kid.id) ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand-400'}`}
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </button>
                                                                    {selectedKidsForCheckin.size === 0 && (
                                                                        <button onClick={() => handleGroupCheckIn([kid.id])} disabled={checkingIn}
                                                                            className="px-3 py-1.5 bg-[#F0F4FF] text-[#3B6FE8] hover:bg-[#3B6FE8] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50">
                                                                            Entrada
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {filteredKids.length > directoryVisibleCount && (
                                                    <div ref={loadMoreRef} className="py-5 flex justify-center items-center">
                                                        <div className="w-5 h-5 border-2 border-[#3B6FE8] border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="ml-2 text-sm font-bold text-[#3B6FE8] animate-pulse">Cargando más...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {filteredKids.length === 0 && !searchQuery && (
                                            <div className="text-center py-16 px-4">
                                                <div className="w-16 h-16 bg-[#F0F4FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <Search className="w-8 h-8 text-[#3B6FE8]/50" />
                                                </div>
                                                <h3 className="text-[#1B2E6B] font-bold mb-1">Busca un niño</h3>
                                                <p className="text-[#7A8DB8] text-sm font-medium">O toca el botón + destacado para registrar por primera vez.</p>
                                            </div>
                                        )}

                                        {/* Floating Group Check-in Bar */}
                                        {selectedKidsForCheckin.size > 0 && (
                                            <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-5">
                                                <div className="bg-slate-900 border border-slate-700 text-white p-3 pr-4 rounded-full shadow-2xl flex items-center gap-4 max-w-sm w-full backdrop-blur-md">
                                                    <div className="bg-brand-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black">
                                                        {selectedKidsForCheckin.size}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm">Niños Seleccionados</div>
                                                        <div className="text-[10px] text-slate-400">Listos para Check-in Familiar</div>
                                                    </div>

                                                    <button onClick={() => setSelectedKidsForCheckin(new Set())}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                                        <XCircle className="w-6 h-6" />
                                                    </button>
                                                    <button onClick={() => handleGroupCheckIn(Array.from(selectedKidsForCheckin))} disabled={checkingIn}
                                                        className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs px-5 py-3 rounded-full transition-colors flex items-center gap-2">
                                                        {checkingIn ? "..." : "Ingresar"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TICKET (For Printing / Showing) */}
                        {/* MESSAGES VIEW */}
                        {view === VIEWS.MESSAGES && (
                            <div className="animate-in fade-in duration-300 pb-32">
                                <h2 className="text-xl font-black text-[#1B2E6B] tracking-tight mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-6 h-6 text-[#3B6FE8]" /> Centro de Comunicaciones
                                </h2>
                                <p className="text-sm text-[#7A8DB8] font-medium mb-6">Envía notificaciones de WhatsApp a los padres de los niños registrados.</p>

                                <div className="bg-white rounded-[2rem] border-2 border-[#D6E0FF] shadow-sm overflow-hidden mb-6">
                                    <div className="flex bg-[#F0F4FF] border-b-2 border-[#D6E0FF]">
                                        {canSendMassMessages && (
                                            <button onClick={() => setMessageTab('mass')} className={`flex-1 py-4 font-bold text-sm transition-colors ${messageTab === 'mass' ? 'text-[#3B6FE8] border-b-4 border-[#3B6FE8] bg-white' : 'text-[#7A8DB8] hover:text-[#1B2E6B]'}`}>
                                                📢 Difusión Masiva ({checkedInKids.length})
                                            </button>
                                        )}
                                        <button onClick={() => setMessageTab('individual')} className={`flex-1 py-4 font-bold text-sm transition-colors ${messageTab === 'individual' ? 'text-[#3B6FE8] border-b-4 border-[#3B6FE8] bg-white' : 'text-[#7A8DB8] hover:text-[#1B2E6B]'}`}>
                                            👤 Mensaje Individual
                                        </button>
                                    </div>

                                    <div className="p-5 sm:p-6">
                                        <div className="bg-[#E6FFFE] border border-[#2CD9C5] text-[#00A38D] px-4 py-3 rounded-xl text-xs sm:text-sm font-medium mb-6 flex gap-3">
                                            <Info className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="font-bold mb-1">Plantilla de WhatsApp configurada (enviar_msg_padres1):</p>
                                                <p className="opacity-90 italic">"Bendiciones. De parte de <strong>{`{{Remitente}}`}</strong> queremos notificarte lo siguiente: <strong>{`{{Tu mensaje}}`}</strong>. Quedamos atentos a tu llegada al salón asignado para asistirte. Saludos."</p>
                                            </div>
                                        </div>

                                        {messageTab === 'individual' && (
                                            <div className="mb-6 relative">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A8DB8] mb-2">1. Selecciona al niño o padre</label>

                                                {!selectedKidForMessage ? (
                                                    <>
                                                        <div className="relative">
                                                            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                            <input
                                                                type="text"
                                                                placeholder="Buscar por nombre..."
                                                                className="w-full bg-[#F0F4FF] border-none rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-[#1B2E6B] focus:ring-2 focus:ring-[#3B6FE8] outline-none"
                                                                value={searchQuery}
                                                                onChange={e => setSearchQuery(e.target.value)}
                                                            />
                                                        </div>

                                                        {searchQuery && (
                                                            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border-2 border-[#D6E0FF] rounded-xl shadow-xl z-20">
                                                                {filteredKids.filter(k => isCheckedIn(k.id)).length === 0 ? (
                                                                    <div className="p-4 text-center text-slate-500 font-medium text-sm">No se encontraron niños activos con ese nombre.</div>
                                                                ) : (
                                                                    filteredKids.filter(k => isCheckedIn(k.id)).map(kid => (
                                                                        <button
                                                                            key={kid.id}
                                                                            onClick={() => { setSelectedKidForMessage(kid); setSearchQuery(""); }}
                                                                            className="w-full text-left p-3 hover:bg-[#F0F4FF] border-b border-slate-100 flex items-center justify-between transition-colors"
                                                                        >
                                                                            <div>
                                                                                <div className="font-bold text-[#1B2E6B]">{kid.name}</div>
                                                                                <div className="text-xs text-slate-500">{kid.parentName} · {kid.parentPhone}</div>
                                                                            </div>
                                                                            <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">Activo</div>
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-[#F0F4FF] p-4 rounded-xl border border-[#D6E0FF]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">{selectedKidForMessage.photo || '👤'}</div>
                                                            <div>
                                                                <div className="font-bold text-[#1B2E6B] leading-tight">{selectedKidForMessage.name}</div>
                                                                <div className="text-xs text-[#7A8DB8] mt-0.5">Padre: {selectedKidForMessage.parentName} ({selectedKidForMessage.parentPhone})</div>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setSelectedKidForMessage(null)} className="text-[#3B6FE8] hover:bg-[#D6E0FF] p-2 rounded-lg transition-colors">
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A8DB8] mb-2">{messageTab === 'individual' ? '2. ' : ''}Remitente {`{{1}}`}</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Escuela Bíblica, Ministerio Infantil..."
                                                    value={messageContext}
                                                    onChange={e => setMessageContext(e.target.value)}
                                                    className="w-full bg-[#F0F4FF] border border-transparent focus:border-[#3B6FE8] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1B2E6B] focus:ring-0 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A8DB8] mb-2">Mensaje / Eventualidad {`{{2}}`}</label>
                                                <textarea
                                                    rows={4}
                                                    placeholder="Escribe el mensaje aquí..."
                                                    value={messageBody}
                                                    onChange={e => setMessageBody(e.target.value)}
                                                    className="w-full bg-[#F0F4FF] border border-transparent focus:border-[#3B6FE8] rounded-xl px-4 py-3 text-sm font-medium text-[#1B2E6B] focus:ring-0 outline-none resize-none"
                                                ></textarea>
                                            </div>
                                        </div>

                                        <button
                                            disabled={sendingMessage || !messageBody.trim() || !messageContext.trim() || (messageTab === 'individual' && !selectedKidForMessage) || (messageTab === 'mass' && checkedInKids.length === 0)}
                                            onClick={async () => {
                                                if (!messageBody.trim() || !messageContext.trim()) return;

                                                setSendingMessage(true);
                                                const kidIds = messageTab === 'mass' ? checkedInKids.map(k => k.id) : [selectedKidForMessage.id];

                                                try {
                                                    const res = await fetch('/api/checkin/message', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            kidIds,
                                                            context: messageContext,
                                                            message: messageBody,
                                                            type: messageTab
                                                        })
                                                    });

                                                    const data = await res.json();

                                                    if (data.error) {
                                                        showToast(`Error: ${data.error}`, "error");
                                                    } else {
                                                        showToast(`✅ Mensaje enviado a ${data.sentCount} destinatarios.`, "success");
                                                        setMessageBody("");
                                                        if (messageTab === 'individual') setSelectedKidForMessage(null);
                                                    }
                                                } catch (e) {
                                                    showToast("Error de conexión al enviar.", "error");
                                                } finally {
                                                    setSendingMessage(false);
                                                }
                                            }}
                                            className="w-full mt-6 bg-[#2563EB] hover:bg-[#1e40af] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                                        >
                                            {sendingMessage ? (
                                                <span className="flex items-center gap-2">⏳ Enviando...</span>
                                            ) : (
                                                <span className="flex items-center gap-2"><Send className="w-5 h-5" /> Enviar por WhatsApp</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === VIEWS.TICKET && currentTicket && (() => {
                            // For a family checkin, currentTicket looks like:
                            // { type: "FAMILY", tickets: [ticket1, ticket2], code, qrValue, parentName, checkInTime }
                            const isFamily = currentTicket.type === "FAMILY";
                            const tickets = isFamily ? currentTicket.tickets : [currentTicket];
                            const displayKidCount = tickets.length;
                            const mainLabelName = displayKidCount > 1 ? "Familia " + (currentTicket.parentName.split(" ")[0]) : tickets[0].name;

                            return (
                                <div className="animate-in slide-in-from-right-8 duration-300 pb-32">
                                    <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50 py-2 z-10 print:hidden">
                                        <button onClick={() => setView(VIEWS.HOME)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm text-slate-600 hover:bg-slate-50">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <h2 className="text-lg font-black text-slate-900">Pase Generado</h2>
                                    </div>

                                    {/* Printable Ticket Area */}
                                    <div id="print-ticket" className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200 mb-6 print:m-0 print:p-0 print:w-full print:h-auto print:bg-white print:border-none print:shadow-none print:rounded-none print:block print:overflow-visible">

                                        {/* --- Screen UI (Hidden on Print) --- */}
                                        <div className={`px-4 py-3 text-center relative overflow-hidden print:hidden bg-brand-600`}>
                                            <div className="absolute inset-0 bg-black/10"></div>
                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="text-[10px] font-black tracking-[0.2em] text-white/90 uppercase mb-2">Elim Honduras</div>
                                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-2 border-white mx-auto flex items-center justify-center shadow-sm mb-2 overflow-hidden">
                                                    <img src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blanco-1.png" alt="Elim Logo" className="w-10 h-10 object-contain" />
                                                </div>
                                                <h3 className="text-xl font-black text-white leading-tight">{mainLabelName}</h3>
                                                <p className="text-xs font-bold text-white/90 mt-0.5">{displayKidCount} niño(s) ingresados</p>
                                            </div>
                                        </div>

                                        <div className="p-6 text-center print:hidden">
                                            <div className="flex flex-col items-center gap-4 mb-6">
                                                {/* QR Code */}
                                                <div className="inline-block p-4 bg-white rounded-2xl shadow-inner border-2 border-slate-100">
                                                    <QRCode value={currentTicket.qrValue || tickets[0].qrValue} size={160} level="H" />
                                                </div>

                                                <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Escanea para Check-out</div>

                                                {/* Barcode (Comentado por requerimiento del usuario para acelerar escaneo solo con QR)
                                            <div className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                                                <img
                                                    src={`https://barcodeapi.org/api/128/${currentTicket.code || tickets[0].code}`}
                                                    alt={`Barcode ${currentTicket.code}`}
                                                    className="w-full max-w-[200px] h-auto object-contain mb-2"
                                                />
                                                <div className="text-3xl font-black tracking-[0.2em] text-[#0f172a] font-mono mt-2 whitespace-nowrap">
                                                    {(currentTicket.code || tickets[0].code).split('').join(' ')}
                                                </div>
                                            </div>
                                            */}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-left border-t border-dashed border-slate-200 pt-5">
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Encargado</div>
                                                    <div className="text-sm font-bold text-slate-800 truncate">{currentTicket.parentName || tickets[0].parentName}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hora Entrada</div>
                                                    <div className="text-sm font-bold text-slate-800">{currentTicket.checkInTime || tickets[0].checkInTime}</div>
                                                </div>
                                            </div>

                                            {/* Display names of kids for on-screen confirmation */}
                                            <div className="mt-5 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Niños en este código</div>
                                                <div className="flex flex-col gap-2">
                                                    {tickets.map((t: any) => (
                                                        <div key={t.id} className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                                                            <span>👦 {t.name}</span>
                                                            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">{classrooms.find(c => c.id === t.classroom)?.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- Print UI (Only Visible on Print) --- */}

                                        {/* N Child Labels */}
                                        {tickets.map((t: any) => {
                                            return (
                                                <div key={t.id} className="hidden print:flex flex-col bg-white text-black relative font-sans box-border" style={{ width: '3in', height: '2in', margin: 0, pageBreakAfter: 'always', padding: '2mm' }}>
                                                    {/* Content Row (fills remaining height) */}
                                                    <div className="flex flex-row flex-1 overflow-hidden">
                                                        {/* Left Column */}
                                                        <div className="flex-[6.5] flex flex-col pr-2 border-r-[1.5px] border-black overflow-hidden">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <img src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blanco-1.png" className="w-8 h-8 object-contain shrink-0" style={{ filter: "invert(1) brightness(0)" }} alt="Logo" />
                                                                <span className="font-bold text-[14px] tracking-widest whitespace-nowrap">Elim Honduras</span>
                                                            </div>

                                                            <div className="flex flex-col justify-center flex-1">
                                                                <div className="text-[10px] font-bold tracking-wide leading-none uppercase text-slate-700">INGRESO NIÑO(A)</div>
                                                                <div style={{
                                                                    fontSize: t.name.length > 19 ? '16px' : t.name.length > 14 ? '20px' : '26px',
                                                                    fontWeight: 900,
                                                                    lineHeight: 1.1,
                                                                    marginTop: '2px',
                                                                    marginBottom: '4px',
                                                                    wordBreak: 'break-word',
                                                                    overflowWrap: 'break-word',
                                                                    hyphens: 'auto',
                                                                    maxHeight: '2.6em',
                                                                    overflow: 'hidden',
                                                                    letterSpacing: '-0.02em',
                                                                }}>{t.name}</div>

                                                                <div className="text-[11px] font-semibold leading-tight">
                                                                    {new Date().toLocaleDateString('es-HN')} {t.checkInTime || currentTicket.checkInTime}
                                                                </div>
                                                                <div className="text-[14px] font-black uppercase mt-0.5 leading-tight">
                                                                    NO. CEL: {t.parentPhone?.replace(/^\+504\s*/, '')}
                                                                </div>
                                                                <div className="text-[10px] font-bold mt-1 leading-tight truncate">
                                                                    Padre: {t.parentName}
                                                                </div>
                                                                {t.allergies && t.allergies !== 'Ninguna' && t.allergies.trim() !== '' && (
                                                                    <div style={{
                                                                        fontSize: t.allergies.length > 40 ? '7px' : t.allergies.length > 25 ? '8px' : '9px',
                                                                        fontWeight: 800,
                                                                        textTransform: 'uppercase',
                                                                        lineHeight: 1.3,
                                                                        marginTop: '3px',
                                                                        padding: '1px 4px',
                                                                        background: '#e5e7eb',
                                                                        borderRadius: '3px',
                                                                        wordBreak: 'break-word',
                                                                        overflowWrap: 'break-word',
                                                                        maxHeight: '2.8em',
                                                                        overflow: 'hidden',
                                                                    }}>
                                                                        ⚠ Alergias: {t.allergies}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right Column */}
                                                        <div className="flex-[3.5] flex flex-col items-center justify-center pl-1 overflow-hidden">
                                                            <div className="border-[2px] border-black rounded-[8px] px-2 py-0.5 text-[13px] font-black tracking-widest leading-none mb-2 whitespace-nowrap">
                                                                {t.code}
                                                            </div>
                                                            <QRCode value={t.qrValue} size={62} level="H" />
                                                        </div>
                                                    </div>

                                                    {/* Full-width Footer — spans the entire 3in label */}
                                                    <div className="w-full text-center text-[7px] font-black uppercase tracking-wide whitespace-nowrap border-t border-black/20 mt-1 pt-0.5">
                                                        NO PIERDAS ESTE PASE &middot; REQUERIDO A LA SALIDA
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* 1 Master Parent Label */}
                                        <div className="hidden print:flex flex-row bg-white text-black overflow-hidden relative p-[2mm] font-sans box-border" style={{ width: '3in', height: '2in', margin: 0, pageBreakAfter: 'always' }}>
                                            {/* Left Column */}
                                            <div className="flex-[6.5] flex flex-col justify-between pr-2 border-r-[1.5px] border-black">
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <img src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/elim-logo-blanco-1.png" className="w-6 h-6 object-contain" style={{ filter: "invert(1) brightness(0)" }} alt="Logo" />
                                                    <span className="font-bold text-[12px] tracking-widest whitespace-nowrap">Elim Honduras</span>
                                                </div>

                                                <div className="flex-1 flex flex-col justify-center mt-1">
                                                    <div className="text-[10px] font-bold tracking-wide leading-none uppercase text-slate-700">INGRESO PADRE/TUTOR</div>
                                                    <div className="text-[16px] font-black leading-tight mt-1 mb-1 max-h-10 overflow-hidden tracking-tight uppercase">{currentTicket.parentName || tickets[0].parentName}</div>

                                                    <div className="text-[11px] font-semibold leading-tight">
                                                        {new Date().toLocaleDateString('es-HN')} {currentTicket.checkInTime || tickets[0].checkInTime}
                                                    </div>
                                                    <div className="text-[12px] font-black uppercase mt-0.5 leading-tight">
                                                        NO. CEL: {(currentTicket.parentPhone || tickets[0].parentPhone || "").replace(/^\+504\s*/, '')}
                                                    </div>
                                                    <div className="text-[10px] font-bold mt-1 leading-tight truncate">
                                                        Niños ingresados: {displayKidCount}
                                                    </div>
                                                </div>

                                                <div className="w-full text-center text-[7px] font-black uppercase tracking-wide mb-0 mt-auto whitespace-nowrap">
                                                    NO PIERDAS ESTE PASE &middot; REQUERIDO A LA SALIDA
                                                </div>
                                            </div>
                                            {/* Right Column (Empty for Parent, or minimal) */}
                                            <div className="flex-[3.5] flex flex-col items-center justify-center pl-1 py-1">
                                                <div className="border-[2px] border-black rounded-[8px] px-2 py-0.5 text-[14px] font-black tracking-widest leading-none mb-1 whitespace-nowrap opacity-60">
                                                    {currentTicket.code || tickets[0].code}
                                                </div>
                                                <div className="flex-1 w-full bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-center p-1 text-slate-400 font-bold mt-1">
                                                    PASE<br />PADRES
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pb-8 px-4 print:hidden">
                                        <button onClick={async () => {
                                            if (printMode === 'SERVER') {
                                                try {
                                                    const res = await fetch('/api/checkin/encolar', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ ticketData: currentTicket, impresora: 'TSC TE200' })
                                                    });
                                                    if (res.ok) {
                                                        showToast("Enviado a impresora de Red ✅", "success");
                                                    } else {
                                                        showToast("Error al encolar impresión", "error");
                                                    }
                                                } catch (e) {
                                                    showToast("Error de conexión", "error");
                                                }
                                            } else {
                                                window.print();
                                            }
                                        }} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                                            <Printer className="w-5 h-5" /> Imprimir ({displayKidCount + 1})
                                        </button>
                                        <button onClick={() => setView(VIEWS.HOME)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all">
                                            Nuevo Check-in
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* CLASSROOM DETAIL */}
                        {view === VIEWS.CLASSROOM_DETAIL && selectedClassroom && (() => {
                            const kidsInRoom = classroomKids(selectedClassroom.id);
                            const [bgColor, textColor] = selectedClassroom.color.split(' ');
                            const accentColor = bgColor.replace('bg-', 'bg-').replace('-100', '-500');
                            return (
                                <div className="animate-in slide-in-from-right-4 duration-300 pb-16">
                                    <button onClick={() => setView(VIEWS.CLASSROOMS)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold mb-4">
                                        <ArrowLeft className="w-4 h-4" /> Volver a Salones
                                    </button>

                                    {/* Classroom Header */}
                                    <div className={`rounded-2xl p-5 mb-5 relative overflow-hidden border ${selectedClassroom.color.split(' ')[2]}`} style={{ background: 'white' }}>
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${accentColor}`} />
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedClassroom.name}</h2>
                                                <p className="text-sm text-slate-500 font-medium mt-0.5">{selectedClassroom.ageRange} · {selectedClassroom.teacher}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-3xl font-black ${textColor.replace('-700', '-600')}`}>{kidsInRoom.length}</div>
                                                <div className="text-[10px] font-bold text-slate-400">de {selectedClassroom.capacity} disp.</div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                                            <div className={`h-2 rounded-full transition-all duration-1000 ${accentColor}`} style={{ width: `${Math.min((kidsInRoom.length / selectedClassroom.capacity) * 100, 100)}%` }} />
                                        </div>
                                    </div>

                                    {/* Kids list */}
                                    {kidsInRoom.length === 0 ? (
                                        <div className="text-center py-16 text-slate-400">
                                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">🏫</div>
                                            <p className="font-bold text-slate-500">Ningún niño en este salón ahora</p>
                                            <p className="text-sm mt-1">Los niños aparecen aquí cuando hacen check-in.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                                                {kidsInRoom.length} niño{kidsInRoom.length !== 1 ? 's' : ''} en este salón
                                            </div>
                                            <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
                                                {kidsInRoom.map(kid => (
                                                    <div key={kid.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                                        <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] flex items-center justify-center text-xl shrink-0">
                                                            {kid.photoEmoji || kid.photo || '🧒'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-[#1B2E6B] text-sm leading-tight">{kid.name}</div>
                                                            <div className="text-[11px] text-slate-400 font-medium">
                                                                {kid.age}a · <span className="text-emerald-600 font-semibold">Ingresó {kid.checkInTime}</span> · {kid.parentName}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    setCurrentTicket({ type: 'FAMILY', tickets: [kid], code: kid.code, qrValue: kid.qrValue, parentName: kid.parentName, checkInTime: kid.checkInTime, autoPrint: false });
                                                                    setView(VIEWS.TICKET);
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                                                                title="Reimprimir etiqueta QR"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => {
                                                                setKidsToCheckout([kid]);
                                                                setSelectedKidsForCheckout(new Set([kid.id]));
                                                            }} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all">
                                                                Salida
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
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
            </div>

            {/* Modal de Check-out */}
            {kidsToCheckout.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-red-500 p-6 text-center text-white relative">
                            <button onClick={() => { setKidsToCheckout([]); setSelectedKidsForCheckout(new Set()); }} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl shadow-inner border border-white/20">
                                {kidsToCheckout.length === 1 ? (kidsToCheckout[0].photoEmoji || kidsToCheckout[0].photo || "🧒") : "👨‍👩‍👧‍👦"}
                            </div>
                            <h3 className="text-xl font-black leading-tight tracking-tight">Confirmar Salida</h3>
                            <p className="text-sm font-medium text-red-100 mt-1 flex items-center justify-center gap-1">
                                {kidsToCheckout.length === 1 ? `¿Entregar a ${kidsToCheckout[0].name}?` : `Hermanos encontrados (${kidsToCheckout.length})`}
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Padre / Tutor</span>
                                    <span className="text-sm font-black text-slate-800 flex items-center gap-1">👤 {kidsToCheckout[0].parentName}</span>
                                </div>
                                <div className="w-full h-px bg-slate-200 border-dashed border-b"></div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Elige a quién dar salida:</span>
                                    {kidsToCheckout.map(kid => {
                                        const isSelected = selectedKidsForCheckout.has(kid.id);
                                        return (
                                            <button key={kid.id} onClick={() => {
                                                const newSet = new Set(selectedKidsForCheckout);
                                                if (newSet.has(kid.id)) newSet.delete(kid.id);
                                                else newSet.add(kid.id);
                                                setSelectedKidsForCheckout(newSet);
                                            }} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all border-b-4 active:border-b active:translate-y-[3px] text-left ${isSelected ? 'bg-red-50/50 border-red-200 shadow-sm' : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50'}`}>
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-300'}`}>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0 pointer-events-none">
                                                    <div className="text-sm font-bold text-slate-800 truncate">{kid.name}</div>
                                                    <div className="text-[10px] uppercase font-semibold text-slate-500">{classrooms.find(c => c.id === kid.classroom)?.name || "N/A"}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setKidsToCheckout([]); setSelectedKidsForCheckout(new Set()); }} disabled={isCheckingOut} className="px-4 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shadow-sm">
                                    Cancelar
                                </button>
                                <button onClick={handleCheckOut} disabled={isCheckingOut || selectedKidsForCheckout.size === 0} className="px-4 py-3.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-md">
                                    {isCheckingOut ? "Entregando..." : `Entregar (${selectedKidsForCheckout.size})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Removed redundant Tailwind Print Styles Injection */}
        </div>
    );
}
