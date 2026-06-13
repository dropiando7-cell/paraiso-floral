"use client";

import React, { useState } from "react";
import { 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    Activity, 
    Sparkles, 
    Monitor, 
    Award, 
    Search, 
    FileText, 
    Play, 
    ArrowLeft, 
    Code2, 
    Smartphone, 
    Zap, 
    BarChart3,
    CheckSquare,
    Database,
    Users,
    MessageSquare,
    Eye,
    ChevronRight,
    GitCommit,
    Sparkle,
    LayoutGrid,
    List
} from "lucide-react";

interface ModuleData {
    id: string;
    nombre: string;
    progreso: number;
    estado: "OPERATIVO" | "OPTIMIZACION" | "DESARROLLO";
    colorClass: string;
    usabilidad: number; // UX Star score out of 5
    adoption: "Alta" | "Media" | "Baja";
    etapa: 1 | 2 | 3;
    categoria: "Core ERP" | "Inventario y Ventas" | "Administración";
    descripcion: string;
    hitos: string[];
    tecnologia: string[];
    pendientes: string[];
}

const erpModules: ModuleData[] = [
    // --- ETAPA 1: Propuesta Inicial ---
    {
        id: "inventario",
        nombre: "Control de Inventario",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 1,
        categoria: "Inventario y Ventas",
        descripcion: "Gestión centralizada del stock de productos y equipos, entradas/compras, salidas/descargas por uso, y un Kardex histórico de movimientos de inventario.",
        hitos: [
            "Control estricto de SKUs únicos y ubicaciones físicas/sucursales",
            "Kardex dinámico con tracking de cantidades y motivos de movimientos",
            "Alertas automáticas de stock mínimo y desabastecimiento",
            "Integración de stock con facturación POS y repuestos de soporte"
        ],
        tecnologia: ["Prisma Transaction Isolation", "PostgreSQL Indexes", "CSV Parser (Migración)", "Lucide Icons"],
        pendientes: []
    },
    {
        id: "soporte",
        nombre: "Mantenimiento y Reparaciones",
        progreso: 90,
        estado: "OPTIMIZACION",
        colorClass: "from-blue-500 to-brand-600",
        usabilidad: 4,
        adoption: "Alta",
        etapa: 1,
        categoria: "Core ERP",
        descripcion: "Control de órdenes de trabajo para reparación de equipos médicos y refrigeración comercial. Incluye historial clínico del aparato, diagnóstico técnico y carga de repuestos.",
        hitos: [
            "Registro de entrada con código de seguridad único para clientes",
            "Carga de fotos del estado inicial del aparato en la nube",
            "Matriz de asignación de técnicos con notificaciones automatizadas",
            "Vinculación y consumo automático de repuestos desde inventario"
        ],
        tecnologia: ["Cloudflare R2 Storage", "React Image Upload", "WhatsApp API Integration"],
        pendientes: [
            "Firma electrónica de conformidad al entregar el equipo reparado",
            "Optimizar la impresión térmica del comprobante de ingreso"
        ]
    },
    {
        id: "rentas",
        nombre: "Rentas de Equipos",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 1,
        categoria: "Core ERP",
        descripcion: "Alquiler mensual y diario de equipos médicos con control automático de depósitos en garantía, verificación de estado inicial/final de activos y firma táctil digital del cliente.",
        hitos: [
            "Esquema de base de datos para Rentas y Pagos",
            "Firma digital del cliente integrada y guardada como base64",
            "Gestión de depósito en garantía con devolución contable",
            "Carga de fotos de evidencia antes y después del alquiler",
            "Vinculación de contratos directamente con clientes en el directorio"
        ],
        tecnologia: ["Next.js", "Prisma ORM", "Supabase Storage (R2)", "Firma HTML5 Canvas"],
        pendientes: []
    },
    {
        id: "facturacion",
        nombre: "Cotizaciones y Facturación (Ventas)",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 1,
        categoria: "Inventario y Ventas",
        descripcion: "Emisión de facturas computarizadas autorizadas por la SAR con rangos de facturación, códigos CAI, fechas límites de emisión e impresión en ticket o PDF.",
        hitos: [
            "Integración de parámetros CAI configurables por sucursal",
            "Conversión instantánea de Cotización a Factura con un clic",
            "Manejo de totales gravados, exentos y exonerados según regulaciones",
            "Flujo seguro de anulación de facturas con reabastecimiento automático de stock"
        ],
        tecnologia: ["SAR CAI Validation", "React PDF Renderer", "Buscador de Clientes en Tiempo Real", "Prisma Database Locks"],
        pendientes: []
    },
    {
        id: "contactos",
        nombre: "Directorio de Contactos (Ventas)",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 2,
        categoria: "Inventario y Ventas",
        descripcion: "Directorio unificado de clientes, proveedores, médicos referidores y personal técnico, con historiales de transacciones integrados por contacto.",
        hitos: [
            "Campos avanzados de RTN, teléfonos múltiples y correos electrónicos",
            "Vinculación automática con su historial de facturas y órdenes de trabajo",
            "Búsqueda instantánea con indexación en base de datos PostgreSQL",
            "Gestión de notas internas por cliente para soporte técnico"
        ],
        tecnologia: ["PostgreSQL Search Indexes", "React Memoization", "Next.js Route Queries"],
        pendientes: []
    },
    {
        id: "ordenes-entrega",
        nombre: "Órdenes de Entrega (Ventas)",
        progreso: 90,
        estado: "OPTIMIZACION",
        colorClass: "from-blue-500 to-brand-600",
        usabilidad: 4,
        adoption: "Media",
        etapa: 2,
        categoria: "Inventario y Ventas",
        descripcion: "Control de entrega física de mercadería y equipos facturados. Captura de evidencia fotográfica del empaque, sello de salida de bodega y firma del transportador.",
        hitos: [
            "Generación automática al concretar facturas en el POS",
            "Soporte para subir múltiples fotos de los equipos listos para despacho",
            "Control de fecha/hora exacta de salida de mercadería",
            "Firma digital del despachador y transportista"
        ],
        tecnologia: ["R2 Storage", "HTML Signature Canvas", "Prisma One-to-One Relations"],
        pendientes: [
            "Notificación SMS/WhatsApp automática al cliente cuando va en ruta",
            "Configurar mapa de rutas óptimas"
        ]
    },
    {
        id: "cierre-caja",
        nombre: "Cierre de Caja (Ventas)",
        progreso: 95,
        estado: "OPTIMIZACION",
        colorClass: "from-blue-500 to-brand-600",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 2,
        categoria: "Inventario y Ventas",
        descripcion: "Módulo de cortes de caja diario por turnos, arqueo de efectivo real, reporte de montos recaudados en tarjetas/transferencias y cálculo automático de diferencias.",
        hitos: [
            "Sesiones de caja por usuario para aislar responsabilidades",
            "Arqueo físico guiado de billetes y monedas",
            "Cálculo de diferencia automático contra balance de facturas del sistema",
            "Reporte de egresos e ingresos extraordinarios justificados del turno"
        ],
        tecnologia: ["React State", "Prisma Relations", "SAR Print Template"],
        pendientes: [
            "Filtro de auditoría consolidada por rango de fechas para contabilidad",
            "Exportación a Excel / CSV detallada del arqueo de billetes"
        ]
    },
    {
        id: "gestion-web",
        nombre: "Página Web / Tienda",
        progreso: 60,
        estado: "DESARROLLO",
        colorClass: "from-purple-500 to-indigo-500",
        usabilidad: 4,
        adoption: "Baja",
        etapa: 1,
        categoria: "Administración",
        descripcion: "Sincronización de productos locales con el catálogo de productos expuestos en la tienda web corporativa de Bioelectrónica para prospectos web.",
        hitos: [
            "Base de datos de tráfico web y prospectos (leads) operativa",
            "Formulario de contacto sincronizado directamente con base de datos del ERP",
            "Flags en inventario para marcar productos como 'Visibles en Web'"
        ],
        tecnologia: ["Middleware de Tráfico", "Edge IP Geolocation", "Prisma Batch Updates"],
        pendientes: [
            "Integrar pasarela de pago para cotizaciones web",
            "Maquetación del catálogo público interactivo en el dominio principal"
        ]
    },

    // --- ETAPA 2: Módulos Adicionales de Valor Agregado ---
    {
        id: "proyectos",
        nombre: "Proyectos & Tareas",
        progreso: 95,
        estado: "OPTIMIZACION",
        colorClass: "from-blue-500 to-brand-600",
        usabilidad: 4,
        adoption: "Alta",
        etapa: 2,
        categoria: "Core ERP",
        descripcion: "Tableros de tareas organizados por sucursales y proyectos para la coordinación del personal de Bioelectrónica, asignación de tareas y tracking de tiempos.",
        hitos: [
            "Vistas de tableros de tareas interactivas con arrastre de tarjetas",
            "Estructura jerárquica de subtareas por proyecto",
            "Generación de códigos correlativos automáticos (ej. BE-12)",
            "Vinculación de tareas a órdenes de trabajo técnicas"
        ],
        tecnologia: ["React Beautiful Dnd / HTML5 Drag", "Lucide Icons", "NextJS Server Actions"],
        pendientes: [
            "Afinación fina de animaciones de arrastre en pantallas táctiles móviles",
            "Notificaciones push por cambio de estado en tareas de alta prioridad"
        ]
    },
    {
        id: "caja-chica",
        nombre: "Control de caja chica",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 2,
        categoria: "Core ERP",
        descripcion: "Arqueos de caja menor, reposiciones de fondos y egresos catalogados con comprobantes de facturas adjuntos e integración directa a sesiones diarias de caja.",
        hitos: [
            "Sesiones de caja chica (Abrir/Cerrar) con saldo final verificado",
            "Catálogo de egresos con carga de fotos de facturas justificantes",
            "Trazabilidad completa de usuarios que abren, modifican o cierran la sesión",
            "Reporte de caja chica filtrado por mes y categorías de gasto"
        ],
        tecnologia: ["Prisma", "PostgreSQL", "React State Management", "R2 Image Store"],
        pendientes: []
    },
    {
        id: "graficas-informes",
        nombre: "Gráficas e informes",
        progreso: 50,
        estado: "DESARROLLO",
        colorClass: "from-purple-500 to-indigo-500",
        usabilidad: 3,
        adoption: "Baja",
        etapa: 2,
        categoria: "Core ERP",
        descripcion: "Módulo estadístico interactivo para la gerencia. Permite visualizar flujos monetarios mensuales, desempeño de técnicos de soporte y auditoría de egresos.",
        hitos: [
            "Cálculo de ingresos consolidados mensuales (Ventas, Rentas, Reparaciones)",
            "Auditoría rápida y listado dinámico de anulaciones con logs de trazabilidad",
            "Matriz de participación en ingresos y egresos de caja chica"
        ],
        tecnologia: ["Dynamic SVGs", "Date Selection Filters", "Prisma Aggregate Functions"],
        pendientes: [
            "Gráfico comparativo interanual para análisis de crecimiento corporativo",
            "Filtros avanzados por vendedor y técnico asignado"
        ]
    },
    {
        id: "garantias-reemplazos",
        nombre: "Garantías y Reemplazos",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 4,
        adoption: "Alta",
        etapa: 2,
        categoria: "Inventario y Ventas",
        descripcion: "Flujo de reclamos de garantías para equipos vendidos o rentados, diagnóstico de fallas, reemplazo de equipos desde stock y rastreabilidad de números de serie.",
        hitos: [
            "Rastreo del historial de activos fijos rentados/comprados",
            "Asignación de diagnósticos de fallas de fábrica",
            "Intercambio ágil de activos en renta con actualización en contrato",
            "Historial auditable de cambios de estado del activo"
        ],
        tecnologia: ["Supabase Database", "Relation Cascade Rules", "React Toast Notifications"],
        pendientes: []
    },
    {
        id: "gestor-precios",
        nombre: "Gestor de precios",
        progreso: 100,
        estado: "OPERATIVO",
        colorClass: "from-emerald-500 to-green-500",
        usabilidad: 5,
        adoption: "Alta",
        etapa: 2,
        categoria: "Inventario y Ventas",
        descripcion: "Administración flexible de listas de precios de venta, costos base, y cálculo automático de ISV aplicable (15% general, 18% especial, exento).",
        hitos: [
            "Cálculo en tiempo real de márgenes de ganancia operativa",
            "Configuración del ISV en cascada para facturación",
            "Actualización masiva de precios por categorías de modelos",
            "Protección de costos base en base de datos visible solo para administradores"
        ],
        tecnologia: ["React Hook Form", "Decimal Types en Prisma", "Tailwind Forms"],
        pendientes: []
    },
    {
        id: "tarjetas-digitales",
        nombre: "Tarjetas Digitales",
        progreso: 50,
        estado: "DESARROLLO",
        colorClass: "from-purple-500 to-indigo-500",
        usabilidad: 4,
        adoption: "Baja",
        etapa: 2,
        categoria: "Administración",
        descripcion: "Creación de tarjetas de presentación digitales (vCard web) para el personal ejecutivo de Bioelectrónica, facilitando el escaneo QR y captura de leads comerciales.",
        hitos: [
            "Esquema de base de datos para perfiles, redes sociales y leads",
            "Generador de códigos QR dinámicos por usuario de la empresa",
            "Formulario de captura de prospectos integrado en la vCard"
        ],
        tecnologia: ["vCard standards", "Dynamic QR Codes", "Formulario React Edge"],
        pendientes: [
            "Selector interactivo de temas visuales y paletas de color en el ERP",
            "Métricas en tiempo real de vistas e interacciones por tarjeta ejecutiva"
        ]
    },

    // --- ETAPA 3: Propuestas de Implementación Futura (0% Avance, No afecta el global) ---
    {
        id: "chatbot-ia",
        nombre: "Chatbot de Ventas con IA",
        progreso: 0,
        estado: "DESARROLLO",
        colorClass: "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800",
        usabilidad: 0,
        adoption: "Baja",
        etapa: 3,
        categoria: "Administración",
        descripcion: "Chatbot inteligente entrenado con el catálogo de inventario y servicios de Bioelectrónica, capaz de responder dudas, cotizar y vender de forma autónoma en WhatsApp y Web.",
        hitos: [
            "Entrenamiento de modelos de lenguaje con catálogo e historial de servicios",
            "Integración de pasarela de agendamiento de soporte técnico automático",
            "API de WhatsApp Business enrutada con flujos conversacionales inteligentes"
        ],
        tecnologia: ["OpenAI LLMs API", "Meta Cloud APIs", "Next.js Edge Functions"],
        pendientes: [
            "Definición del prompt corporativo y tono de marca",
            "Pruebas de cotizaciones automáticas simuladas en Sandbox"
        ]
    },
    {
        id: "publicador-ia",
        nombre: "Programador de Redes Sociales con IA",
        progreso: 0,
        estado: "DESARROLLO",
        colorClass: "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800",
        usabilidad: 0,
        adoption: "Baja",
        etapa: 3,
        categoria: "Administración",
        descripcion: "Módulo para la automatización de redes sociales (Facebook, Instagram) que genera creativos, copys de equipos de renta y consejos de mantenimiento de forma autónoma.",
        hitos: [
            "Meta Graph API vinculada para publicación directa",
            "Generador automatizado de posts comerciales por estacionalidad de patologías",
            "Panel calendarizado interactivo de lanzamientos semanales"
        ],
        tecnologia: ["Meta SDK", "OpenAI DALL-E 3 API", "Inngest Cron Scheduler"],
        pendientes: [
            "Diseño de plantillas de marca predefinidas en CSS",
            "Alineamiento con métricas de conversión comercial"
        ]
    },
    {
        id: "factura-electronica-sar",
        nombre: "Factura Electrónica SAR (XML)",
        progreso: 0,
        estado: "DESARROLLO",
        colorClass: "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800",
        usabilidad: 0,
        adoption: "Baja",
        etapa: 3,
        categoria: "Inventario y Ventas",
        descripcion: "Integración directa para la emisión de Factura Electrónica bajo el nuevo esquema de la SAR Honduras con firmas PKCS#12 (.pfx) y envío en tiempo real de XML.",
        hitos: [
            "Generación de estructura XML homologada por el tributario hondureño",
            "Encriptación y firma del documento digital con certificados fiscales",
            "Consumo automático del SOAP Web Service de la SAR para aprobación"
        ],
        tecnologia: ["XML Signatures", "SOAP APIs", "SAR Honduras Cryptography"],
        pendientes: [
            "Homologación y pruebas en ambiente de certificación SAR",
            "Controles de facturación en contingencia offline"
        ]
    },
    {
        id: "iot-rentas",
        nombre: "Monitoreo IoT de Equipos en Renta",
        progreso: 0,
        estado: "DESARROLLO",
        colorClass: "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800",
        usabilidad: 0,
        adoption: "Baja",
        etapa: 3,
        categoria: "Core ERP",
        descripcion: "Telemetría en tiempo real mediante dispositivos GPS y sensores acoplados a equipos médicos rentados (ej. concentradores de oxígeno) para ver horas de uso y ubicación.",
        hitos: [
            "Integración de mapas Leaflet/Mapbox para geolocalización",
            "Recepción de telemetría por protocolo ligero MQTT",
            "Disparadores automáticos de mantenimiento preventivo por exceso de horas"
        ],
        tecnologia: ["MQTT Protocols", "Mapbox GL JS", "Websockets Connection"],
        pendientes: [
            "Configuración de alertas por geovalla (salidas de perímetro)",
            "Prueba física con sensores de flujo en concentradores"
        ]
    },
    {
        id: "prediccion-ia",
        nombre: "Predicción de Inventario con IA",
        progreso: 0,
        estado: "DESARROLLO",
        colorClass: "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800",
        usabilidad: 0,
        adoption: "Baja",
        etapa: 3,
        categoria: "Inventario y Ventas",
        descripcion: "Análisis predictivo de ventas y alquileres mediante machine learning para anticipar la demanda de stock, compras óptimas a proveedores y evitar el sobre-inventario.",
        hitos: [
            "Procesamiento de datos históricos de cotizaciones y facturas del ERP",
            "Cálculo automático de sugeridos de compra a proveedores",
            "Alertas sobre estacionalidad de patologías de salud locales"
        ],
        tecnologia: ["Prophet Model", "Python Microservice", "TensorFlow Lite"],
        pendientes: [
            "Conexión del microservicio de IA en servidor edge",
            "Dashboard gerencial de proyecciones financieras"
        ]
    }
];

export default function AvancesClient({ dbUser }: { dbUser: any }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "OPERATIVO" | "OPTIMIZACION" | "DESARROLLO">("ALL");
    const [etapaFilter, setEtapaFilter] = useState<"ALL" | "1" | "2" | "3">("ALL");
    const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
    const [presentationMode, setPresentationMode] = useState(false);
    const [activeGaugeTab, setActiveGaugeTab] = useState<"GENERAL" | "ETAPA1" | "ETAPA2" | "ETAPA3">("GENERAL");
    const [viewLayout, setViewLayout] = useState<"GRID" | "LIST">("GRID");

    // Bidirectional sync: Top Gauge Switcher filters the module list
    const handleGaugeTabChange = (tabId: "GENERAL" | "ETAPA1" | "ETAPA2" | "ETAPA3") => {
        setActiveGaugeTab(tabId);
        if (tabId === "GENERAL") setEtapaFilter("ALL");
        else if (tabId === "ETAPA1") setEtapaFilter("1");
        else if (tabId === "ETAPA2") setEtapaFilter("2");
        else if (tabId === "ETAPA3") setEtapaFilter("3");
    };

    // Bidirectional sync: Module list filter dropdown updates top gauge switcher
    const handleEtapaFilterChange = (val: "ALL" | "1" | "2" | "3") => {
        setEtapaFilter(val);
        if (val === "ALL") setActiveGaugeTab("GENERAL");
        else if (val === "1") setActiveGaugeTab("ETAPA1");
        else if (val === "2") setActiveGaugeTab("ETAPA2");
        else if (val === "3") setActiveGaugeTab("ETAPA3");
    };

    // Filter modules
    const filteredModules = erpModules.filter(m => {
        const matchesSearch = m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              m.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || m.estado === statusFilter;
        
        // Link with tab state
        let matchesGaugeTab = true;
        if (activeGaugeTab === "ETAPA1") matchesGaugeTab = m.etapa === 1;
        else if (activeGaugeTab === "ETAPA2") matchesGaugeTab = m.etapa === 2;
        else if (activeGaugeTab === "ETAPA3") matchesGaugeTab = m.etapa === 3;

        return matchesSearch && matchesStatus && matchesGaugeTab;
    });

    // Calculate metrics (Etapa 3 does not affect consolidated metrics)
    const activeModules = erpModules.filter(m => m.etapa !== 3);
    const totalModulesCount = activeModules.length;
    const completedModules = activeModules.filter(m => m.progreso === 100).length;
    const optimizationModules = activeModules.filter(m => m.progreso >= 90 && m.progreso < 100).length;
    
    // Stage-specific arrays
    const stage1Modules = erpModules.filter(m => m.etapa === 1);
    const stage2Modules = erpModules.filter(m => m.etapa === 2);
    const stage3Modules = erpModules.filter(m => m.etapa === 3);

    // Progress averages (Etapa 3 average is 0% and does not touch general consolidado)
    const avgProgressGeneral = Math.round(activeModules.reduce((acc, curr) => acc + curr.progreso, 0) / totalModulesCount * 10) / 10;
    const avgProgressStage1 = Math.round(stage1Modules.reduce((acc, curr) => acc + curr.progreso, 0) / stage1Modules.length * 10) / 10;
    const avgProgressStage2 = Math.round(stage2Modules.reduce((acc, curr) => acc + curr.progreso, 0) / stage2Modules.length * 10) / 10;
    const avgProgressStage3 = 0; // Proposals only

    // Usability averages
    const avgUX = Math.round(activeModules.reduce((acc, curr) => acc + curr.usabilidad, 0) / totalModulesCount * 10) / 10;

    // SVG radial settings for the gauge
    const radius = 55;
    const circumference = 2 * Math.PI * radius; // ~345.57

    // Determine gauge progress based on selected tab
    const getActiveProgress = () => {
        if (activeGaugeTab === "ETAPA1") return avgProgressStage1;
        if (activeGaugeTab === "ETAPA2") return avgProgressStage2;
        if (activeGaugeTab === "ETAPA3") return avgProgressStage3;
        return avgProgressGeneral;
    };
    
    const activeProgressValue = getActiveProgress();
    const strokeDashoffset = circumference - (activeProgressValue / 100) * circumference;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={`transition-colors duration-500 ${
            presentationMode 
                ? "bg-slate-50 text-slate-800 min-h-screen p-6 md:p-12 absolute inset-0 z-[100] overflow-y-auto space-y-6" 
                : "bg-slate-50 text-slate-800 space-y-6"
        }`}>
            {/* HEADER */}
            <div className="relative z-10 p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 bg-white border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-brand-50">
                            <TrendingUp className="w-6 h-6 text-brand-600" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            Resumen de Avance Tecnológico
                        </h1>
                    </div>
                    <p className="text-xs mt-1.5 font-medium text-slate-500">
                        Presentación Ejecutiva del ERP de Bioelectrónica — Preparado para: <strong className="text-slate-700">Manuel Tejada (Gerente General)</strong>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-20">
                    <button
                        onClick={() => setPresentationMode(!presentationMode)}
                        className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm ${
                            presentationMode 
                                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20" 
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                    >
                        {presentationMode ? (
                            <>
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Salir de Presentación
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Modo Presentación
                            </>
                        )}
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Imprimir / PDF
                    </button>
                </div>
            </div>

            {/* MAIN METRIC & RADIAL GAUGE CARD */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gauge Card (2 columns wide) */}
                <div className="p-6 rounded-2xl border flex flex-col justify-between md:col-span-2 bg-white border-slate-200 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-dashed border-slate-200/50">
                        <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                Indicador de Progreso por Fases
                            </span>
                            <h2 className="text-lg font-black tracking-tight text-slate-800">
                                {activeGaugeTab === "GENERAL" ? "Avance Consolidado General" : 
                                 activeGaugeTab === "ETAPA1" ? "Etapa 1: Propuesta Inicial / Core Operaciones" : 
                                 activeGaugeTab === "ETAPA2" ? "Etapa 2: Módulos ERP de Valor Agregado" :
                                 "Etapa 3: Propuestas de Crecimiento Futuro"}
                            </h2>
                        </div>
                        
                        {/* Selector Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0">
                            {[
                                { id: "GENERAL", label: "Consolidado" },
                                { id: "ETAPA1", label: "Etapa 1" },
                                { id: "ETAPA2", label: "Etapa 2" },
                                { id: "ETAPA3", label: "Etapa 3" }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleGaugeTabChange(t.id as any)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        activeGaugeTab === t.id
                                            ? "bg-white text-brand-700 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-6">
                        
                        {/* The Beautiful Gauge */}
                        <div className="relative flex items-center justify-center">
                            {/* Inner Shadows and Outer Ring glows via HTML/CSS wrapper */}
                            <div className="absolute w-36 h-36 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100" />

                            <svg className="w-36 h-36 transform -rotate-90 relative z-10">
                                {/* Background Ring */}
                                <circle
                                    cx="72"
                                    cy="72"
                                    r={radius}
                                    className="stroke-current text-slate-100"
                                    strokeWidth="12"
                                    fill="none"
                                />
                                {/* Progress Ring */}
                                <circle
                                    cx="72"
                                    cy="72"
                                    r={radius}
                                    stroke="url(#gaugeGradient)"
                                    strokeWidth="12"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="none"
                                    className="transition-all duration-1000 ease-in-out"
                                    style={{ strokeDashoffset }}
                                />
                                <defs>
                                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="60%" stopColor="#2563eb" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            
                            {/* Centered Values */}
                            <div className="absolute flex flex-col items-center z-20">
                                <span className="text-2xl font-black tracking-tighter text-slate-900">
                                    {activeProgressValue}%
                                </span>
                                <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                                    {activeGaugeTab === "ETAPA3" ? "Propuesta" : "Completado"}
                                </span>
                            </div>
                        </div>

                        {/* Descriptive Info based on tab */}
                        <div className="space-y-4 max-w-sm">
                            {activeGaugeTab === "GENERAL" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                        <span>Progreso Global del ERP</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-500">
                                        Integración consolidada de todos los servicios. Comprende la base transaccional core y módulos complementarios que potencian las ventas y operaciones de la empresa.
                                    </p>
                                    <div className="text-xs font-bold space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Total de Módulos:</span>
                                            <span className="text-slate-700">
                                                {totalModulesCount} Implementados • {stage3Modules.length} Propuestos
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeGaugeTab === "ETAPA1" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>Etapa 1: Propuesta Inicial</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-500">
                                        Módulos originales propuestos para arrancar operaciones: <strong>Inventario, Mantenimiento y Reparaciones, Renta de Equipos, Cotizaciones y Facturación, y Página Web / Tienda.</strong>
                                    </p>
                                    <div className="text-xs font-bold space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Estado Promedio Etapa 1:</span>
                                            <span className="text-emerald-500">{avgProgressStage1}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeGaugeTab === "ETAPA2" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
                                        <Sparkle className="w-4 h-4 text-yellow-400" />
                                        <span>Etapa 2: Módulos Adicionales</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-500">
                                        Módulos adicionales implementados para dar un valor agregado al flujo empresarial, como <strong>Proyectos y Tareas, Caja Chica, Contactos, Órdenes de Entrega, Cierre de Caja, Garantías, Gestor de Precios, Gráficas y vCards.</strong>
                                    </p>
                                    <div className="text-xs font-bold space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Estado Promedio Etapa 2:</span>
                                            <span className="text-indigo-400">{avgProgressStage2}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeGaugeTab === "ETAPA3" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-500">
                                        <Sparkle className="w-4 h-4 text-purple-400" />
                                        <span>Etapa 3: Planificación de Futuro</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-500">
                                        Propuestas estratégicas de optimización con <strong>Chatbot de Ventas con IA, Automatización de Redes Sociales, Factura Electrónica SAR, Telemetría IoT y Predicción de Demanda</strong> (0% de avance, sin afectar la tasa consolidada del ERP).
                                    </p>
                                    <div className="text-xs font-bold space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Estado:</span>
                                            <span className="text-purple-500 font-extrabold uppercase">Fase de Propuestas</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Development Velocity / KPI Card */}
                <div className="p-6 rounded-2xl border flex flex-col justify-between bg-white border-slate-200 shadow-sm">
                    <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Velocidad de Entrega
                        </span>
                        <h3 className="font-black text-sm tracking-tight text-slate-800">
                            Desarrollo Acelerado (2 meses)
                        </h3>
                    </div>

                    {/* Git statistics / Lines count */}
                    <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="p-3 rounded-xl border flex items-center gap-2.5 bg-slate-50 border-slate-200/50">
                            <GitCommit className="w-4 h-4 text-blue-500 shrink-0" />
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase">Commits</span>
                                <span className="text-sm font-black text-slate-800">542</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border flex items-center gap-2.5 bg-slate-50 border-slate-200/50">
                            <Code2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase">Líneas de Código</span>
                                <span className="text-sm font-black text-slate-800">76,893</span>
                            </div>
                        </div>
                    </div>

                    {/* Market Comparison Chart */}
                    <div className="space-y-3.5 border-t pt-4 border-slate-200/40">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-wider">
                            Comparativa: Tiempo de Implementación
                        </span>
                        
                        {/* Comparison Bars */}
                        <div className="space-y-2.5">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-500">Estándar del Mercado (Custom ERP)</span>
                                    <span className="text-slate-700">9 Meses</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 rounded-full" style={{ width: "100%" }} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-700">Desarrollo Bioelectrónica ERP</span>
                                    <span className="text-emerald-500 font-extrabold">2 Meses (Logrado)</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20" style={{ width: "22.2%" }} />
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-[10px] italic leading-normal text-slate-500">
                            Desarrollo e integración de API de WhatsApp, pasarelas de firma, Cloud storage y procesamiento de IA en un tiempo récord de 60 días.
                        </p>
                    </div>
                </div>

            </div>

            {/* VALUE PROPOSITION: MARKET COMPARATIVE & ACCELERATOR SUMMARY */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom ERP vs SaaS / SAP */}
                <div className="p-6 rounded-2xl border flex flex-col justify-between h-[360px] bg-white border-slate-200 shadow-sm">
                    <div>
                        <h3 className="font-black text-sm tracking-tight text-slate-800">
                            Comparativa del Mercado ERP
                        </h3>
                        <p className="text-[10px] text-slate-500">
                            ¿Por qué un sistema a medida supera los softwares comerciales genéricos?
                        </p>
                    </div>

                    <div className="space-y-3 my-auto">
                        <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div className="text-xs">
                                <strong className="text-slate-700">Costo de Licenciamiento $0:</strong>
                                <span className="text-slate-500"> A diferencia de Odoo/SAP que cobran por usuario, este ERP es tuyo sin cobros recurrentes de licencias.</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div className="text-xs">
                                <strong className="text-slate-700">Flujos de Negocio Exactos:</strong>
                                <span className="text-slate-500"> Adaptado exactamente al servicio técnico de equipos médicos y rentas con depósitos, evitando procesos forzados.</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div className="text-xs">
                                <strong className="text-slate-700">Uptime y Escalabilidad:</strong>
                                <span className="text-slate-500"> Alojado en infraestructura edge de nivel mundial con bases de datos relacionales PostgreSQL que toleran miles de transacciones por segundo.</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-[9px] text-center border-t pt-3 border-slate-100 text-slate-400">
                        Desarrollado con arquitectura moderna en Next.js y Prisma ORM
                    </div>
                </div>

                {/* Modern Features showcase */}
                <div className="lg:col-span-2 p-6 rounded-2xl border flex flex-col h-[360px] justify-between bg-white border-slate-200 shadow-sm">
                    <div>
                        <h3 className="font-black text-sm tracking-tight text-slate-800">
                            Características de Última Generación
                        </h3>
                        <p className="text-[10px] text-slate-500">
                            Tecnologías de punta integradas directamente en el flujo del sistema
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 my-3 custom-scrollbar">
                        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200/50">
                            <div className="flex items-center gap-2 text-xs font-black text-blue-500">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                <span>IA Vision (Inventario IA)</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                Escaneo inteligente de placas de activos mediante visión artificial para identificar marca, modelo y número de serie automáticamente.
                            </p>
                        </div>

                        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200/50">
                            <div className="flex items-center gap-2 text-xs font-black text-emerald-500">
                                <MessageSquare className="w-4 h-4" />
                                <span>Mensajería WhatsApp</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                Notificaciones directas al cliente al ingresar un equipo a soporte, diagnosticar un presupuesto o despachar un activo en ruta.
                            </p>
                        </div>

                        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200/50">
                            <div className="flex items-center gap-2 text-xs font-black text-purple-500">
                                <Monitor className="w-4 h-4" />
                                <span>Firmas Táctiles Digitales</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                Firma directa sobre tablets o celulares al recibir un equipo en renta o firmar un albarán de entrega, guardado como evidencia legal.
                            </p>
                        </div>

                        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200/50">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-500">
                                <Database className="w-4 h-4" />
                                <span>Resguardo de Fotos en Nube</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                Carga de fotos de estado físico en tiempo real de los equipos a Cloudflare R2, asegurando evidencia indiscutible de abolladuras o daños.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* MODULE DIRECTORY GRID */}
            <div className="space-y-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 border-slate-200/40">
                    <div>
                        <h3 className="font-black text-lg tracking-tight text-slate-900">
                            Auditoría de Módulos del Sistema
                        </h3>
                        <p className="text-xs text-slate-500">
                            Listado completo clasificado por etapas de desarrollo del negocio.
                        </p>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center px-3 py-2 rounded-xl border bg-white border-slate-200 shadow-sm">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input 
                                type="text"
                                placeholder="Buscar módulo..."
                                className="bg-transparent text-xs focus:outline-none placeholder:text-slate-400 w-36 font-semibold"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <select
                            className="text-xs font-bold px-3 py-2 rounded-xl border focus:outline-none cursor-pointer bg-white border-slate-200 shadow-sm text-slate-700"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                        >
                            <option value="ALL">Todos los Estados</option>
                            <option value="OPERATIVO">Operativo (100%)</option>
                            <option value="OPTIMIZACION">Optimización (90-95%)</option>
                            <option value="DESARROLLO">Desarrollo (50-60%)</option>
                        </select>

                        <select
                            className="text-xs font-bold px-3 py-2 rounded-xl border focus:outline-none cursor-pointer bg-white border-slate-200 shadow-sm text-slate-700"
                            value={etapaFilter}
                            onChange={e => handleEtapaFilterChange(e.target.value as any)}
                        >
                            <option value="ALL">Todas las Etapas</option>
                            <option value="1">Etapa 1: Propuesta Inicial</option>
                            <option value="2">Etapa 2: Módulos Adicionales</option>
                            <option value="3">Etapa 3: Propuestas de Crecimiento</option>
                        </select>

                        {/* Layout Selector Button Group */}
                        <div className="flex p-1 rounded-xl border bg-white border-slate-200 shadow-sm">
                            <button
                                onClick={() => setViewLayout("GRID")}
                                title="Vista de Tarjetas"
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    viewLayout === "GRID"
                                        ? "bg-slate-100 text-slate-800"
                                        : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewLayout("LIST")}
                                title="Vista de Líneas Horizontales"
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    viewLayout === "LIST"
                                        ? "bg-slate-100 text-slate-800"
                                        : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid / List Layout Selector rendering */}
                {viewLayout === "GRID" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredModules.map(m => {
                            const isDone = m.progreso === 100;
                            const isBeta = m.progreso >= 90 && m.progreso < 100;

                            return (
                                <div 
                                    key={m.id}
                                    onClick={() => setSelectedModule(m)}
                                    className="p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between group bg-white border-slate-200 hover:bg-slate-50/45 shadow-sm"
                                >
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.5 max-w-[70%]">
                                                <h4 className="font-black text-sm truncate text-slate-800 group-hover:text-brand-600">
                                                    {m.nombre}
                                                </h4>
                                                <span className="text-[8px] font-extrabold uppercase tracking-wider block text-slate-400">
                                                    Etapa {m.etapa} • {m.categoria}
                                                </span>
                                            </div>
                                            
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                                m.etapa === 3
                                                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                    : isDone 
                                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                                        : isBeta 
                                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                            }`}>
                                                {m.etapa === 3 ? "Propuesta" : `${m.progreso}%`}
                                            </span>
                                        </div>

                                        <p className="text-xs line-clamp-3 leading-relaxed text-slate-500">
                                            {m.descripcion}
                                        </p>

                                        {/* Horizontal progress bar */}
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3 shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
                                                    m.etapa === 3 
                                                        ? "from-purple-500 to-indigo-500" 
                                                        : m.colorClass
                                                }`} 
                                                style={{ width: `${m.progreso === 0 && m.etapa === 3 ? 5 : m.progreso}%` }} 
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-3.5 border-t flex items-center justify-between text-[10px] font-bold border-slate-100 text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">UX:</span>
                                            {m.etapa === 3 ? (
                                                <span className="text-[9px] text-slate-400 italic font-medium">Por definir</span>
                                            ) : (
                                                <div className="flex items-center gap-0.5 text-yellow-500">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <span 
                                                            key={i} 
                                                            className={`text-sm ${i < m.usabilidad ? "opacity-100" : "opacity-25"}`}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">Uso:</span>
                                            <span className={
                                                m.etapa === 3 ? "text-slate-400 font-medium" :
                                                m.adoption === "Alta" ? "text-emerald-500" :
                                                m.adoption === "Media" ? "text-blue-500" : "text-slate-400"
                                            }>{m.etapa === 3 ? "Planeado" : m.adoption}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredModules.map(m => {
                            const isDone = m.progreso === 100;
                            const isBeta = m.progreso >= 90 && m.progreso < 100;

                            return (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedModule(m)}
                                    className="p-4 rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group bg-white border-slate-200 hover:bg-slate-50/45 shadow-sm"
                                >
                                    {/* Left Column: Title, Metadata, Description */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                            <h4 className="font-black text-sm truncate text-slate-800 group-hover:text-brand-600">
                                                {m.nombre}
                                            </h4>
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                Etapa {m.etapa}
                                            </span>
                                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                                                {m.categoria}
                                            </span>
                                        </div>
                                        <p className="text-xs line-clamp-1 text-slate-500">
                                            {m.descripcion}
                                        </p>
                                    </div>

                                    {/* Middle Column: Progress bar and progress number */}
                                    <div className="flex items-center gap-4 w-full lg:w-72 shrink-0">
                                        <div className="flex-1">
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
                                                        m.etapa === 3
                                                            ? "from-purple-500 to-indigo-500"
                                                            : m.colorClass
                                                    }`}
                                                    style={{ width: `${m.progreso === 0 && m.etapa === 3 ? 5 : m.progreso}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full w-16 text-center ${
                                            m.etapa === 3
                                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                : isDone
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                    : isBeta
                                                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                        }`}>
                                            {m.etapa === 3 ? "Propuesta" : `${m.progreso}%`}
                                        </span>
                                    </div>

                                    {/* Right Column: UX, Use, Chevron */}
                                    <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 text-[10px] font-bold">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">UX:</span>
                                            {m.etapa === 3 ? (
                                                <span className="text-[9px] text-slate-400 italic font-medium">Por definir</span>
                                            ) : (
                                                <div className="flex items-center gap-0.5 text-yellow-500">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <span
                                                            key={i}
                                                            className={`text-sm ${i < m.usabilidad ? "opacity-100" : "opacity-25"}`}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 min-w-[70px]">
                                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">Uso:</span>
                                            <span className={
                                                m.etapa === 3 ? "text-slate-400 font-medium" :
                                                m.adoption === "Alta" ? "text-emerald-500" :
                                                m.adoption === "Media" ? "text-blue-500" : "text-slate-400"
                                            }>{m.etapa === 3 ? "Planeado" : m.adoption}</span>
                                        </div>

                                        <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 shrink-0 text-slate-400 group-hover:text-brand-600" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* AUDIT / DETAIL MODAL */}
            {selectedModule && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] border bg-white border-slate-200 text-slate-800">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b flex items-center justify-between border-slate-100 bg-slate-50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-base tracking-tight text-slate-900">
                                        Detalle Técnico: {selectedModule.nombre}
                                    </h3>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                        selectedModule.etapa === 3
                                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                            : selectedModule.progreso === 100
                                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                : selectedModule.progreso >= 90
                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                    }`}>
                                        {selectedModule.etapa === 3 ? "Propuesta" : `${selectedModule.progreso}%`}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                                    Etapa {selectedModule.etapa} • {selectedModule.categoria}
                                </p>
                            </div>
                            
                            <button
                                onClick={() => setSelectedModule(null)}
                                className="p-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200"
                            >
                                Cerrar
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto space-y-5">
                            
                            {/* Desc */}
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                                    Descripción Funcional
                                </h4>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    {selectedModule.descripcion}
                                </p>
                            </div>

                            {/* Tech Stack */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Code2 className="w-3.5 h-3.5" /> Stack de Implementación
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedModule.tecnologia.map((tech, i) => (
                                        <span 
                                            key={i} 
                                            className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-700"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Completed Checklist */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {selectedModule.etapa === 3 ? "Hitos Planificados" : "Hitos Completados"}
                                </h4>
                                <div className="space-y-1.5">
                                    {selectedModule.hitos.map((hito, i) => (
                                        <div key={i} className="flex items-start gap-2.5 text-xs font-medium">
                                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span className="text-slate-700">
                                                {hito}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Remaining Tasks (If any) */}
                            {selectedModule.pendientes.length > 0 && (
                                <div className="space-y-2 border-t pt-4 border-dashed border-slate-700/50">
                                    <h4 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> {selectedModule.etapa === 3 ? "Trabajos por Iniciar" : "Tareas de Optimización Pendientes"}
                                    </h4>
                                    <div className="space-y-1.5">
                                        {selectedModule.pendientes.map((pend, i) => (
                                            <div key={i} className="flex items-start gap-2.5 text-xs font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                                <span className="text-slate-700">
                                                    {pend}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t flex justify-end bg-slate-900/10 border-slate-100">
                            <button
                                onClick={() => setSelectedModule(null)}
                                className="text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT CSS OVERRIDES */}
            <style jsx global>{`
                @media print {
                    aside, header, nav, button, select, input, .z-\\[100\\], .relative.z-20 {
                        display: none !important;
                    }
                    body, html, main {
                        background-color: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        height: auto !important;
                    }
                    .print-container {
                        max-width: 100% !important;
                        width: 100% !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
