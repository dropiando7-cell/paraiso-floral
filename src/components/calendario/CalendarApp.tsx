"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Clock, Calendar as CalendarIcon, MoreVertical } from "lucide-react";
import { createTask } from "@/app/(dashboard)/calendario/actions";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    googleEventId: string | null;
}

export function CalendarApp({ integration, initialTasks }: { integration: any, initialTasks: any[] }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Render hours for the Daily view
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        setIsCreating(true);
        const res = await createTask({ title: newTaskTitle });
        if (res.success && res.task) {
            setTasks([res.task, ...tasks]);
            setNewTaskTitle("");
        }
        setIsCreating(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full px-2 pb-6">
            {/* Left: Calendar View (Mi Día) */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Mi Día - {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                            <p className="text-xs text-slate-500">{integration.googleEmail}</p>
                        </div>
                    </div>
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {/* Mock events for visual demonstration since live Google Fetch isn't doing the payload yet */}
                    <div className="absolute top-[120px] left-[60px] right-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-lg p-3 shadow-sm z-10" style={{ height: '90px' }}>
                        <p className="font-bold text-indigo-900 text-sm">🕰️ Consejería Familiar</p>
                        <p className="text-xs text-indigo-600 font-medium">9:00 AM - 10:30 AM</p>
                    </div>

                    <div className="absolute top-[360px] left-[60px] right-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-3 shadow-sm z-10" style={{ height: '60px' }}>
                        <p className="font-bold text-emerald-900 text-sm">📊 Reunión de Liderazgo</p>
                        <p className="text-xs text-emerald-600 font-medium">1:00 PM - 2:00 PM</p>
                    </div>

                    {hours.map(hour => (
                        <div key={hour} className="flex border-b border-slate-100 min-h-[60px] relative group hover:bg-slate-50/50 transition-colors">
                            <div className="w-16 flex-shrink-0 text-right pr-4 py-2">
                                <span className="text-xs font-medium text-slate-400">
                                    {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                </span>
                            </div>
                            <div className="flex-1 border-l border-slate-100 relative">
                                {/* Horizontal grid line */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Tasks Backlog */}
            <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        Backlog de Tareas
                    </h2>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <form onSubmit={handleCreateTask} className="relative">
                        <input
                            type="text"
                            placeholder="Añadir nueva tarea..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            disabled={isCreating}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!newTaskTitle.trim() || isCreating}
                            className="absolute right-2 top-2 p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {tasks.length === 0 ? (
                        <div className="text-center py-10">
                            <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium text-sm">No hay tareas pendientes</p>
                            <p className="text-slate-400 text-xs mt-1">¡Estás al día!</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div
                                key={task.id}
                                draggable
                                className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-move group relative"
                            >
                                <div className="absolute left-0 top-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-400 rounded-l-2xl transition-colors"></div>
                                <div className="pl-2 flex gap-3 items-start">
                                    <div className="mt-0.5">
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500 cursor-pointer transition-colors"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                                            {task.title}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${task.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                                                task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                                            </span>
                                            {task.googleEventId && (
                                                <span className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                                                    <Clock className="w-3 h-3" /> Agendada
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">💡 Arrastra una tarea al calendario para bloquear tiempo.</p>
                </div>
            </div>
        </div>
    );
}
