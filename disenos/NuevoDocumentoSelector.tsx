"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoDocumento = "cotizacion" | "proforma" | "factura_oficial";

interface DocumentoConfig {
  id: TipoDocumento;
  titulo: string;
  descripcion: string;
  badge: string;
  prefijo: string;
  color: {
    badge_bg: string;
    badge_text: string;
    icon_bg: string;
    icon_color: string;
    border_selected: string;
    check_bg: string;
  };
  icon: React.ReactNode;
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

const IconoCotizacion = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path d="M9 12h6M9 16h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconoProforma = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path d="M12 10v4m0 0l-2-2m2 2l2-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconoFactura = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path d="M9 12h6M9 16h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="18" cy="18" r="3" fill={color} />
    <path d="M17 18l.8.8L19.5 17" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconoCheck = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path d="M1 4.5l3 3 6-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Configuración de documentos ─────────────────────────────────────────────

const DOCUMENTOS: DocumentoConfig[] = [
  {
    id: "cotizacion",
    titulo: "Cotización",
    descripcion: "Propuesta de precios para el cliente. No genera obligación de pago ni registro fiscal.",
    badge: "No vinculante",
    prefijo: "COT",
    color: {
      badge_bg: "#EFF6FF",
      badge_text: "#1D4ED8",
      icon_bg: "#EFF6FF",
      icon_color: "#2563EB",
      border_selected: "#2563EB",
      check_bg: "#2563EB",
    },
    icon: <IconoCotizacion color="#2563EB" />,
  },
  {
    id: "proforma",
    titulo: "Pro Forma",
    descripcion: "Documento previo a la factura oficial. Útil para trámites aduaneros, bancarios o de crédito.",
    badge: "Pre-factura",
    prefijo: "PF",
    color: {
      badge_bg: "#F5F3FF",
      badge_text: "#6D28D9",
      icon_bg: "#F5F3FF",
      icon_color: "#7C3AED",
      border_selected: "#7C3AED",
      check_bg: "#7C3AED",
    },
    icon: <IconoProforma color="#7C3AED" />,
  },
  {
    id: "factura_oficial",
    titulo: "Factura Oficial",
    descripcion: "Documento fiscal con validez tributaria ante el SAR. Genera obligación formal de pago.",
    badge: "Fiscal",
    prefijo: "FAC",
    color: {
      badge_bg: "#F0FDF4",
      badge_text: "#166534",
      icon_bg: "#F0FDF4",
      icon_color: "#16A34A",
      border_selected: "#16A34A",
      check_bg: "#16A34A",
    },
    icon: <IconoFactura color="#16A34A" />,
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────

interface NuevoDocumentoSelectorProps {
  /**
   * Callback cuando el usuario confirma la creación.
   * Recibe el tipo seleccionado. El componente padre debe llamar
   * al endpoint POST /api/documentos y redirigir.
   */
  onCrear?: (tipo: TipoDocumento) => Promise<void>;
  /** Si se omite onCrear, el componente usará next/navigation para redirigir */
  redirectBasePath?: string;
}

export default function NuevoDocumentoSelector({
  onCrear,
  redirectBasePath = "/facturas/nuevo",
}: NuevoDocumentoSelectorProps) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState<TipoDocumento | null>(null);
  const [cargando, setCargando] = useState(false);

  const docSeleccionado = DOCUMENTOS.find((d) => d.id === seleccionado);

  const handleCrear = async () => {
    if (!seleccionado) return;
    setCargando(true);
    try {
      if (onCrear) {
        await onCrear(seleccionado);
      } else {
        router.push(`${redirectBasePath}?tipo=${seleccionado}`);
      }
    } catch (error) {
      console.error("Error al crear documento:", error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* ── Encabezado ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            {/* Ícono del módulo — igual al estilo de los otros módulos del sistema */}
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Nuevo Documento
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">
            Selecciona el tipo de documento que deseas crear
          </p>
        </div>

        {/* ── Cards de selección ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {DOCUMENTOS.map((doc) => {
            const isSelected = seleccionado === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setSeleccionado(doc.id)}
                className={[
                  "relative text-left rounded-xl p-5 transition-all duration-150 outline-none",
                  "bg-white cursor-pointer",
                  isSelected
                    ? "shadow-sm ring-2"
                    : "border border-gray-200 hover:border-gray-300 hover:shadow-sm",
                ].join(" ")}
                style={
                  isSelected
                    ? { ringColor: doc.color.border_selected, borderColor: doc.color.border_selected, boxShadow: `0 0 0 2px ${doc.color.border_selected}` }
                    : {}
                }
                aria-pressed={isSelected}
                aria-label={`Seleccionar ${doc.titulo}`}
              >
                {/* Check de selección */}
                {isSelected && (
                  <span
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: doc.color.check_bg }}
                  >
                    <IconoCheck />
                  </span>
                )}

                {/* Ícono */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: doc.color.icon_bg }}
                >
                  {doc.icon}
                </div>

                {/* Badge */}
                <span
                  className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-md mb-2"
                  style={{
                    backgroundColor: doc.color.badge_bg,
                    color: doc.color.badge_text,
                  }}
                >
                  {doc.badge}
                </span>

                {/* Título */}
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                  {doc.titulo}
                </h2>

                {/* Descripción */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {doc.descripcion}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Info contextual ── */}
        <div
          className={[
            "rounded-lg px-4 py-3 mb-4 text-sm transition-all duration-200",
            seleccionado
              ? "bg-blue-50 border-l-4 border-blue-500 text-blue-800"
              : "bg-gray-100 text-gray-400",
          ].join(" ")}
          style={
            seleccionado && docSeleccionado
              ? {
                  backgroundColor: docSeleccionado.color.badge_bg,
                  borderLeftColor: docSeleccionado.color.border_selected,
                  color: docSeleccionado.color.badge_text,
                }
              : {}
          }
        >
          {seleccionado && docSeleccionado ? (
            <span>
              Se creará la{" "}
              <strong>
                {docSeleccionado.titulo} #{" "}
                {docSeleccionado.prefijo}-{new Date().getFullYear()}-XXXXX
              </strong>
              . El correlativo quedará reservado desde este momento.
              {docSeleccionado.id === "factura_oficial" &&
                " Este documento tiene validez fiscal ante el SAR."}
            </span>
          ) : (
            "Selecciona un tipo de documento para ver más detalles."
          )}
        </div>

        {/* ── Botón crear ── */}
        <button
          onClick={handleCrear}
          disabled={!seleccionado || cargando}
          className={[
            "w-full py-3 px-6 rounded-lg text-sm font-semibold text-white",
            "transition-all duration-150 flex items-center justify-center gap-2",
            seleccionado && !cargando
              ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer shadow-sm"
              : "bg-gray-200 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          {cargando ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Creando documento...
            </>
          ) : seleccionado && docSeleccionado ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Crear {docSeleccionado.titulo}
            </>
          ) : (
            "Crear documento"
          )}
        </button>

        {/* ── Link cancelar ── */}
        <div className="text-center mt-3">
          <button
            onClick={() => router.back()}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}