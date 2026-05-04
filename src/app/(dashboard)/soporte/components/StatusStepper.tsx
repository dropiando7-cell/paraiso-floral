import React from 'react';
import { Inbox, CheckCircle2, Receipt, SearchCheck, Wrench } from 'lucide-react';

const STATE_MAP: Record<string, number> = {
  'RECIBIDO': 0,
  'EN_DIAGNOSTICO': 1,
  'ESPERANDO_APROBACION': 2,
  'EN_REPARACION': 3,
  'LISTO_ENTREGA': 4,
};

type StatusStepperProps = {
  estadoActual: string;
  ordenId: string;
  equipoInfo: string;
};

export default function StatusStepper({ estadoActual, ordenId, equipoInfo }: StatusStepperProps) {
  const currentStep = STATE_MAP[estadoActual] ?? 0;

  const steps = [
    { id: 0, key: "recepcion",    label: "Recepción",    sublabel: "Ingreso del equipo",   icon: Inbox },
    { id: 1, key: "diagnostico",  label: "Diagnóstico",  sublabel: "Evaluación técnica",   icon: SearchCheck },
    { id: 2, key: "presupuesto",  label: "Presupuesto",  sublabel: "Aprobación del costo", icon: Receipt },
    { id: 3, key: "reparacion",   label: "Reparación",   sublabel: "Trabajo en progreso",  icon: Wrench },
    { id: 4, key: "listo",        label: "Listo",        sublabel: "Entrega al cliente",   icon: CheckCircle2 },
  ];

  const getStepState = (stepId: number) => {
    if (stepId < currentStep) return "done";
    if (stepId === currentStep) return "active";
    return "pending";
  };

  const stateStyles = {
    done:    { bg: "bg-indigo-600", border: "border-indigo-600", iconColor: "text-white", labelColor: "text-slate-900", subColor: "text-slate-500" },
    active:  { bg: "bg-white",      border: "border-indigo-600", iconColor: "text-indigo-600", labelColor: "text-indigo-600", subColor: "text-indigo-600" },
    pending: { bg: "bg-white",      border: "border-slate-300", iconColor: "text-slate-400", labelColor: "text-slate-400", subColor: "text-slate-300" },
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),_0_1px_2px_rgba(0,0,0,0.04)] mb-5">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="m-0 text-[15px] font-bold text-slate-900 tracking-tight">Estado del Servicio</h3>
          <p className="mt-0.5 mb-0 text-xs text-slate-500 font-medium">
            Orden #{ordenId} · {equipoInfo}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          currentStep === 4 ? "bg-green-100 text-green-700" : "bg-indigo-50 text-indigo-700"
        }`}>
          {currentStep === 4 ? "✓ Completado" : `Paso ${currentStep + 1} de ${steps.length}`}
        </div>
      </div>

      {/* Stepper Grid Layout */}
      <div className="flex items-start bg-transparent relative">
        {/* Connectors Background (absolute) */}
        <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 z-0" />
        <div 
          className="absolute top-5 left-10 h-0.5 bg-indigo-600 z-0 transition-all duration-300"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%`, maxWidth: `calc(100% - 80px)` }}
        />
        
        {steps.map((step, idx) => {
          const state = getStepState(step.id);
          const s = stateStyles[state];
          const IconInfo = step.icon;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
              <div className="relative flex items-center justify-center w-10 h-10">
                {state === 'active' && (
                  <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75"></div>
                )}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${s.bg} ${s.border} ${state === 'active' ? 'shadow-[0_0_0_4px_rgba(79,70,229,0.15)] ring-4 ring-indigo-50/50 scale-110' : ''}`}>
                  <IconInfo className={`w-4 h-4 ${s.iconColor}`} />
                </div>
              </div>
              <div className="text-center mt-3 max-w-[90px]">
                <div className={`text-xs ${state === 'pending' ? 'font-medium' : 'font-bold'} ${s.labelColor} leading-tight`}>
                  {step.label}
                </div>
                <div className={`text-[10px] ${s.subColor} mt-1 leading-tight`}>
                  {step.sublabel}
                </div>
                {state === "done" && (
                  <div className="text-[10px] text-green-600 mt-1.5 font-bold">
                    ✓ Completado
                  </div>
                )}
                {state === "active" && (
                  <div className="text-[10px] text-indigo-600 mt-1.5 font-bold animate-pulse">
                    ● En curso
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
