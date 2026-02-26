"use client";

import { useState, useEffect } from "react";
import { Search, Plus, UserPlus, FileText, CheckCircle2, XCircle, Stethoscope, ArrowLeft, HeartPulse, History, Activity, AlertCircle } from "lucide-react";
import { getMedicalData, addPatient, addMedicalRecord } from "@/app/(dashboard)/medico/actions";

const VIEWS = { HOME: "home", ADD_PATIENT: "add_patient", PATIENT_DETAIL: "patient_detail" };

export function MedicalApp({ currentUser }: { currentUser: any }) {
    const [view, setView] = useState(VIEWS.HOME);
    const [searchQuery, setSearchQuery] = useState("");
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);

    // New patient form
    const [newPatient, setNewPatient] = useState({ firstName: "", lastName: "", age: "", bloodType: "", allergies: "", phone: "" });
    const [savingPatient, setSavingPatient] = useState(false);

    // Checkup form
    const [newCheckup, setNewCheckup] = useState({ reason: "", notes: "", vitals: { temp: "", pressure: "" } });
    const [savingCheckup, setSavingCheckup] = useState(false);

    const loadData = async () => {
        const data = await getMedicalData();
        if (data.patients) setPatients(data.patients);
    };

    useEffect(() => { loadData() }, []);

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const filteredPatients = patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddPatient = async () => {
        if (!newPatient.firstName || !newPatient.lastName) return;
        setSavingPatient(true);
        const patientData = {
            firstName: newPatient.firstName,
            lastName: newPatient.lastName,
            age: parseInt(newPatient.age) || 0,
            bloodType: newPatient.bloodType,
            allergies: newPatient.allergies,
            phone: newPatient.phone,
        };
        const res = await addPatient(patientData as any);
        if (res.error) {
            showToast(res.error, "error");
            setSavingPatient(false);
            return;
        }

        const freshPatient = { ...res.patient, status: "PENDING", lastVisit: "Nunca" };
        setPatients([freshPatient, ...patients]);
        setSelectedPatient(freshPatient);
        setView(VIEWS.PATIENT_DETAIL);
        showToast("✅ Paciente registrado exitosamente");
        setNewPatient({ firstName: "", lastName: "", age: "", bloodType: "", allergies: "", phone: "" });
        setSavingPatient(false);
    };

    const handleCreateCheckup = async () => {
        if (!newCheckup.reason) return;
        setSavingCheckup(true);

        const res = await addMedicalRecord(selectedPatient.id, {
            reason: newCheckup.reason,
            notes: newCheckup.notes,
            bloodPressure: newCheckup.vitals.pressure,
            temperature: newCheckup.vitals.temp
        });

        if (res.error) {
            showToast(res.error, "error");
            setSavingCheckup(false);
            return;
        }

        const updatedPatient = { ...selectedPatient, lastVisit: "Hace un momento", status: "COMPLETED" };
        setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updatedPatient : p));
        setSelectedPatient(updatedPatient);
        setNewCheckup({ reason: "", notes: "", vitals: { temp: "", pressure: "" } });
        showToast("✅ Atención médica guardada en el historial", "success");
        setSavingCheckup(false);
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center pb-24 font-sans text-slate-800">

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border border-slate-200 bg-white text-slate-800 backdrop-blur-md">
                        {toast.type === 'success' ? <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                            : toast.type === 'info' ? <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5 text-blue-500" /></div>
                                : toast.type === 'warning' ? <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5 text-amber-500" /></div>
                                    : <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5 text-red-500" /></div>}
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-lg bg-white min-h-[calc(100vh-4rem)] shadow-xl relative overflow-hidden">

                {/* HEADER */}
                <div className="bg-slate-900 border-b-4 border-rose-500 text-white p-6 rounded-b-[2.5rem] relative shrink-0 z-10 shadow-lg">
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-b-[2.5rem] pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600 rounded-full blur-3xl opacity-20"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">✝ Módulo Clínico</div>
                                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                    <HeartPulse className="w-6 h-6 text-rose-500" /> Asistencia Médica
                                </h1>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-rose-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    Clínica Activa
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-5">
                            {[
                                { label: "Atendidos Hoy", val: 12, icon: <Stethoscope className="w-4 h-4 text-emerald-400" /> },
                                { label: "En Espera", val: 3, icon: <Activity className="w-4 h-4 text-amber-400" /> },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2">
                                    <span>{s.icon}</span>
                                    <span className="text-lg font-black text-rose-300">{s.val}</span>
                                    <span className="text-[10px] font-semibold text-slate-300">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── VIEWS ── */}
                <div className="p-5 pb-24 relative z-0 min-h-[500px]">

                    {/* HOME: Patient Search & List */}
                    {view === VIEWS.HOME && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

                            <div className="flex gap-2 mb-6 sticky top-0 bg-white/90 backdrop-blur-md py-2 z-10 -mx-5 px-5">
                                <div className="relative flex-1">
                                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                                        placeholder="Buscar paciente por nombre..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => setView(VIEWS.ADD_PATIENT)}
                                    className="w-11 h-11 shrink-0 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center">
                                    <UserPlus className="w-5 h-5" />
                                </button>
                            </div>

                            {!searchQuery && (
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">
                                    Pacientes Recientes
                                </h2>
                            )}

                            <div className="space-y-3">
                                {filteredPatients.map(patient => (
                                    <button
                                        key={patient.id}
                                        onClick={() => { setSelectedPatient(patient); setView(VIEWS.PATIENT_DETAIL); }}
                                        className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-rose-300 hover:shadow-md transition-all group">
                                        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 border-2 ${patient.status === 'PENDING' ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
                                            <div className="text-xs font-black text-slate-700 leading-none">{patient.age}</div>
                                            <div className="text-[8px] uppercase font-bold text-slate-400 leading-none mt-0.5">años</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-900 text-base">{patient.firstName} {patient.lastName}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <History className="w-3 h-3" /> Última visita: <span className="font-semibold">{patient.lastVisit}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-slate-300 group-hover:text-rose-500 transition-colors">
                                            <ArrowLeft className="w-5 h-5 rotate-180" />
                                        </div>
                                    </button>
                                ))}

                                {filteredPatients.length === 0 && (
                                    <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mt-6">
                                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                                        <h3 className="text-slate-900 font-bold mb-1">Ningún paciente encontrado</h3>
                                        <p className="text-slate-500 text-xs mb-4">No hay resultados para "{searchQuery}"</p>
                                        <button onClick={() => { setView(VIEWS.ADD_PATIENT); setNewPatient(p => ({ ...p, firstName: searchQuery })); }} className="text-rose-600 font-bold text-sm bg-rose-50 px-4 py-2 rounded-lg">
                                            + Registrar como nuevo paciente
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ADD PATIENT FORM */}
                    {view === VIEWS.ADD_PATIENT && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setView(VIEWS.HOME)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold mb-6">
                                <ArrowLeft className="w-4 h-4" /> Volver
                            </button>

                            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-rose-500" /> Registrar Paciente
                            </h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Nombres *</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                            value={newPatient.firstName} onChange={e => setNewPatient({ ...newPatient, firstName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Apellidos *</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                            value={newPatient.lastName} onChange={e => setNewPatient({ ...newPatient, lastName: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Edad</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                            type="number" value={newPatient.age} onChange={e => setNewPatient({ ...newPatient, age: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tipo Sangre</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                            value={newPatient.bloodType} onChange={e => setNewPatient({ ...newPatient, bloodType: e.target.value })}>
                                            <option value="">Desconocido</option>
                                            <option value="O+">O+</option><option value="O-">O-</option>
                                            <option value="A+">A+</option><option value="A-">A-</option>
                                            <option value="B+">B+</option><option value="B-">B-</option>
                                            <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Teléfono</label>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500"
                                        type="tel" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Alergias / Crónicas</label>
                                    <textarea className="w-full bg-rose-50/30 border border-rose-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 resize-none h-20 outline-none"
                                        placeholder="Detalles médicos importantes..." value={newPatient.allergies} onChange={e => setNewPatient({ ...newPatient, allergies: e.target.value })} />
                                </div>

                                <button onClick={handleAddPatient} disabled={!newPatient.firstName || !newPatient.lastName || savingPatient}
                                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-4">
                                    {savingPatient ? "Guardando..." : "Crear Expediente"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PATIENT DETAIL / ADD RECORD */}
                    {view === VIEWS.PATIENT_DETAIL && selectedPatient && (
                        <div className="animate-in slide-in-from-bottom-8 duration-300 pb-10">
                            <button onClick={() => setView(VIEWS.HOME)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold mb-4">
                                <ArrowLeft className="w-4 h-4" /> Directorio
                            </button>

                            {/* ID Card */}
                            <div className="bg-slate-900 text-white rounded-3xl p-5 mb-6 shadow-lg relative overflow-hidden border border-slate-800">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-black">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                                        <p className="text-slate-400 text-sm mt-1">{selectedPatient.age} años · Expediente #{selectedPatient.id}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-rose-400 font-black border border-white/20">
                                        {selectedPatient.bloodType || '?'}
                                    </div>
                                </div>

                                {(selectedPatient.allergies && selectedPatient.allergies !== "Ninguna") && (
                                    <div className="mt-4 bg-rose-500/20 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2 backdrop-blur-sm">
                                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Alergias Registradas</div>
                                            <div className="text-sm text-white/90 font-medium">{selectedPatient.allergies}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Log Checkup */}
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                                Registrar Atención Médica
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Presión Arterial</label>
                                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                            placeholder="120/80" value={newCheckup.vitals.pressure} onChange={e => setNewCheckup({ ...newCheckup, vitals: { ...newCheckup.vitals, pressure: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Temperatura</label>
                                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                            placeholder="37.5 °C" value={newCheckup.vitals.temp} onChange={e => setNewCheckup({ ...newCheckup, vitals: { ...newCheckup.vitals, temp: e.target.value } })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Motivo de Consulta *</label>
                                    <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-medium"
                                        placeholder="Ej. Dolor de cabeza, Mareos..." value={newCheckup.reason} onChange={e => setNewCheckup({ ...newCheckup, reason: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Diagnóstico / Receta</label>
                                    <textarea className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 resize-none h-28 outline-none"
                                        placeholder="Instrucciones médicas o medicamentos otorgados..." value={newCheckup.notes} onChange={e => setNewCheckup({ ...newCheckup, notes: e.target.value })} />
                                </div>

                                <button onClick={handleCreateCheckup} disabled={!newCheckup.reason || savingCheckup}
                                    className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-4 flex justify-center items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> {savingCheckup ? "Registrando..." : "Guardar Atención"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* REAL BOTTOM NAV (Fixed outside the card for mobile app feel) */}
            <nav className="fixed bottom-0 w-full max-w-lg bg-white border-t border-slate-200 pb-safe pt-2 px-2 flex justify-around z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
                {[
                    { icon: <Activity className="w-6 h-6" />, label: "Directorio", v: VIEWS.HOME },
                    { icon: <UserPlus className="w-6 h-6" />, label: "Registrar", v: VIEWS.ADD_PATIENT },
                ].map(item => {
                    const isActive = view === item.v || (view === VIEWS.PATIENT_DETAIL && item.v === VIEWS.HOME);
                    return (
                        <button key={item.v} onClick={() => setView(item.v)}
                            className={`flex flex-col items-center gap-1 p-2 min-w-[80px] rounded-xl transition-colors ${isActive ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}>
                            <div className={`${isActive ? 'scale-110 drop-shadow-sm' : ''} transition-transform`}>{item.icon}</div>
                            <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

        </div>
    );
}
