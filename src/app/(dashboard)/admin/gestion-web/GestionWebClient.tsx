'use client';

import React, { useState, useEffect } from 'react';
import { 
    saveMaintenanceMode, 
    saveLandingSections, 
    saveGoogleReviews, 
    saveLandingSettings, 
    searchInventoryItems, 
    updateItemWebFields,
    updateItemImage,
    getWebContacts,
    updateContactStatus,
    deleteWebContact,
    getWebTraffic,
    getPaginatedInventoryItems,
    getInventoryItemById,
    deleteInventoryItem,
    getImportedCategories,
    deleteWebCategory,
    deleteWebCategoriesBulk
} from './actions';
import { 
    Settings, 
    MessageSquare, 
    Image as ImageIcon, 
    LayoutGrid, 
    Save, 
    Plus, 
    Trash2, 
    Search, 
    AlertCircle, 
    CheckCircle2, 
    ArrowUpDown, 
    ToggleLeft, 
    ToggleRight, 
    Smartphone, 
    Mail, 
    MapPin, 
    Clock, 
    HelpCircle,
    Eye,
    EyeOff,
    Users,
    Activity,
    User,
    Laptop,
    Globe,
    MessageCircle,
    Send,
    Check,
    RefreshCw,
    X,
    List,
    ExternalLink,
    Code,
    TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import RD_CATEGORIES from './rd-categories.json';

const SOMA_CATEGORIES = [
    { value: "analizador-de-coagulacion", label: "Analizador de Coagulación" },
    { value: "arcos-en-c", label: "Arcos en C" },
    { value: "artroscopios", label: "Artroscopios" },
    { value: "autoclaves-esterilizadores", label: "Autoclaves / Esterilizadores" },
    { value: "autotransfusion", label: "Autotransfusión" },
    { value: "bacinetes-pediatricos", label: "Bacinetes Pediátricos" },
    { value: "bipap", label: "BiPAP" },
    { value: "bisturies-armonicos", label: "Bisturíes Armónicos" },
    { value: "bomba-de-alimentacion", label: "Bomba de Alimentación" },
    { value: "bombas-de-jeringe", label: "Bombas de Jeringa" },
    { value: "bombas-de-succion", label: "Bombas de Succión" },
    { value: "bombas-intra-aorticas", label: "Bombas Intra-aórticas" },
    { value: "bombas-intravenosas", label: "Bombas Intravenosas" },
    { value: "bombas-portatiles-de-infusion", label: "Bombas Portátiles de Infusión" },
    { value: "cabezales-medicos", label: "Cabezales Médicos" },
    { value: "calentador-enfriador", label: "Calentador / Enfriador" },
    { value: "calentador-de-fluidos", label: "Calentador de Fluidos" },
    { value: "calentador-de-mantas", label: "Calentador de Mantas" },
    { value: "calentadores", label: "Calentadores" },
    { value: "camaras-de-video", label: "Cámaras de Video" },
    { value: "camas-de-hospital", label: "Camas de Hospital" },
    { value: "camillas", label: "Camillas" },
    { value: "camillas-de-transporte", label: "Camillas de Transporte" },
    { value: "capturadores-de-imagenes", label: "Capturadores de Imágenes" },
    { value: "cardiologia", label: "Cardiología" },
    { value: "cardiovascular", label: "Cardiovascular" },
    { value: "carros-de-anestesia", label: "Carros de Anestesia" },
    { value: "carros-de-emergencia", label: "Carros de Emergencia" },
    { value: "carros-de-paro", label: "Carros de Paro" },
    { value: "cistoscopios", label: "Cistoscopios" },
    { value: "colposcopios", label: "Colposcopios" },
    { value: "cortador-de-yeso", label: "Cortador de Yeso" },
    { value: "cunas-termicas", label: "Cunas Térmicas" },
    { value: "desfibriladores", label: "Desfibriladores" },
    { value: "desfibriladores-medicos", label: "Desfibriladores Médicos" },
    { value: "desfibriladores-automaticos-externos", label: "Desfibriladores Automáticos Externos (DEA)" },
    { value: "desfibriladores-portatiles", label: "Desfibriladores Portátiles" },
    { value: "unidades-electroquirurgicas-electrobisturis", label: "Electrobisturíes" },
    { value: "ekg-interpretativo-y-no-interpretativo", label: "Electrocardiógrafos (EKG)" },
    { value: "electroencefalogramas-eeg", label: "Electroencefalogramas (EEG)" },
    { value: "endoscopia", label: "Endoscopía" },
    { value: "endoscopios-flexibles", label: "Endoscopios Flexibles" },
    { value: "endoscopios-rigidos", label: "Endoscopios Rígidos" },
    { value: "algologia", label: "Equipos Médicos para Algología" },
    { value: "escaneres-de-vejiga", label: "Escáneres de Vejiga" },
    { value: "evacuadores-de-humo", label: "Evacuadores de Humo" },
    { value: "fibroscopios", label: "Fibroscopios" },
    { value: "fuentes-de-luz", label: "Fuentes de Luz" },
    { value: "generador-de-radiofrecuencia", label: "Generador de Radiofrecuencia" },
    { value: "ucii-nicu-unidades-neonatales-cuidado-intensivo", label: "Ginecología / Cuidado Intensivo Neonatal" },
    { value: "imagenologia-radiologia", label: "Imagenología y Radiología" },
    { value: "impresoras", label: "Impresoras" },
    { value: "incubadoras", label: "Incubadoras" },
    { value: "incubadoras-de-transporte", label: "Incubadoras de Transporte" },
    { value: "instrumental-de-cirugia", label: "Instrumental de Cirugía" },
    { value: "insufladores", label: "Insufladores" },
    { value: "inyectores-para-campo-magnetico", label: "Inyectores para Campo Magnético" },
    { value: "luces-de-cirugia-lamparas-quirurgicas", label: "Lámparas Quirúrgicas" },
    { value: "laparoscopios", label: "Laparoscopios" },
    { value: "scrub-sinks", label: "Lavabos Quirúrgicos" },
    { value: "limpiadores-ultrasonicos", label: "Limpiadores Ultrasónicos" },
    { value: "maquinas-de-anestesia", label: "Máquinas de Anestesia" },
    { value: "maquinas-de-corazon-y-pulmon", label: "Máquinas de Corazón y Pulmón" },
    { value: "maquinas-para-hiper-hipotermia", label: "Máquinas para Hiper/Hipotermia" },
    { value: "marcapasos-externos", label: "Marcapasos Externos" },
    { value: "mesa-de-examen", label: "Mesa de Examen" },
    { value: "mesas-de-cirugia", label: "Mesas Quirúrgicas" },
    { value: "mesas-quirurgicas-de-urologia", label: "Mesas Quirúrgicas de Urología" },
    { value: "mesas-transducidas", label: "Mesas Translúcidas" },
    { value: "microscopios-de-cirugia", label: "Microscopios de Cirugía" },
    { value: "microscopios-para-oftalmologa", label: "Microscopios para Oftalmología" },
    { value: "microscopios-para-otorrinolaringologo", label: "Microscopios para Otorrinolaringólogo" },
    { value: "mini-arcos-en-c", label: "Mini Arcos en C" },
    { value: "miscelaneos", label: "Misceláneos" },
    { value: "monitor-multiparametro-para-uti", label: "Monitor Multiparámetro para UTI" },
    { value: "monitores", label: "Monitores" },
    { value: "monitores-bis", label: "Monitores BIS" },
    { value: "monitores-de-agente-y-co2", label: "Monitores de Agente y CO2" },
    { value: "monitores-de-capnografia", label: "Monitores de Capnografía" },
    { value: "monitores-de-oxigeno", label: "Monitores de Oxígeno" },
    { value: "monitores-de-paciente-portatiles", label: "Monitores de Paciente Portátiles" },
    { value: "monitores-de-pantalla-plana", label: "Monitores de Pantalla Plana para Endoscopia" },
    { value: "monitores-de-presin-sanguinea-no-invasiva", label: "Monitores de Presión Sanguínea No Invasiva" },
    { value: "monitores-de-signos-vitales", label: "Monitores de Signos Vitales" },
    { value: "monitores-de-volumen", label: "Monitores de Volumen" },
    { value: "monitores-fetales", label: "Monitores Fetales" },
    { value: "monitores-fetales-antepartum", label: "Monitores Fetales Antepartum" },
    { value: "monitores-fetales-intrapartum", label: "Monitores Fetales Intrapartum" },
    { value: "monitores-multiparametros", label: "Monitores Multiparámetros" },
    { value: "neurocirugia", label: "Neurocirugía" },
    { value: "oximetro-de-pulso", label: "Oxímetro de Pulso" },
    { value: "procesadores-de-video", label: "Procesadores de Video" },
    { value: "productos-destacados", label: "Productos Destacados" },
    { value: "rayos-x-portables", label: "Rayos X Portátiles" },
    { value: "razuradores-artroscopicos", label: "Rasuradores Artroscópicos" },
    { value: "reprocesador-para-endoscopios", label: "Reprocesador para Endoscopios" },
    { value: "calentadores-de-pacientes", label: "Sistema de Calentamiento de Pacientes" },
    { value: "sistema-de-compresion-secuencial", label: "Sistema de Compresión Secuencial" },
    { value: "sistemas-completos-de-endoscopia", label: "Sistemas Completos de Endoscopia" },
    { value: "sistemas-completos-de-laparoscopia", label: "Sistemas Completos de Laparoscopia" },
    { value: "sistemas-de-alto-flujo", label: "Sistemas de Alto Flujo" },
    { value: "sistemas-de-pruebas-de-esfuerzo", label: "Sistemas de Pruebas de Esfuerzo" },
    { value: "sistemas-de-telemetria", label: "Sistemas de Telemetría" },
    { value: "sistemas-hardwired", label: "Sistemas Hardwired" },
    { value: "sistemas-quirurgicos-de-slush", label: "Sistemas Quirúrgicos de Slush" },
    { value: "soluciones-de-anestesia", label: "Soluciones de Anestesia" },
    { value: "terapia-respiratoria", label: "Terapia Respiratoria" },
    { value: "obgyn-ucin", label: "Soluciones de Equipos de OBGYN / UCIN" },
    { value: "stirrups", label: "Stirrups" },
    { value: "terapia-intravenosa", label: "Terapia Intravenosa" },
    { value: "torniquetes", label: "Torniquetes" },
    { value: "sistema-de-video-endoscopia", label: "Torres de Video-Endoscopia y Laparoscopia" },
    { value: "transductores-de-ultrasonido", label: "Transductores de Ultrasonido" },
    { value: "ultrasonidos", label: "Ultrasonidos" },
    { value: "uncategorized", label: "Sin Categorizar" },
    { value: "uci", label: "Unidad de Cuidados Intensivos (UCI)" },
    { value: "unidades-emg", label: "Unidades EMG" },
    { value: "vaporizadores-de-anestesia", label: "Vaporizadores de Anestesia" },
    { value: "ventiladores", label: "Ventiladores" },
    { value: "ventiladores-de-anestesia", label: "Ventiladores de Anestesia" },
    { value: "ventiladores-portatil", label: "Ventiladores Portátiles" },
    { value: "video-laringoscopios", label: "Video Laringoscopios" },
    { value: "video-endoscopia-y-laparoscopia", label: "Video-Endoscopia y Laparoscopia" }
];

const PUKANG_CATEGORIES = [
    { value: "hospital-bed", label: "Cama de Hospital" },
    { value: "icu-bed", label: "Cama UCI" },
    { value: "electric-hospital-bed", label: "Cama de Hospital Eléctrica" },
    { value: "manual-hospital-bed", label: "Cama de Hospital Manual" },
    { value: "children-hospital-bed", label: "Cama de Hospital para Niños" },
    { value: "infant-hospital-bed", label: "Cama de Hospital Infantil" },
    { value: "examination-bed", label: "Cama de Examen" },
    { value: "home-care-bed", label: "Cama de Cuidados Domiciliarios" },
    { value: "transport-stretcher", label: "Camilla de Transporte" },
    { value: "delivery-bed", label: "Cama de Parto" },
    { value: "medical-trolleys", label: "Carro Médico" },
    { value: "bedside-table", label: "Mesilla de Noche" },
    { value: "medical-cabinet", label: "Gabinete Médico" },
    { value: "peripheral-products", label: "Productos Periféricos" },
    { value: "patient-lift", label: "Elevación de Pacientes" }
];

const JOSON_CATEGORIES = [
    { value: "cama-uci", label: "Cama de UCI" },
    { value: "cama-hospital", label: "Cama de hospital" },
    { value: "cama-hospital-manual", label: "Cama de hospital manual" },
    { value: "camilla-emergencia", label: "Camilla de emergencia" },
    { value: "cama-pediatrica", label: "Cama pediátrica" },
    { value: "cama-cuidados-hogar", label: "Cama de cuidados en el hogar" },
    { value: "equipo-medico-sala", label: "Equipo médico y de sala" }
];

const AERTI_CATEGORIES = [
    { value: "camara-oxigeno", label: "Cámara de oxígeno", path: "oxygen-chamber" },
    { value: "concentrador-medico", label: "Concentrador de oxígeno médico", path: "medical-oxygen-concentrator" },
    { value: "concentrador-portatil", label: "Concentrador de oxígeno portátil", path: "portable-oxygen-concentrator" },
    { value: "concentrador-industrial", label: "Concentrador de oxígeno industrial", path: "industrial-oxygen-concentrator" },
    { value: "analizador-oxigeno", label: "Analizador de oxígeno", path: "oxygen-analyzer" },
    { value: "mezclador-cocteles", label: "Mezclador de cócteles de oxígeno", path: "oxygen-cocktail-mixer" },
    { value: "concentrador-veterinario", label: "Concentrador de oxígeno veterinario", path: "veterinary-oxygen-concentrator" },
    { value: "entrenamiento-altitud", label: "Entrenamiento de altitud simulada", path: "simulated-altitude-training" },
    { value: "accesorios-concentrador", label: "Accesorios para concentradores de oxígeno", path: "oxygen-concentrator-accessories" }
];

const DRE_CATEGORIES = [
    { value: "anestesia", label: "Equipos de Anestesia" },
    { value: "aspiradores-succion", label: "Aspiradores y Bombas de Succión" },
    { value: "electrocirugia", label: "Equipos de Electrocirugía" },
    { value: "endoscopia-laparoscopia", label: "Endoscopía y Laparoscopía" },
    { value: "lamparas-quirurgicas", label: "Lámparas Quirúrgicas" },
    { value: "microscopios", label: "Microscopios Clínicos y Quirúrgicos" },
    { value: "mobiliario-quirofano", label: "Mobiliario de Quirófano" },
    { value: "motores-quirurgicos", label: "Motores e Instrumental de Poder" },
    { value: "sillones-procedimiento", label: "Sillones de Procedimiento" },
    { value: "camillas-quirurgicas", label: "Camillas Quirúrgicas y de Transporte" },
    { value: "compresion-secuencial", label: "Dispositivos de Compresión Secuencial" },
    { value: "esterilizacion-autoclaves", label: "Esterilizadores y Autoclaves" },
    { value: "instrumental-quirurgico", label: "Instrumental Quirúrgico" },
    { value: "mesas-quirurgicas", label: "Mesas Quirúrgicas" },
    { value: "sistemas-torniquete", label: "Sistemas de Torniquete" },
    { value: "camas-hospital", label: "Camas de Hospital" },
    { value: "cunas-incubadoras", label: "Cuidado Neonatal e Incubadoras" },
    { value: "desfibriladores", label: "Desfibriladores y DEAs" },
    { value: "electrocardiografos", label: "Electrocardiógrafos (ECG/EKG)" },
    { value: "monitores-fetal", label: "Monitores Fetales" },
    { value: "monitores-paciente", label: "Monitores de Signos Vitales y Paciente" },
    { value: "mesas-imagenologia", label: "Mesas de Imagenología" },
    { value: "ultrasonidos", label: "Equipos de Ultrasonido" }
];

const AMCAREMED_CATEGORIES = [
    {
        value: "fuente-de-gases-medicinales",
        label: "Fuente de gases medicinales",
        subcategories: [
            { value: "plantas-de-oxigeno-medicinal", label: "Plantas de oxígeno medicinal", path: "product/oxygen-plant" },
            { value: "almacenamiento-de-oxigeno-liquido", label: "Almacenamiento de oxígeno líquido", path: "product/cryogenic-liquid-oxygen-storage-system" },
            { value: "compresores-de-aire-medicinal", label: "Compresores de aire medicinal", path: "product/medical-air-compressor" },
            { value: "sistema-de-vacio-medico", label: "Sistema de vacío médico", path: "products/medical-vacuum-pump-system" },
            { value: "sistema-de-eliminacion-de-gases-anestesicos", label: "Sistema de eliminación de gases anestésicos", path: "product/agss" },
            { value: "colectores", label: "Colectores", path: "product/manifolds" },
            { value: "cilindros-de-gases-medicinales", label: "Cilindros de gases medicinales", path: "product/medical-gas-cylinders" },
            { value: "ambulance-oxygen-supply-system", label: "Ambulance Oxygen Supply System", path: "products/ambulance-oxygen-supply-system" }
        ]
    },
    {
        value: "gasoducto-de-gases-medicinales",
        label: "Gasoducto de gases medicinales",
        subcategories: [
            { value: "tubo-de-cobre-accesorios-y-accesorios", label: "Tubo de cobre, Accesorios, y Accesorios", path: "product/copper-tube-fittings-accessories" },
            { value: "salidas", label: "Salidas", path: "product/gas-outlets" },
            { value: "adaptadores-de-gases-medicinales", label: "Adaptadores de gases medicinales", path: "product/gas-outlets-probes-adapters" },
            { value: "unidad-de-cabecera-de-cama", label: "Unidad de cabecera de cama", path: "product/bed-head-unit" },
            { value: "caja-de-valvulas-de-zona", label: "Caja de válvulas de zona", path: "products/zone-valve-box" },
            { value: "alarmas-de-gases-medicinales", label: "Alarmas de gases medicinales", path: "product/alarms" },
            { value: "estacion-de-regulacion-de-gases-medicinales", label: "Estación de regulación de gases medicinales", path: "product/medical-gas-regulating-station" },
            { value: "valvulas-de-gases-medicinales", label: "Válvulas de gases medicinales", path: "product/medical-gas-valves" },
            { value: "panel-de-control-de-gases", label: "Panel de control de gases", path: "products/gas-control-panel" }
        ]
    },
    {
        value: "equipos-secundarios",
        label: "Equipos Secundarios",
        subcategories: [
            { value: "caudalimetros", label: "Caudalímetros", path: "product/medical-gas-flowmeters" },
            { value: "reguladores-de-oxigeno", label: "Reguladores de oxígeno", path: "product/medical-regulators" },
            { value: "reguladores-de-vacio", label: "Reguladores de vacío", path: "product/vacuum-regulator" },
            { value: "jarra-de-succion", label: "Jarra de Succión", path: "product/suction-jar" },
            { value: "mezclador-de-aire-y-oxigeno", label: "Mezclador de aire y oxígeno", path: "products/air-oxygen-blender" },
            { value: "accesorios-equipos", label: "Accesorios", path: "product/accessories" }
        ]
    },
    {
        value: "quirofano",
        label: "Quirófano",
        subcategories: [
            { value: "colgante-medico", label: "Colgante médico", path: "product/medical-pendant" },
            { value: "lamparas-quirurgicas", label: "Lámparas quirúrgicas", path: "product/surgical-lights" },
            { value: "electric-operating-table", label: "Electric Operating Table", path: "products/electric-operating-table" },
            { value: "panel-de-control-del-teatro-de-operaciones", label: "Panel de control del teatro de operaciones", path: "product/operation-theatre-control-panel" },
            { value: "caja-de-paso-de-sala-limpia", label: "Caja de paso de sala limpia", path: "product/pass-box" },
            { value: "visor-de-pelicula-de-rayos-x-led", label: "Visor de película de rayos X LED", path: "product/led-x-ray-film-viewer" },
            { value: "monitor-de-sala-limpia", label: "Monitor de sala limpia", path: "products/cleanroom-monitor" },
            { value: "stainless-steel-surgical-scrub-sink", label: "Stainless Steel Surgical Scrub Sink", path: "products/stainless-steel-surgical-scrub-sink" },
            { value: "escritorio", label: "Escritorio", path: "products/writing-table" },
            { value: "techo-de-flujo-de-aire-laminar", label: "Techo de flujo de aire laminar", path: "products/laminar-air-flow-ceiling" }
        ]
    },
    {
        value: "sistema-de-llamada-de-enfermera",
        label: "Sistema de llamada de enfermera",
        subcategories: [
            { value: "intelligent-nurse-call-system", label: "Intelligent Nurse Call System", path: "product/nc-a-nurse-call-system" },
            { value: "sistema-de-llamada-de-enfermeria-ip", label: "Sistema de llamada de enfermería IP", path: "product/nc-c-ip-nurse-call-system" },
            { value: "wireless-nurse-call-system", label: "Wireless Nurse Call System", path: "products/wireless-nurse-call-system" }
        ]
    }
];

const SOMA_PARTS_CATEGORIES = [
    {
        value: "bp",
        label: "BP (Blood Pressure)",
        subcategories: [
            { value: "bp-connectors", label: "BP Connectors" },
            { value: "ibp-cables", label: "IBP Cables" },
            { value: "nibp-cuffs", label: "NIBP Cuffs" },
            { value: "nibp-hoses", label: "NIBP Hoses" },
            { value: "tourniquet-cuffs", label: "Tourniquet Cuffs" },
            { value: "tourniquet-hoses", label: "Tourniquet Hoses" }
        ]
    },
    {
        value: "consumables",
        label: "Consumables",
        subcategories: [
            { value: "batteries", label: "Batteries" },
            { value: "blades", label: "Blades" },
            { value: "blankets-sleeves", label: "Blankets & Sleeves" },
            { value: "bulbs", label: "Bulbs" }
        ]
    },
    {
        value: "disposables",
        label: "Disposables",
        subcategories: [
            { value: "aed-defib-pads", label: "AED-Defib Pads" },
            { value: "esu-electrodes", label: "ESU Electrodes" }
        ]
    },
    {
        value: "ecg",
        label: "ECG",
        subcategories: [
            { value: "defib-pacer-cables", label: "Defib-Pacer Cables" },
            { value: "ecg-accessories", label: "ECG Accessories" },
            { value: "ecg-leadwires", label: "ECG Leadwires" },
            { value: "ecg-one-piece-cables", label: "ECG One-Piece Cables" },
            { value: "ecg-trunk-cables", label: "ECG Trunk Cables" }
        ]
    },
    {
        value: "light-cables",
        label: "Light Cables",
        subcategories: [
            { value: "endoscopy-light-cables", label: "Endoscopy Light Cables" },
            { value: "headlight-cables", label: "Headlights & Cables" },
            { value: "light-cables-miscroscopes", label: "Microscopes Light Cables" }
        ]
    },
    {
        value: "mattress",
        label: "Mattress",
        subcategories: [
            { value: "incubators-warmers-pads", label: "Incubators & Warmers Pads" },
            { value: "infant-pads", label: "Infant Pads" },
            { value: "stretcher-mattress", label: "Stretcher Mattress" },
            { value: "surgical-table-pads", label: "Surgical Table Pads" }
        ]
    },
    {
        value: "mounting-solution",
        label: "Mounting Solution",
        subcategories: [
            { value: "iv_poles", label: "IV Poles" },
            { value: "brackets", label: "Mounts & Brackets" },
            { value: "rolling-stands", label: "Rolling Stand/Carts" },
            { value: "wall-mounts", label: "Wall Mounts" }
        ]
    },
    {
        value: "o2-co2",
        label: "O2-Co2",
        subcategories: [
            { value: "canulae", label: "Canulae" },
            { value: "co2-sensors", label: "Co2 Sensors" },
            { value: "others-o2-co2", label: "Others (O2-Co2)" },
            { value: "oxygen-cell", label: "Oxygen Cell" },
            { value: "patient-circuits", label: "Patient Circuits" },
            { value: "water-traps", label: "Water Traps" }
        ]
    },
    {
        value: "paper",
        label: "Paper",
        subcategories: [
            { value: "paper-rolls", label: "Paper Rolls" },
            { value: "z-fold-paper-pack", label: "Z-fold Paper Pack" }
        ]
    },
    {
        value: "product-type",
        label: "Product Type",
        subcategories: [
            { value: "aed-defibs", label: "AED & Defibs" },
            { value: "anesthesia-vents", label: "Anesthesia-Vents" },
            { value: "ekg-accessories", label: "EKG-Stress Test" },
            { value: "esu-accessories", label: "ESU Accessories" },
            { value: "fetal-monitor", label: "Fetal Monitor" },
            { value: "patient-monitor", label: "Patient Monitor" },
            { value: "stretchers-acc", label: "Stretchers Acc" },
            { value: "surgical-table-accessories", label: "Surgical Table Accessories" },
            { value: "tourniquet", label: "Tourniquet Accessories" }
        ]
    },
    {
        value: "repair-parts",
        label: "Repair Parts",
        subcategories: [
            { value: "circuit-boards", label: "Circuit Boards" },
            { value: "display-touch-screen", label: "Display & Touch Screen" },
            { value: "keypads-overlays", label: "KeyPads & Overlays" },
            { value: "parameter-modules", label: "Parameter Modules" },
            { value: "rollers-belts", label: "Rollers & Belts" },
            { value: "wheels-casters", label: "Wheels & Casters" }
        ]
    },
    {
        value: "spo2",
        label: "Spo2",
        subcategories: [
            { value: "spo2-accessories", label: "SpO2 Accessories" },
            { value: "spo2-cables", label: "SpO2 Cables" },
            { value: "spo2-one-piece-sensors", label: "SpO2 One-Piece Sensors" },
            { value: "spo2-sensors", label: "SpO2 Sensors" }
        ]
    },
    {
        value: "temp",
        label: "Temp",
        subcategories: [
            { value: "temp-cables-adapters", label: "Temp Cables & Adapters" },
            { value: "temperature-sensors", label: "Temperature Sensors" }
        ]
    },
    {
        value: "others",
        label: "Others",
        subcategories: [
            { value: "cables-harness", label: "Cables & Harness" },
            { value: "cylinders", label: "Cylinders" },
            { value: "foot-switches", label: "Foot Switches" },
            { value: "hand-control", label: "Hand Control" },
            { value: "hoses", label: "Hoses" },
            { value: "power-supply-cords", label: "Power Supply & Cords" },
            { value: "regulators", label: "Regulators" }
        ]
    }
];

interface Review {
    id: string;
    author: string;
    rating: number;
    text: string;
    avatar: string;
    date: string;
}

interface Section {
    id: string;
    name: string;
    visible: boolean;
}

interface LandingSettings {
    whatsappNumbers?: string[];
    contactEmails?: string[];
    topbarEmail?: string;
    physicalAddress?: string;
    workingHours?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    quoteWhatsappNumber?: string;
    quoteEmail?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoImage?: string;
    googleSearchConsole?: string;
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    customHeaderScripts?: string;
    activeTheme?: string;
    allowScrapedProducts?: boolean;
    defaultScrapedStock?: number;
    hideRealInventory?: boolean;
}

interface GestionWebClientProps {
    initialMaintenanceMode: boolean;
    initialReviews: Review[];
    initialSections: Section[];
    initialLandingSettings: LandingSettings;
}

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

export default function GestionWebClient({
    initialMaintenanceMode,
    initialReviews,
    initialSections,
    initialLandingSettings
}: GestionWebClientProps) {
    const [activeTab, setActiveTab] = useState<'status' | 'sections' | 'reviews' | 'inventory' | 'general' | 'seo' | 'contacts' | 'activity' | 'themes' | 'scraper'>('status');
    const [maintenanceMode, setMaintenanceMode] = useState(initialMaintenanceMode);
    const [sections, setSections] = useState<Section[]>(initialSections);
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [landingSettings, setLandingSettings] = useState<LandingSettings>(initialLandingSettings);
    
    // Inventory Image editing states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);
    const [itemImageUrls, setItemImageUrls] = useState<Record<string, string>>({});
    const [itemWebTitles, setItemWebTitles] = useState<Record<string, string>>({});
    const [itemWebDescriptions, setItemWebDescriptions] = useState<Record<string, string>>({});
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [sourceFilter, setSourceFilter] = useState<'all' | 'scraped' | 'own'>('all');
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    // Review editing states
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [newReviewAuthor, setNewReviewAuthor] = useState('');
    const [newReviewText, setNewReviewText] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(5);
    const [newReviewDate, setNewReviewDate] = useState('Hace 1 semana');

    // Saving indicators
    const [saving, setSaving] = useState(false);

    // Web Contacts states
    const [contacts, setContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [contactFilter, setContactFilter] = useState<'ALL' | 'PENDIENTE' | 'LEIDO' | 'CONTACTADO' | 'ARCHIVADO'>('ALL');
    const [selectedContact, setSelectedContact] = useState<any | null>(null);

    // Live Traffic states
    const [trafficLogs, setTrafficLogs] = useState<any[]>([]);
    const [activeCount, setActiveCount] = useState(0);
    const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
    const [topPages, setTopPages] = useState<any[]>([]);
    const [loadingTraffic, setLoadingTraffic] = useState(false);
    const [simulatingChat, setSimulatingChat] = useState<any | null>(null);
    const [chatMsgText, setChatMsgText] = useState('¡Hola! Vemos que estás buscando soluciones médicas en nuestro portal. ¿Te gustaría chatear con un asesor especializado ahora mismo?');

    // Scraper streaming progress states
    const [isImporting, setIsImporting] = useState(false);
    const [progressCurrent, setProgressCurrent] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [importedCategorySlug, setImportedCategorySlug] = useState<string | null>(null);
    const [importedCategoryName, setImportedCategoryName] = useState<string | null>(null);
    const [scraperLogs, setScraperLogs] = useState<string[]>([
        '[SISTEMA] Listo para iniciar extracción...',
        '[SISTEMA] Servidor R2 configurado: OK',
        '[SISTEMA] PostgreSQL conectado: OK',
        '[SISTEMA] Selecciona una categoría y haz clic en "Comenzar Importación".'
    ]);
    const logContainerRef = React.useRef<HTMLDivElement>(null);
    const [scraperSource, setScraperSource] = useState<'soma-tech' | 'soma-parts' | 'pukang' | 'joson' | 'aerti' | 'dre' | 'amcaremed' | 'rd-batteries'>('soma-tech');
    const [selectedScrapeCategory, setSelectedScrapeCategory] = useState<string>('all');
    const [importedCategories, setImportedCategories] = useState<string[]>([]);
    const [categorySearch, setCategorySearch] = useState<string>('');
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [categoryViewMode, setCategoryViewMode] = useState<'cards' | 'list'>('cards');

    const fetchImportedCategories = async () => {
        try {
            const res = await getImportedCategories();
            if (res.success && res.categories) {
                setImportedCategories(res.categories);
            }
        } catch (err) {
            console.error('Error fetching imported categories:', err);
        }
    };

    // Load imported categories on mount
    useEffect(() => {
        fetchImportedCategories();
    }, []);

    const handleDeleteCategory = async (categoryName: string) => {
        const confirmMsg = `¿Estás seguro de que deseas eliminar la categoría "${categoryName}"? Todos los productos asociados a ella pasarán a estar "Sin Categorizar" y la categoría dejará de mostrarse en los menús de la web.`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await deleteWebCategory(categoryName);
            if (res.success) {
                toast.success('Categoría eliminada con éxito');
                setSelectedCats(prev => prev.filter(c => c !== categoryName));
                fetchImportedCategories();
            } else {
                toast.error(res.error || 'Error al eliminar la categoría');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    const handleDeleteSelectedCategories = async () => {
        if (selectedCats.length === 0) return;
        const confirmMsg = `¿Estás seguro de que deseas eliminar las ${selectedCats.length} categorías seleccionadas? Todos los productos asociados a ellas pasarán a estar "Sin Categorizar" y dejarán de mostrarse en la web pública.`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await deleteWebCategoriesBulk(selectedCats);
            if (res.success) {
                toast.success('Categorías seleccionadas eliminadas con éxito');
                setSelectedCats([]);
                fetchImportedCategories();
            } else {
                toast.error(res.error || 'Error al eliminar las categorías');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    const getExternalCategoryUrl = () => {
        if (scraperSource === 'soma-tech') {
            if (selectedScrapeCategory === 'all') {
                return 'https://www.somatechnology.com/spanish/';
            }
            const label = SOMA_CATEGORIES.find(c => c.value === selectedScrapeCategory)?.label || '';
            return `https://www.somatechnology.com/spanish/?s=${encodeURIComponent(label)}`;
        } else if (scraperSource === 'pukang') {
            if (selectedScrapeCategory === 'all') {
                return 'https://es.pukangmed.com/products.html';
            }
            return `https://es.pukangmed.com/${selectedScrapeCategory}.html`;
        } else if (scraperSource === 'joson') {
            if (selectedScrapeCategory === 'all') {
                return 'https://www.joson-care.com/product.php?lang=es&tb=1';
            }
            const JOSON_CID_MAP: Record<string, number> = {
                "cama-uci": 501,
                "cama-hospital": 502,
                "cama-hospital-manual": 503,
                "camilla-emergencia": 504,
                "cama-pediatrica": 505,
                "cama-cuidados-hogar": 506,
                "equipo-medico-sala": 507
            };
            const cid = JOSON_CID_MAP[selectedScrapeCategory] || 501;
            return `https://www.joson-care.com/product.php?lang=es&tb=1&cid=${cid}`;
        } else if (scraperSource === 'aerti') {
            if (selectedScrapeCategory === 'all') {
                return 'https://es.aertioxygen.com/products';
            }
            const path = AERTI_CATEGORIES.find(c => c.value === selectedScrapeCategory)?.path || '';
            return `https://es.aertioxygen.com/product-list/${path}`;
        } else if (scraperSource === 'dre') {
            if (selectedScrapeCategory === 'all') {
                return 'https://dremed.com/';
            }
            const slugMap: Record<string, string> = {
                "anestesia": "surgery-procedures/anesthesia",
                "aspiradores-succion": "surgery-procedures/aspirators-suction-pumps",
                "electrocirugia": "surgery-procedures/electrosurgical-power-generators",
                "endoscopia-laparoscopia": "surgery-procedures/endoscopy-laparoscopy",
                "lamparas-quirurgicas": "surgery-procedures/lights",
                "microscopios": "surgery-procedures/microscopes",
                "mobiliario-quirofano": "surgery-procedures/or-furniture",
                "motores-quirurgicos": "surgery-procedures/power-instruments",
                "sillones-procedimiento": "surgery-procedures/procedure-chairs",
                "camillas-quirurgicas": "patient-care-diagnostics/stretchers",
                "compresion-secuencial": "surgery-procedures/sequential-compression-devices",
                "esterilizacion-autoclaves": "surgery-procedures/sterile-processing",
                "instrumental-quirurgico": "surgery-procedures/surgical-instruments",
                "mesas-quirurgicas": "surgery-procedures/tables-surgical",
                "sistemas-torniquete": "surgery-procedures/tourniquets-systems",
                "camas-hospital": "patient-care-diagnostics/hospital-beds",
                "cunas-incubadoras": "patient-care-diagnostics/neonatal-care",
                "desfibriladores": "patient-monitoring/aeds-defibrillators",
                "electrocardiografos": "patient-monitoring/electrocardiogram-ecg-ekg",
                "monitores-fetal": "patient-care-diagnostics/neonatal-care/fetal-monitor",
                "monitores-paciente": "patient-monitoring/patient-monitors",
                "mesas-imagenologia": "imaging/imaging-tables",
                "ultrasonidos": "imaging/ultrasounds"
            };
            const path = slugMap[selectedScrapeCategory] || '';
            return `https://dremed.com/product-category/${path}/`;
        } else if (scraperSource === 'amcaremed') {
            if (selectedScrapeCategory === 'all') {
                return 'https://amcaremed.com/product-center/?lang=es';
            }
            const group = AMCAREMED_CATEGORIES.find(g => g.value === selectedScrapeCategory);
            if (group) {
                return 'https://amcaremed.com/product-center/?lang=es';
            }
            for (const g of AMCAREMED_CATEGORIES) {
                const sub = g.subcategories.find(s => s.value === selectedScrapeCategory);
                if (sub) {
                    return `https://amcaremed.com/${sub.path}/?lang=es`;
                }
            }
            return 'https://amcaremed.com/product-center/?lang=es';
        } else if (scraperSource === 'rd-batteries') {
            if (selectedScrapeCategory === 'all') {
                return 'https://www.rdbatteries.com/batteries/medical';
            }
            const path = RD_CATEGORIES.find(c => c.value === selectedScrapeCategory)?.path || '';
            return `https://www.rdbatteries.com${path}`;
        } else {
            if (selectedScrapeCategory === 'all') {
                return 'https://somamedicalparts.com/';
            }
            return `https://somamedicalparts.com/product-category/${selectedScrapeCategory}/`;
        }
    };

    const categoryImportStatus = (() => {
        if (selectedScrapeCategory === 'all') {
            return { isImported: false, label: '', href: '' };
        }
        
        let label = '';
        let isImported = false;
        
        if (scraperSource === 'soma-tech') {
            const found = SOMA_CATEGORIES.find(c => c.value === selectedScrapeCategory);
            if (found) {
                label = found.label;
                isImported = importedCategories.includes(found.label);
            }
        } else if (scraperSource === 'pukang') {
            const found = PUKANG_CATEGORIES.find(c => c.value === selectedScrapeCategory);
            if (found) {
                label = found.label;
                isImported = importedCategories.includes(found.label);
            }
        } else if (scraperSource === 'joson') {
            const found = JOSON_CATEGORIES.find(c => c.value === selectedScrapeCategory);
            if (found) {
                label = found.label;
                isImported = importedCategories.includes(found.label);
            }
        } else if (scraperSource === 'aerti') {
            const found = AERTI_CATEGORIES.find(c => c.value === selectedScrapeCategory);
            if (found) {
                label = found.label;
                isImported = importedCategories.includes(found.label);
            }
        } else if (scraperSource === 'dre') {
            const found = DRE_CATEGORIES.find(c => c.value === selectedScrapeCategory);
            if (found) {
                label = found.label;
                isImported = importedCategories.includes(found.label);
            }
        } else if (scraperSource === 'amcaremed') {
            for (const group of AMCAREMED_CATEGORIES) {
                if (group.value === selectedScrapeCategory) {
                    label = group.label;
                    isImported = importedCategories.includes(group.label);
                    break;
                }
                if (group.subcategories) {
                    const foundSub = group.subcategories.find(sub => sub.value === selectedScrapeCategory);
                    if (foundSub) {
                        label = foundSub.label;
                        isImported = importedCategories.includes(foundSub.label);
                        break;
                    }
                }
            }
        } else if (scraperSource === 'rd-batteries') {
            const found = RD_CATEGORIES.find(c => c.value === selectedScrapeCategory);
            if (found) {
                label = found.label;
                isImported = importedCategories.includes(found.label);
            }
        } else {
            for (const group of SOMA_PARTS_CATEGORIES) {
                if (group.value === selectedScrapeCategory) {
                    label = group.label;
                    isImported = importedCategories.includes(group.label);
                    break;
                }
                if (group.subcategories) {
                    const foundSub = group.subcategories.find(sub => sub.value === selectedScrapeCategory);
                    if (foundSub) {
                        label = foundSub.label;
                        isImported = importedCategories.includes(foundSub.label);
                        break;
                    }
                }
            }
        }
        
        const href = isImported
            ? `/productos?category=${encodeURIComponent(label)}${scraperSource === 'soma-parts' ? '&type=producto' : ''}`
            : '';
            
        return { isImported, label, href };
    })();

    // Auto-scroll the scraper console log when log changes (locally scrolling ONLY the terminal container, preventing global page scroll jumps)
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [scraperLogs]);

    // Close lightbox on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxImageUrl(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Load contacts when tab active
    useEffect(() => {
        if (activeTab === 'contacts') {
            fetchContacts();
        }
    }, [activeTab]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await getWebContacts();
            if (res.success && res.contacts) {
                setContacts(res.contacts);
            } else {
                toast.error(res.error || 'Error al cargar contactos');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleUpdateContactStatus = async (id: string, newStatus: string) => {
        try {
            const res = await updateContactStatus(id, newStatus);
            if (res.success && res.contact) {
                setContacts(prev => prev.map(c => c.id === id ? res.contact : c));
                if (selectedContact?.id === id) {
                    setSelectedContact(res.contact);
                }
                toast.success(`Estado actualizado a ${newStatus}`);
            } else {
                toast.error(res.error || 'Error al actualizar estado');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar permanentemente este contacto?')) return;
        try {
            const res = await deleteWebContact(id);
            if (res.success) {
                setContacts(prev => prev.filter(c => c.id !== id));
                if (selectedContact?.id === id) {
                    setSelectedContact(null);
                }
                toast.success('Contacto eliminado con éxito');
            } else {
                toast.error(res.error || 'Error al eliminar contacto');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    // Live Traffic polling
    useEffect(() => {
        let interval: any;
        if (activeTab === 'activity') {
            fetchTraffic();
            interval = setInterval(() => {
                fetchTraffic(true); // silent fetch in background
            }, 10000); // every 10 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    const fetchTraffic = async (silent = false) => {
        if (!silent) setLoadingTraffic(true);
        try {
            const res = await getWebTraffic(15);
            if (res.success) {
                setTrafficLogs(res.logs || []);
                setActiveCount(res.activeCount || 0);
                setActiveVisitors(res.activeVisitors || []);
                setTopPages(res.topPages || []);
            }
        } catch (e) {
            console.error('Error fetching traffic:', e);
        } finally {
            if (!silent) setLoadingTraffic(false);
        }
    };

    // --- Tab 1: Maintenance Switcher ---
    const handleToggleMaintenance = async () => {
        const confirmMsg = maintenanceMode 
            ? '¿Estás seguro de desactivar el modo mantenimiento? El sitio web será visible al público.'
            : '¿Estás seguro de activar el modo mantenimiento? El público verá un aviso de "Sitio en Construcción".';
            
        if (!confirm(confirmMsg)) return;

        try {
            const nextMode = !maintenanceMode;
            setMaintenanceMode(nextMode);
            const res = await saveMaintenanceMode(nextMode);
            if (res.success) {
                toast.success(nextMode ? 'Modo mantenimiento activado' : 'Sitio web publicado con éxito');
            } else {
                setMaintenanceMode(!nextMode);
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    // --- Tab Scraper: Async Streaming Scraper Handler ---
    const handleStartScrape = async () => {
        const cat = selectedScrapeCategory;
        setIsImporting(true);
        setProgressCurrent(0);
        setProgressTotal(0);
        setImportedCategorySlug(null);
        setScraperLogs([`[SISTEMA] Iniciando conexión con el endpoint del scraper para ${scraperSource === 'soma-tech' ? 'Soma Tech' : scraperSource === 'pukang' ? 'Pukang Medical' : scraperSource === 'joson' ? 'Joson Care' : scraperSource === 'aerti' ? 'Aerti Oxygen' : scraperSource === 'dre' ? 'DRE Medical' : scraperSource === 'amcaremed' ? 'AmcareMed' : scraperSource === 'rd-batteries' ? 'R&D Batteries' : 'Soma Medical Parts'}...`]);
        
        try {
            const endpoint = scraperSource === 'soma-tech' 
                ? '/api/admin/scrape-soma' 
                : scraperSource === 'pukang'
                    ? '/api/admin/scrape-pukang'
                    : scraperSource === 'joson'
                        ? '/api/admin/scrape-joson'
                        : scraperSource === 'aerti'
                            ? '/api/admin/scrape-aerti'
                            : scraperSource === 'dre'
                                ? '/api/admin/scrape-dre'
                                : scraperSource === 'amcaremed'
                                    ? '/api/admin/scrape-amcaremed'
                                    : scraperSource === 'rd-batteries'
                                        ? '/api/admin/scrape-rd'
                                        : '/api/admin/scrape-soma-parts';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: cat })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `Error de servidor: ${res.status}`);
            }

            const reader = res.body?.getReader();
            if (!reader) {
                throw new Error('No se pudo establecer comunicación con el stream de datos del servidor.');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'status') {
                            setScraperLogs(prev => [...prev, `[SISTEMA] ${data.message}`]);
                        } else if (data.type === 'info') {
                            setProgressTotal(data.total);
                            setScraperLogs(prev => [...prev, `[SISTEMA] ${data.message}`]);
                        } else if (data.type === 'progress') {
                            setProgressCurrent(data.current);
                            if (data.total) setProgressTotal(data.total);
                            setScraperLogs(prev => [...prev, `[PROCESADO] (${data.current}/${data.total}) - ${data.product}`]);
                        } else if (data.type === 'success') {
                            setScraperLogs(prev => [
                                ...prev, 
                                `[ÉXITO] Extracción finalizada. Total de la categoría: ${data.total}, Nuevos productos importados: ${data.count}.`
                            ]);
                            toast.success(`Importación finalizada. Nuevos importados: ${data.count}`);
                            setImportedCategorySlug(cat);
                            fetchImportedCategories(); // Update checkmarks
                            
                            // Resolve readable category name for web redirection
                            let catLabel = 'Todas las Categorías';
                            if (cat !== 'all') {
                                if (scraperSource === 'soma-tech') {
                                    const found = SOMA_CATEGORIES.find(c => c.value === cat);
                                    catLabel = found ? found.label : cat;
                                } else if (scraperSource === 'pukang') {
                                    const found = PUKANG_CATEGORIES.find(c => c.value === cat);
                                    catLabel = found ? found.label : cat;
                                } else if (scraperSource === 'joson') {
                                    const found = JOSON_CATEGORIES.find(c => c.value === cat);
                                    catLabel = found ? found.label : cat;
                                } else if (scraperSource === 'aerti') {
                                    const found = AERTI_CATEGORIES.find(c => c.value === cat);
                                    catLabel = found ? found.label : cat;
                                } else if (scraperSource === 'dre') {
                                    const found = DRE_CATEGORIES.find(c => c.value === cat);
                                    catLabel = found ? found.label : cat;
                                } else if (scraperSource === 'amcaremed') {
                                    for (const group of AMCAREMED_CATEGORIES) {
                                        if (group.value === cat) {
                                            catLabel = group.label;
                                            break;
                                        }
                                        const sub = group.subcategories.find(s => s.value === cat);
                                        if (sub) {
                                            catLabel = sub.label;
                                            break;
                                        }
                                    }
                                } else if (scraperSource === 'rd-batteries') {
                                    const found = RD_CATEGORIES.find(c => c.value === cat);
                                    catLabel = found ? found.label : cat;
                                } else {
                                    for (const group of SOMA_PARTS_CATEGORIES) {
                                        if (group.value === cat) {
                                            catLabel = group.label;
                                            break;
                                        }
                                        if (group.subcategories) {
                                            const foundSub = group.subcategories.find(sub => sub.value === cat);
                                            if (foundSub) {
                                                catLabel = foundSub.label;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            setImportedCategoryName(catLabel);
                        } else if (data.type === 'error') {
                            setScraperLogs(prev => [...prev, `[ERROR] ${data.error}`]);
                            toast.error(`Error de importación: ${data.error}`);
                        }
                    } catch (e) {
                        console.error('Error parsing NDJSON chunk:', e);
                    }
                }
            }
        } catch (e: any) {
            setScraperLogs(prev => [...prev, `[ERROR] Conexión fallida: ${e.message}`]);
            toast.error(`Error: ${e.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    // --- Tab 2: HTML5 Drag & Drop for Section Ordering ---
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;
        
        const updated = [...sections];
        const [draggedItem] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, draggedItem);
        
        setSections(updated);
        setDraggedIndex(null);
    };

    const toggleSectionVisibility = (index: number) => {
        const updated = [...sections];
        updated[index] = { ...updated[index], visible: !updated[index].visible };
        setSections(updated);
    };

    const saveSectionsOrder = async () => {
        setSaving(true);
        try {
            const res = await saveLandingSections(sections);
            if (res.success) {
                toast.success('Orden de secciones guardado');
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Tab 3: Google Reviews Manager ---
    const handleAddReview = () => {
        if (!newReviewAuthor || !newReviewText) {
            toast.error('Nombre y texto son requeridos');
            return;
        }

        const newReview: Review = {
            id: editingReview?.id || `rev-${Date.now()}`,
            author: newReviewAuthor,
            rating: newReviewRating,
            text: newReviewText,
            avatar: editingReview?.avatar || 'https://i.ibb.co/L8xY7hS/avatar-placeholder.png',
            date: newReviewDate
        };

        let updatedReviews = [...reviews];
        if (editingReview) {
            updatedReviews = updatedReviews.map(r => r.id === editingReview.id ? newReview : r);
            setEditingReview(null);
            toast.success('Reseña actualizada');
        } else {
            updatedReviews.push(newReview);
            toast.success('Reseña agregada');
        }

        setReviews(updatedReviews);
        setNewReviewAuthor('');
        setNewReviewText('');
        setNewReviewRating(5);
        setNewReviewDate('Hace 1 semana');
    };

    const handleEditReviewClick = (review: Review) => {
        setEditingReview(review);
        setNewReviewAuthor(review.author);
        setNewReviewText(review.text);
        setNewReviewRating(review.rating);
        setNewReviewDate(review.date);
    };

    const handleDeleteReview = (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta reseña?')) return;
        const updated = reviews.filter(r => r.id !== id);
        setReviews(updated);
        toast.success('Reseña eliminada temporalmente de la lista local (recuerda Guardar)');
    };

    const saveReviewsToDb = async () => {
        setSaving(true);
        try {
            const res = await saveGoogleReviews(reviews);
            if (res.success) {
                toast.success('Reseñas de Google guardadas en la BD');
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Tab 4: Web Inventory Image Manager ---
    const loadInventory = async (page: number, query: string, filterVal: 'all' | 'scraped' | 'own' = sourceFilter) => {
        setLoadingSearch(true);
        try {
            const res = await getPaginatedInventoryItems(page, 10, query, filterVal);
            if (res.success && res.items) {
                setSearchResults(res.items);
                setTotalPages(res.totalPages || 1);
                
                // Initialize text inputs
                const urls: Record<string, string> = {};
                const titles: Record<string, string> = {};
                const descriptions: Record<string, string> = {};
                
                res.items.forEach((item: any) => {
                    urls[item.id] = item.imagenWeb || '';
                    titles[item.id] = item.tituloWeb || '';
                    descriptions[item.id] = item.descripcionWeb || '';
                });
                
                setItemImageUrls(urls);
                setItemWebTitles(titles);
                setItemWebDescriptions(descriptions);
            } else {
                toast.error(res.error || 'Error al cargar el catálogo');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        } finally {
            setLoadingSearch(false);
        }
    };

    // Parse editItem query param on mount to auto-open product modal
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const editItemId = searchParams.get('editItem');
        
        if (editItemId) {
            const fetchAndOpen = async () => {
                const toastId = toast.loading('Cargando ficha de edición...');
                try {
                    const res = await getInventoryItemById(editItemId);
                    if (res.success && res.item) {
                        // Switch to the Web Catalog tab
                        setActiveTab('inventory');
                        
                        // Prefill customizable fields state
                        setItemImageUrls(prev => ({ ...prev, [res.item.id]: res.item.imagenWeb || '' }));
                        setItemWebTitles(prev => ({ ...prev, [res.item.id]: res.item.tituloWeb || '' }));
                        setItemWebDescriptions(prev => ({ ...prev, [res.item.id]: res.item.descripcionWeb || '' }));
                        
                        // Select the item to trigger edit modal
                        setSelectedItem(res.item);
                        toast.success('Ficha de edición abierta', { id: toastId });
                    } else {
                        toast.error(res.error || 'No se pudo cargar el producto', { id: toastId });
                    }
                } catch (e: any) {
                    toast.error(e.message || 'Error al conectar con el servidor', { id: toastId });
                } finally {
                    // Clean URL query parameters
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, '', cleanUrl);
                }
            };
            
            fetchAndOpen();
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'inventory') {
            loadInventory(currentPage, searchQuery, sourceFilter);
        }
    }, [activeTab, currentPage, sourceFilter]);

    const handleSearchInventory = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        loadInventory(1, searchQuery, sourceFilter);
    };

    const handleClearInventorySearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
        loadInventory(1, '', sourceFilter);
    };

    const handleSourceFilterChange = (filterVal: 'all' | 'scraped' | 'own') => {
        setSourceFilter(filterVal);
        setCurrentPage(1);
        loadInventory(1, searchQuery, filterVal);
    };

    const handleSaveItemWebFields = async (id: string, type: 'activo' | 'producto') => {
        setUpdatingImageId(id);
        const imagenWeb = itemImageUrls[id] || '';
        const tituloWeb = itemWebTitles[id] || '';
        const descripcionWeb = itemWebDescriptions[id] || '';
        
        try {
            const res = await updateItemWebFields(id, type, { imagenWeb, tituloWeb, descripcionWeb });
            if (res.success) {
                toast.success('Datos comerciales de la web guardados');
                setSearchResults(prev => prev.map(item => 
                    item.id === id 
                        ? { ...item, imagenWeb, tituloWeb, descripcionWeb } 
                        : item
                ));
            } else {
                toast.error(res.error || 'Error al actualizar datos');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        } finally {
            setUpdatingImageId(null);
        }
    };

    const handleDeleteItem = async (id: string, type: 'activo' | 'producto', name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${name}"? Esta acción no se puede deshacer.`)) {
            return false;
        }

        const toastId = toast.loading('Eliminando producto...');
        try {
            const res = await deleteInventoryItem(id, type);
            if (res.success) {
                toast.success('Producto eliminado con éxito', { id: toastId });
                // Remove from local search results state so it disappears from UI immediately
                setSearchResults(prev => prev.filter(item => item.id !== id));
                return true;
            } else {
                toast.error(res.error || 'Error al eliminar producto', { id: toastId });
                return false;
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión', { id: toastId });
            return false;
        }
    };

    const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            // Si es menor a 5MB, no comprimir para evitar procesamiento innecesario y conservar detalle
            if (file.size < 5 * 1024 * 1024) {
                resolve(file);
                return;
            }

            let objectUrl: string | null = null;
            try {
                objectUrl = URL.createObjectURL(file);
                const img = new Image();
                img.src = objectUrl;

                img.onload = () => {
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        objectUrl = null;
                    }

                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(file);
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // Extract extension name and swap with webp
                                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                                const compressedFile = new File(
                                    [blob], 
                                    `${nameWithoutExt}.webp`, 
                                    { type: 'image/webp', lastModified: Date.now() }
                                );
                                
                                // Safeguard: If the original file is already smaller than the compressed version, keep the original
                                if (file.size > 0 && compressedFile.size >= file.size) {
                                    resolve(file);
                                } else {
                                    resolve(compressedFile);
                                }
                            } else {
                                resolve(file);
                            }
                        },
                        'image/webp',
                        quality
                    );
                };
                img.onerror = () => {
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        objectUrl = null;
                    }
                    resolve(file);
                };
            } catch (err) {
                console.error("Error compressing web catalog image:", err);
                if (objectUrl) {
                    try {
                        URL.revokeObjectURL(objectUrl);
                    } catch {}
                }
                resolve(file);
            }
        });
    };

    const handleUploadFile = async (id: string, file: File) => {
        if (!file) return;
        setUploadingItemId(id);
        const toastId = toast.loading('Optimizando y subiendo imagen...');
        
        try {
            // Compress the image before uploading to R2
            const optimizedFile = await compressImage(file);
            
            const formData = new FormData();
            formData.append('file', optimizedFile);
            formData.append('fileName', optimizedFile.name);
            
            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al subir archivo');
            }
            
            const data = await res.json();
            const url = data.publicUrl || data.url;
            
            if (url) {
                setItemImageUrls(prev => ({ ...prev, [id]: url }));
                toast.success('Imagen subida con éxito', { id: toastId });
            } else {
                throw new Error('No se recibió la URL pública de la imagen');
            }
        } catch (e: any) {
            console.error('Error uploading file:', e);
            toast.error(e.message || 'Error al subir la imagen', { id: toastId });
        } finally {
            setUploadingItemId(null);
        }
    };

    const handlePasteImage = async (id: string, event: React.ClipboardEvent<any>) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    event.preventDefault();
                    const extension = file.name.split('.').pop() || 'png';
                    const customFile = new File([file], `paste-${id}-${Date.now()}.${extension}`, { type: file.type });
                    handleUploadFile(id, customFile);
                    break;
                }
            }
        }
    };

    // --- Tab 5: General Landing Settings ---
    const handleSaveGeneralSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await saveLandingSettings(landingSettings);
            if (res.success) {
                toast.success('Configuraciones generales guardadas');
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGeneralFieldChange = (key: keyof LandingSettings, value: string | string[]) => {
        setLandingSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Sidebar Tabs */}
            <div className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm md:col-span-1">
                <button
                    onClick={() => setActiveTab('status')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'status' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Settings size={18} />
                    <span>Mantenimiento</span>
                </button>
                <button
                    onClick={() => setActiveTab('sections')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'sections' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <LayoutGrid size={18} />
                    <span>Secciones Web</span>
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'reviews' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <MessageSquare size={18} />
                    <span>Reseñas de Google</span>
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'inventory' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <ImageIcon size={18} />
                    <span>Imágenes de Equipos</span>
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'general' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Smartphone size={18} />
                    <span>Configuración General</span>
                </button>
                <button
                    onClick={() => setActiveTab('seo')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'seo' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Search size={18} />
                    <span>Configuración SEO</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'contacts' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <Users size={18} />
                        <span>Contactos de Cotización</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'activity' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <Activity size={18} />
                        <span>Actividad en Vivo</span>
                    </div>
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                    onClick={() => setActiveTab('themes')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'themes' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <LayoutGrid size={18} />
                    <span>Temas de la Web</span>
                </button>
                <button
                    onClick={() => setActiveTab('scraper')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'scraper' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Activity size={18} />
                    <span>Importador Catálogo</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-3 overflow-hidden">
                
                {/* TAB 1: Maintenance Status */}
                {activeTab === 'status' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Estado de la Página Web</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Controla si el público puede acceder a la web o si ve el aviso de mantenimiento.</p>
                        </div>

                        <div className="p-5 border rounded-2xl flex items-center justify-between gap-6 transition-colors bg-slate-50">
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm text-slate-900">
                                    {maintenanceMode ? 'Modo Mantenimiento Activo' : 'Sitio Web Público Activo'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {maintenanceMode 
                                        ? 'Actualmente los usuarios que visitan bioelectronicahn.com ven la pantalla de "Nueva experiencia digital en camino" y no pueden navegar por el catálogo.' 
                                        : 'El catálogo y servicios están abiertos y accesibles para todos los visitantes.'}
                                </p>
                            </div>
                            <button
                                onClick={handleToggleMaintenance}
                                className="shrink-0 transition-transform active:scale-95"
                                aria-label="Toggle Maintenance Mode"
                            >
                                {maintenanceMode ? (
                                    <ToggleLeft className="text-slate-400 w-16 h-10 stroke-[1.2]" />
                                ) : (
                                    <ToggleRight className="text-green-600 w-16 h-10 stroke-[1.2]" />
                                )}
                            </button>
                        </div>

                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex gap-3 text-xs text-blue-800">
                            <AlertCircle className="shrink-0" size={16} />
                            <div>
                                <span className="font-semibold">Nota:</span> El acceso al ERP (sistema.bioelectronicahn.com) no se ve afectado por el modo mantenimiento y siempre estará disponible para el personal técnico y administrativo.
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Drag & Drop Sections */}
                {activeTab === 'sections' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Orden de Secciones (Home)</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Arrastra y suelta para reordenar las secciones de la página de inicio, o desactiva su visualización pública.</p>
                            </div>
                            <button
                                onClick={saveSectionsOrder}
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Orden'}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {sections.map((section, idx) => (
                                <div
                                    key={section.id}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={() => handleDrop(idx)}
                                    className={`flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm transition-all duration-150 ${
                                        draggedIndex === idx 
                                            ? 'opacity-40 border-dashed border-brand-500 bg-brand-50/30' 
                                            : 'hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="cursor-grab active:cursor-grabbing text-slate-400 p-1 hover:bg-slate-100 rounded-lg">
                                            <ArrowUpDown size={16} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm text-slate-800">{section.name}</span>
                                            <span className="text-[10px] text-slate-400 block font-mono">ID: {section.id}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleSectionVisibility(idx)}
                                            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                                                section.visible
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            {section.visible ? (
                                                <>
                                                    <Eye size={14} />
                                                    <span>Visible</span>
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff size={14} />
                                                    <span>Oculto</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 3: Google Reviews Manager */}
                {activeTab === 'reviews' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Reseñas de Google (Slider)</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Administra las opiniones destacadas. Puedes agregarlas manualmente o editarlas antes de integrarlas con la API de Google.</p>
                            </div>
                            <button
                                onClick={saveReviewsToDb}
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar en BD'}
                            </button>
                        </div>

                        {/* Reviews Input Form */}
                        <div className="p-4 border border-slate-200 rounded-2xl space-y-4 bg-slate-50/50">
                            <h3 className="font-bold text-sm text-slate-800">
                                {editingReview ? 'Editar Reseña Seleccionada' : 'Agregar Nueva Reseña'}
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Autor</label>
                                    <input 
                                        type="text" 
                                        value={newReviewAuthor}
                                        onChange={(e) => setNewReviewAuthor(e.target.value)}
                                        placeholder="Ej: Carla Portillo"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fecha / Tiempo</label>
                                    <input 
                                        type="text" 
                                        value={newReviewDate}
                                        onChange={(e) => setNewReviewDate(e.target.value)}
                                        placeholder="Ej: Hace 3 semanas"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calificación (Estrellas)</label>
                                    <select
                                        value={newReviewRating}
                                        onChange={(e) => setNewReviewRating(Number(e.target.value))}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    >
                                        <option value={5}>⭐⭐⭐⭐⭐ (5 Estrellas)</option>
                                        <option value={4}>⭐⭐⭐⭐ (4 Estrellas)</option>
                                        <option value={3}>⭐⭐⭐ (3 Estrellas)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Comentario</label>
                                <textarea 
                                    value={newReviewText}
                                    onChange={(e) => setNewReviewText(e.target.value)}
                                    placeholder="Opinión del cliente..."
                                    rows={3}
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                {editingReview && (
                                    <button 
                                        onClick={() => {
                                            setEditingReview(null);
                                            setNewReviewAuthor('');
                                            setNewReviewText('');
                                            setNewReviewRating(5);
                                            setNewReviewDate('Hace 1 semana');
                                        }}
                                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button 
                                    onClick={handleAddReview}
                                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                                >
                                    <Plus size={14} />
                                    <span>{editingReview ? 'Actualizar Reseña' : 'Añadir Reseña'}</span>
                                </button>
                            </div>
                        </div>

                        {/* List of current reviews */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Reseñas en la Lista</label>
                            {reviews.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs">No hay opiniones cargadas en la lista.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="flex justify-between items-start gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/20 hover:bg-slate-50/50">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-950">{review.author}</span>
                                                    <span className="text-[10px] text-slate-400">{review.date}</span>
                                                    <span className="text-amber-500 text-[10px]">{'★'.repeat(review.rating)}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 italic leading-relaxed">"{review.text}"</p>
                                            </div>
                                            
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleEditReviewClick(review)}
                                                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                                    title="Editar"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReview(review.id)}
                                                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 4: Inventory Web Images Override */}
                {activeTab === 'inventory' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Personalizar Imágenes del Catálogo</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Sube o ingresa un enlace para cambiar las fotos tomadas en campo por imágenes comerciales premium de internet.</p>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearchInventory} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por descripción, marca, modelo o código..."
                                    className="w-full text-xs p-2.5 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={handleClearInventorySearch}
                                    className="px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-655 hover:bg-slate-100 transition-colors"
                                >
                                    Limpiar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loadingSearch}
                                className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                            >
                                {loadingSearch ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>

                        {/* Source Filter Tabs */}
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => handleSourceFilterChange('all')}
                                className={`px-4 py-2 rounded-xl transition-all duration-200 border cursor-pointer ${
                                    sourceFilter === 'all'
                                        ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-605 hover:bg-slate-50'
                                }`}
                            >
                                Mostrar Todo
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSourceFilterChange('scraped')}
                                className={`px-4 py-2 rounded-xl transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                                    sourceFilter === 'scraped'
                                        ? 'bg-cyan-600 border-cyan-600 text-white font-bold shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-605 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${sourceFilter === 'scraped' ? 'bg-white' : 'bg-cyan-500'}`} />
                                Solo Importados (SOMA)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSourceFilterChange('own')}
                                className={`px-4 py-2 rounded-xl transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                                    sourceFilter === 'own'
                                        ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-605 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${sourceFilter === 'own' ? 'bg-white' : 'bg-indigo-500'}`} />
                                Solo Inventario Interno
                            </button>
                        </div>

                        {/* Search Results */}
                        <div className="space-y-4">
                            {searchResults.length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Resultados de Búsqueda
                                    </h3>
                                    
                                    {/* Layout Filter/Toggle */}
                                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                viewMode === 'list'
                                                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <List size={13} />
                                            <span>En línea</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                viewMode === 'grid'
                                                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <LayoutGrid size={13} />
                                            <span>Cuadrícula</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div className={viewMode === 'list' ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                                    {searchResults.map((item) => {
                                        const isSaving = updatingImageId === item.id;
                                        const isUploading = uploadingItemId === item.id;
                                        const isList = viewMode === 'list';
                                        
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-4 transition-all duration-300 shadow-sm flex flex-col justify-between gap-4 ${
                                                    isList ? "xl:flex-row xl:items-center" : ""
                                                }`}
                                            >
                                                {/* Left Side: Product Info & Dual Thumbnails */}
                                                <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center min-w-0 ${
                                                    isList ? "xl:w-1/3 shrink-0" : ""
                                                }`}>
                                                    {/* Thumbnails Container */}
                                                    <div 
                                                        onClick={() => setSelectedItem(item)}
                                                        className="flex gap-2 shrink-0 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
                                                        title="Ver Ficha Completa de Imágenes"
                                                    >
                                                        {/* Original photo */}
                                                        <div className="relative w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner" title="Foto Interna original">
                                                            {item.imageUrl ? (
                                                                <img src={item.imageUrl} alt="Foto interna" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="text-slate-300" size={16} />
                                                            )}
                                                            <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-[6px] text-white font-black text-center uppercase tracking-wider py-0.5">
                                                                Interno
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Web Custom photo */}
                                                        <div className="relative w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner" title="Imagen Pública Web">
                                                            {itemImageUrls[item.id] ? (
                                                                <img src={itemImageUrls[item.id]} alt="Imagen Web" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="text-slate-350" size={16} />
                                                            )}
                                                            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-[6px] text-white font-black text-center uppercase tracking-wider py-0.5">
                                                                Web
                                                            </span>
                                                            {itemImageUrls[item.id] && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setItemImageUrls(prev => ({ ...prev, [item.id]: '' }));
                                                                    }}
                                                                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow"
                                                                >
                                                                    <X size={8} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Meta Info */}
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                                item.type === 'activo' 
                                                                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' 
                                                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                            }`}>
                                                                {item.type === 'activo' ? 'Equipo' : 'Consumible'}
                                                            </span>
                                                            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                {item.code}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedItem(item)}
                                                                className="text-[9px] font-bold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                                                                title="Ver Ficha de Detalles"
                                                            >
                                                                <Eye size={10} className="text-slate-450 shrink-0" />
                                                                <span>Ficha</span>
                                                            </button>
                                                            <a
                                                                href={`/landing/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.name || '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[9px] font-bold text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 bg-white border border-cyan-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                                                                title="Ver cómo se ve en el catálogo público"
                                                            >
                                                                <Globe size={10} className="shrink-0" />
                                                                <span>Ver Web</span>
                                                            </a>
                                                        </div>
                                                        <h4 
                                                            onClick={() => setSelectedItem(item)}
                                                            className="font-extrabold text-xs text-slate-800 line-clamp-1 cursor-pointer hover:text-cyan-600 hover:underline transition-colors" 
                                                            title={`Ver Ficha de Detalles de: ${item.name}`}
                                                        >
                                                            {item.name}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            Marca: {item.brand} | Modelo: {item.model}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Middle: Custom fields inputs */}
                                                <div className={isList ? "flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3 w-full" : "flex flex-col gap-3 w-full"}>
                                                    {/* Input: Título Web */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Título en la Web</label>
                                                        <input 
                                                            type="text" 
                                                            value={itemWebTitles[item.id] || ''}
                                                            onChange={(e) => setItemWebTitles(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            placeholder={item.name}
                                                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-semibold text-slate-800"
                                                        />
                                                    </div>

                                                    {/* Input: Descripción Web */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Descripción en la Web</label>
                                                        <textarea 
                                                            value={itemWebDescriptions[item.id] || ''}
                                                            onChange={(e) => setItemWebDescriptions(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            placeholder={item.internalDescription || "Descripción comercial..."}
                                                            rows={1}
                                                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 leading-normal font-medium text-slate-650 resize-y"
                                                        />
                                                    </div>

                                                    {/* Input: Imagen Web URL/File */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Cambiar Imagen Web</label>
                                                        <div className="flex gap-1.5">
                                                            <label className={`flex items-center justify-center gap-1 px-2.5 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shrink-0 ${
                                                                isUploading ? 'opacity-50 pointer-events-none' : ''
                                                            }`}>
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleUploadFile(item.id, file);
                                                                    }}
                                                                />
                                                                <ImageIcon size={12} className="text-slate-550 shrink-0" />
                                                                <span className="text-[9px] font-bold text-slate-650 uppercase tracking-wider shrink-0">
                                                                    {isUploading ? '...' : 'Subir'}
                                                                </span>
                                                            </label>
                                                            <input 
                                                                type="text" 
                                                                value={itemImageUrls[item.id] || ''}
                                                                onChange={(e) => setItemImageUrls(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                placeholder="Pegar URL de imagen..."
                                                                className="flex-1 min-w-0 text-xs px-2.5 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-cyan-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Side: Action Save & Delete Buttons */}
                                                <div className={isList ? "flex xl:flex-col justify-end gap-2 xl:self-center shrink-0" : "w-full flex gap-2"}>
                                                    <button
                                                        onClick={() => handleSaveItemWebFields(item.id, item.type)}
                                                        disabled={isSaving || isUploading}
                                                        className="bg-slate-900 hover:bg-slate-850 disabled:bg-slate-350 text-white text-[9px] font-black px-4 py-3 rounded-xl uppercase tracking-wider transition-all hover:scale-[1.02] shadow cursor-pointer flex items-center justify-center gap-1.5 w-full xl:w-auto shrink-0"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <RefreshCw className="animate-spin" size={10} />
                                                                <span>...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save size={10} />
                                                                <span>Guardar</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteItem(item.id, item.type, item.name)}
                                                        className="bg-red-50 hover:bg-red-100 text-red-650 text-[9px] font-black px-4 py-3 rounded-xl uppercase tracking-wider transition-all hover:scale-[1.02] border border-red-200/60 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 w-full xl:w-auto shrink-0 active:scale-95"
                                                    >
                                                        <Trash2 size={10} className="shrink-0" />
                                                        <span>Eliminar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {searchResults.length === 0 && !loadingSearch && (
                                <div className="text-center py-10 border border-dashed rounded-3xl text-slate-400 text-xs">
                                    {searchQuery 
                                        ? 'No se encontraron equipos ni repuestos para la búsqueda. Intenta con palabras clave como "incubadora", "monitor", "canula", etc.'
                                        : 'No hay productos disponibles en el catálogo.'}
                                </div>
                            )}
                        </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        disabled={currentPage <= 1 || loadingSearch}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs text-slate-500 font-medium">
                                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        disabled={currentPage >= totalPages || loadingSearch}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                {/* TAB 5: General Landing Info Settings */}
                {activeTab === 'general' && (
                    <form onSubmit={handleSaveGeneralSettings} className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Configuración General del Sitio</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Administra los números de WhatsApp, correos, dirección y textos de portada que tus clientes verán.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* WhatsApps */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Smartphone size={12} className="text-brand-500" />
                                    WhatsApp Ventas / Soporte (Separados por coma)
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.whatsappNumbers?.join(', ') || ''}
                                    onChange={(e) => handleGeneralFieldChange('whatsappNumbers', e.target.value.split(',').map(s => s.trim()))}
                                    placeholder="50431782368, 50489246108"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            {/* Emails */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Mail size={12} className="text-brand-500" />
                                    Correos de Contacto (Separados por coma)
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.contactEmails?.join(', ') || ''}
                                    onChange={(e) => handleGeneralFieldChange('contactEmails', e.target.value.split(',').map(s => s.trim()))}
                                    placeholder="ventas@bioelectronicahn.com, gerencia@bioelectronicahn.com"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            {/* Top Bar Email */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Mail size={12} className="text-brand-500" />
                                    Correo de la Barra Superior (Top Bar)
                                </label>
                                <input 
                                    type="email" 
                                    value={landingSettings.topbarEmail || ''}
                                    onChange={(e) => handleGeneralFieldChange('topbarEmail', e.target.value.trim())}
                                    placeholder="ventas@bioelectronicahn.com"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                                <span className="text-[10px] text-slate-400 block mt-0.5">Este correo se mostrará en la esquina superior derecha de la cabecera pública. Si se deja vacío, se usará el primero de la lista superior.</span>
                            </div>

                            {/* Working Hours */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} className="text-brand-500" />
                                    Horario de Atención
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.workingHours || ''}
                                    onChange={(e) => handleGeneralFieldChange('workingHours', e.target.value)}
                                    placeholder="Lunes a Viernes · 8:00 AM - 5:00 PM"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            {/* Physical Address */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} className="text-brand-500" />
                                    Dirección Física de la Oficina
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.physicalAddress || ''}
                                    onChange={(e) => handleGeneralFieldChange('physicalAddress', e.target.value)}
                                    placeholder="7 Calle, 9 Avenida NO, San Pedro Sula, Cortés"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>
                        </div>

                        {/* Destinatarios de Cotizaciones */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Destinatarios de Cotizaciones</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <Smartphone size={12} className="text-brand-500" />
                                        WhatsApp para recibir Mensajes de Cotización
                                    </label>
                                    <input 
                                        type="text" 
                                        value={landingSettings.quoteWhatsappNumber || ''}
                                        onChange={(e) => handleGeneralFieldChange('quoteWhatsappNumber', e.target.value.trim())}
                                        placeholder="Ej: 50431782368"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Si se deja vacío, las cotizaciones por WhatsApp se enviarán al primer número de la lista superior.</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <Mail size={12} className="text-brand-500" />
                                        Correo para recibir Solicitudes de Cotización
                                    </label>
                                    <input 
                                        type="email" 
                                        value={landingSettings.quoteEmail || ''}
                                        onChange={(e) => handleGeneralFieldChange('quoteEmail', e.target.value.trim())}
                                        placeholder="Ej: cotizaciones@bioelectronica.hn"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Si se deja vacío, las cotizaciones por correo se enviarán al primer correo de la lista superior.</span>
                                </div>
                            </div>
                        </div>

                        {/* Title and subtitle */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Portada (Hero Banner)</h3>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Título de Bienvenida</label>
                                <input 
                                    type="text" 
                                    value={landingSettings.heroTitle || ''}
                                    onChange={(e) => handleGeneralFieldChange('heroTitle', e.target.value)}
                                    placeholder="Ej: Equipamiento Médico y Soporte Biomédico Lider en Honduras"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subtítulo de Bienvenida</label>
                                <textarea 
                                    value={landingSettings.heroSubtitle || ''}
                                    onChange={(e) => handleGeneralFieldChange('heroSubtitle', e.target.value)}
                                    placeholder="Ej: Diseñando soluciones integrales en venta, distribución..."
                                    rows={2}
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white leading-relaxed"
                                />
                            </div>
                        </div>
                    </form>
                )}

                {/* TAB 6: SEO and Meta Tags Settings */}
                {activeTab === 'seo' && (
                    <form onSubmit={handleSaveGeneralSettings} className="p-6 space-y-6 animate-fade-in">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 font-sans">Configuración SEO y Meta Tags</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-sans">Optimiza cómo aparece tu página web pública en los buscadores de Google y al compartir enlaces en redes sociales.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 cursor-pointer"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* Inputs Column */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Título SEO (Meta Title)</label>
                                        <span className={`text-[10px] font-bold font-sans ${
                                            (landingSettings.seoTitle?.length || 0) > 60 ? 'text-amber-500 font-semibold' : 'text-slate-400'
                                        }`}>
                                            {landingSettings.seoTitle?.length || 0}/60 carac. recomendados
                                        </span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={landingSettings.seoTitle || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoTitle', e.target.value)}
                                        placeholder="Ej: Bioelectrónica Honduras | Equipamiento Médico y Soporte Técnico"
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-semibold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Descripción SEO (Meta Description)</label>
                                        <span className={`text-[10px] font-bold font-sans ${
                                            (landingSettings.seoDescription?.length || 0) > 160 ? 'text-amber-500 font-semibold' : 'text-slate-400'
                                        }`}>
                                            {landingSettings.seoDescription?.length || 0}/160 carac. recomendados
                                        </span>
                                    </div>
                                    <textarea 
                                        value={landingSettings.seoDescription || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoDescription', e.target.value)}
                                        placeholder="Ej: Líderes en venta, distribución y mantenimiento técnico de equipo biomédico en Honduras. Más de 20 años de experiencia técnica respaldan nuestras soluciones."
                                        rows={4}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white leading-relaxed"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Palabras Clave (Keywords, separadas por coma)</label>
                                    <input 
                                        type="text" 
                                        value={landingSettings.seoKeywords || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoKeywords', e.target.value)}
                                        placeholder="Ej: equipo medico, biomedica honduras, soporte tecnico de equipos medicos"
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">URL de Imagen Miniatura (OG Image / Preview)</label>
                                    <input 
                                        type="text" 
                                        value={landingSettings.seoImage || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoImage', e.target.value)}
                                        placeholder="Ej: https://bioelectronicahn.com/images/default-thumbnail.jpg"
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">Se recomienda una resolución de 1200x630px para visualización óptima en redes sociales.</span>
                                </div>
                            </div>

                            {/* Previews Column */}
                            <div className="space-y-6">
                                {/* Google Search Preview */}
                                <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Vista Previa en Buscadores (Google)</span>
                                    <div className="bg-white border rounded-xl p-4 shadow-sm font-sans max-w-xl">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500">B</div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-medium leading-none text-slate-800">bioelectronicahn.com</span>
                                                <span className="text-[9px] leading-none text-slate-400">https://www.bioelectronicahn.com</span>
                                            </div>
                                        </div>
                                        <h4 className="text-[#1a0dab] hover:underline text-lg font-normal leading-tight cursor-pointer">
                                            {landingSettings.seoTitle || "Bioelectrónica Honduras - Enterprise Platform"}
                                        </h4>
                                        <p className="text-xs text-[#4d5156] mt-1 leading-relaxed line-clamp-2">
                                            {landingSettings.seoDescription || "Estamos diseñando nuestro nuevo sitio corporativo y catálogo médico en línea. Muy pronto podrás explorar todas nuestras soluciones y productos médicos."}
                                        </p>
                                    </div>
                                </div>

                                {/* Social Media Card Preview */}
                                <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Vista Previa en Redes Sociales (Facebook/WhatsApp/X)</span>
                                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm font-sans max-w-sm">
                                        <div className="aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden border-b">
                                            {landingSettings.seoImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img 
                                                    src={landingSettings.seoImage} 
                                                    alt="Vista previa SEO" 
                                                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-95 hover:scale-[1.02] transition-all duration-200" 
                                                    onClick={() => setLightboxImageUrl(landingSettings.seoImage || null)}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                                    <ImageIcon size={32} strokeWidth={1.5} />
                                                    <span className="text-[10px] font-semibold">Sin imagen de vista previa</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 bg-slate-50 space-y-1">
                                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider font-mono">BIOELECTRONICAHN.COM</span>
                                            <h5 className="text-xs font-bold text-slate-800 line-clamp-1">
                                                {landingSettings.seoTitle || "Bioelectrónica Honduras - Enterprise Platform"}
                                            </h5>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {landingSettings.seoDescription || "Estamos diseñando nuestro nuevo sitio corporativo y catálogo médico en línea. Muy pronto podrás explorar todas nuestras soluciones."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* HERRAMIENTAS DE RASTREO Y PÍXELES (Analytics, Search Console, Pixels) */}
                        <div className="border-t border-slate-200 pt-6 mt-6 space-y-4 font-sans">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-cyan-600" />
                                    <span>Herramientas de Rastreo, Analytics y Píxeles de Seguimiento</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Conecta tu página web con Google Search Console, Google Analytics, Facebook / Meta Pixel y otras redes para medir visitas y conversiones. Pegar el script o el ID; el sistema los detectará automáticamente.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Google Search Console */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Search className="w-3.5 h-3.5 text-blue-600" />
                                            Google Search Console (Código / Meta Tag)
                                        </label>
                                        {(() => {
                                            const input = landingSettings.googleSearchConsole;
                                            if (!input || !input.trim()) return null;
                                            const match = input.match(/content=["']([^"']+)["']/i);
                                            const label = match && match[1] ? match[1] : (input.includes('google-site-verification') ? 'Meta tag detectado' : (input.trim().length > 8 && !input.includes('<') ? input.trim() : 'Código cargado'));
                                            return (
                                                <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                                                    Detectado ✓: {label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <textarea 
                                        value={landingSettings.googleSearchConsole || ''}
                                        onChange={(e) => handleGeneralFieldChange('googleSearchConsole', e.target.value)}
                                        placeholder='Pega aquí el código o la etiqueta HTML de Google. Ej: <meta name="google-site-verification" content="abc123xyz" />'
                                        rows={3}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none leading-relaxed transition-all"
                                    />
                                    <span className="text-[10px] text-slate-400 block font-sans">
                                        Pega la etiqueta HTML completa o la clave de verificación de Google Search Console para verificar la propiedad del dominio.
                                    </span>
                                </div>

                                {/* Google Analytics / GTM */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                                            Google Analytics 4 / GTM (ID o Script)
                                        </label>
                                        {(() => {
                                            const input = landingSettings.googleAnalyticsId;
                                            if (!input || !input.trim()) return null;
                                            const gaMatch = input.match(/G-[A-Z0-9]{4,15}/i);
                                            const gtmMatch = input.match(/GTM-[A-Z0-9]{4,12}/i);
                                            const label = gaMatch ? gaMatch[0].toUpperCase() : (gtmMatch ? gtmMatch[0].toUpperCase() : (input.trim().toUpperCase().startsWith('G-') || input.trim().toUpperCase().startsWith('GTM-') ? input.trim().toUpperCase() : 'Script cargado'));
                                            return (
                                                <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                                                    Detectado ✓: {label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <textarea 
                                        value={landingSettings.googleAnalyticsId || ''}
                                        onChange={(e) => handleGeneralFieldChange('googleAnalyticsId', e.target.value)}
                                        placeholder='Pega tu ID de Google Analytics (ej: G-XYZ123456) o el script completo de Google Tag Manager (GTM).'
                                        rows={3}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none leading-relaxed transition-all"
                                    />
                                    <span className="text-[10px] text-slate-400 block font-sans">
                                        Soporta IDs tipo <code className="font-mono bg-slate-100 px-1 rounded">G-XXXXXXXX</code> o <code className="font-mono bg-slate-100 px-1 rounded">GTM-XXXXXXX</code> o el bloque de código script.
                                    </span>
                                </div>

                                {/* Meta / Facebook Pixel */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                                            Meta / Facebook Pixel (ID o Script)
                                        </label>
                                        {(() => {
                                            const input = landingSettings.facebookPixelId;
                                            if (!input || !input.trim()) return null;
                                            const fbMatch = input.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"]?(\d+)['"]?\s*\)/i);
                                            const numMatch = input.match(/\b\d{13,17}\b/);
                                            const label = fbMatch && fbMatch[1] ? fbMatch[1] : (numMatch ? numMatch[0] : (/^\d+$/.test(input.trim()) ? input.trim() : 'Píxel cargado'));
                                            return (
                                                <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                                                    Detectado ✓: {label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <textarea 
                                        value={landingSettings.facebookPixelId || ''}
                                        onChange={(e) => handleGeneralFieldChange('facebookPixelId', e.target.value)}
                                        placeholder="Pega tu Píxel ID de Facebook (ej: 123456789012345) o el script completo de Meta Pixel."
                                        rows={3}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none leading-relaxed transition-all"
                                    />
                                    <span className="text-[10px] text-slate-400 block font-sans">
                                        Extrae automáticamente el Píxel ID para rastrear visitas y anuncios de Facebook e Instagram.
                                    </span>
                                </div>

                                {/* Custom Header Scripts */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Code className="w-3.5 h-3.5 text-indigo-600" />
                                            Scripts Personalizados (Head / Tracking Adicional)
                                        </label>
                                        {landingSettings.customHeaderScripts?.trim() && (
                                            <span className="text-[9px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded-full">
                                                Script Activo ✓
                                            </span>
                                        )}
                                    </div>
                                    <textarea 
                                        value={landingSettings.customHeaderScripts || ''}
                                        onChange={(e) => handleGeneralFieldChange('customHeaderScripts', e.target.value)}
                                        placeholder='Pega aquí cualquier otro script o píxel adicional (ej: Hotjar, TikTok Pixel, LinkedIn Insight, Microsoft Clarity).'
                                        rows={3}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none leading-relaxed transition-all"
                                    />
                                    <span className="text-[10px] text-slate-400 block font-sans">
                                        Se inyectará de forma transparente en la cabecera pública de tu sitio web.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                {/* TAB: Themes Selection */}
                {activeTab === 'themes' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Temas de la Página Web</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-sans">Selecciona el diseño y estilo visual que se mostrará a los visitantes públicos.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    const res = await saveLandingSettings(landingSettings);
                                    if (res.success) {
                                        toast.success('Configuración de tema guardada');
                                    } else {
                                        toast.error(res.error || 'Error al guardar');
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving}
                                className="flex items-center gap-2 bg-[#00A8CC] hover:bg-[#008ba8] disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Tema'}
                            </button>
                        </div>

                        {/* Themes Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* DRE Theme Card */}
                            <div 
                                onClick={() => setLandingSettings(p => ({ ...p, activeTheme: 'DRE' }))}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 overflow-hidden relative ${
                                    (landingSettings.activeTheme || 'DRE') === 'DRE'
                                        ? 'border-[#00A8CC] bg-cyan-50/10 shadow-md ring-1 ring-cyan-500/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-extrabold text-sm text-slate-900">DRE Theme</span>
                                        {(landingSettings.activeTheme || 'DRE') === 'DRE' && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-550 leading-relaxed">Diseño tradicional basado en DRE Med. Utiliza colores celestes y azul marino, enfocado en el cotizador y la herramienta de búsqueda de 60 segundos.</p>
                                </div>
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    <div className="w-full h-full bg-[#0B1E36]/10 flex flex-col justify-between p-3">
                                        <div className="w-1/2 h-2 bg-[#00A8CC] rounded" />
                                        <div className="w-full h-4 bg-white border rounded" />
                                        <div className="flex gap-1">
                                            <div className="w-8 h-8 bg-white border rounded" />
                                            <div className="w-8 h-8 bg-white border rounded" />
                                            <div className="w-8 h-8 bg-white border rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SOMA Theme Card */}
                            <div 
                                onClick={() => setLandingSettings(p => ({ ...p, activeTheme: 'SOMA' }))}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 overflow-hidden relative ${
                                    landingSettings.activeTheme === 'SOMA'
                                        ? 'border-[#00A8CC] bg-cyan-50/10 shadow-md ring-1 ring-cyan-500/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-extrabold text-sm text-slate-900">Soma Theme</span>
                                        {landingSettings.activeTheme === 'SOMA' && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-550 leading-relaxed">Diseño premium e institucional inspirado en Soma Technology. Colores corporativos sobrios, banner tipo hero expandido y tipografía estilizada.</p>
                                </div>
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    <div className="w-full h-full bg-[#0B1E36] flex flex-col justify-between p-3 text-white/50">
                                        <div className="w-2/3 h-2.5 bg-[#00A8CC] rounded" />
                                        <div className="w-full h-2 bg-white/20 rounded" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-6 bg-white/10 rounded" />
                                            <div className="h-6 bg-white/10 rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BIO Theme Card */}
                            <div 
                                onClick={() => setLandingSettings(p => ({ ...p, activeTheme: 'BIO' }))}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 overflow-hidden relative ${
                                    landingSettings.activeTheme === 'BIO'
                                        ? 'border-[#00A8CC] bg-cyan-50/10 shadow-md ring-1 ring-cyan-500/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-extrabold text-sm text-slate-900">BIO Hybrid Theme</span>
                                        {landingSettings.activeTheme === 'BIO' && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-550 leading-relaxed">Lo mejor de ambos mundos: combina el Hero Banner de Soma con el buscador interactivo de DRE y un grid optimizado de reseñas.</p>
                                </div>
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    <div className="w-full h-full bg-[#07162c] flex flex-col justify-between p-3 text-white/40">
                                        <div className="flex justify-between items-center">
                                            <div className="w-1/3 h-2 bg-[#00A8CC] rounded" />
                                            <div className="w-4 h-4 bg-amber-500 rounded-full" />
                                        </div>
                                        <div className="w-full h-4 bg-white/10 border border-white/20 rounded" />
                                        <div className="h-4 bg-[#00A8CC]/20 rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls for Scraped / External Products */}
                        <div className="p-5 border rounded-2xl bg-slate-50 space-y-4">
                            <h3 className="font-bold text-sm text-slate-800">Control de Productos Externos (Soma Tech)</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-xl">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-slate-800 block">Mostrar Productos Externos</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Habilita la visualización de equipos importados sin stock real en el catálogo público.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={landingSettings.allowScrapedProducts ?? true}
                                        onChange={(e) => setLandingSettings(p => ({ ...p, allowScrapedProducts: e.target.checked }))}
                                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 shrink-0"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-xl">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-slate-800 block">Ocultar Inventario Real</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Oculta del catálogo público todos los productos de tu inventario físico local, mostrando solo los de Soma.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={landingSettings.hideRealInventory ?? false}
                                        onChange={(e) => setLandingSettings(p => ({ ...p, hideRealInventory: e.target.checked }))}
                                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 shrink-0"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-xl">
                                    <div className="space-y-1 flex-1">
                                        <span className="text-xs font-bold text-slate-800 block">Stock Virtual Predeterminado</span>
                                        <span className="text-[10px] text-slate-400 font-medium block">Cantidad a mostrar en inventario para permitir solicitudes fluidas (0 desactivará el stock).</span>
                                        <input 
                                            type="number"
                                            value={landingSettings.defaultScrapedStock ?? 5}
                                            onChange={(e) => setLandingSettings(p => ({ ...p, defaultScrapedStock: parseInt(e.target.value) || 0 }))}
                                            className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white w-20 font-semibold text-slate-850"
                                            min={0}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Scraper Controls */}
                {activeTab === 'scraper' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Importador de Catálogos Externos</h2>
                            <p className="text-xs text-slate-500 mt-0.5 font-sans">Extrae de forma automática categorías, descripciones e imágenes desde Soma Tech (Equipos), Soma Medical Parts (Repuestos/Accesorios), Pukang Medical o Joson Care. Las fotos se subirán directamente a tu Cloudflare R2.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Scraper Control Card */}
                            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-5 lg:col-span-1 shadow-sm">
                                <h3 className="font-bold text-sm text-slate-800">Iniciar Extracción</h3>
                                <p className="text-xs text-slate-500 leading-normal">
                                    La importación se ejecuta en segundo plano por lotes seguros con delay aleatorio de 1 segundo para prevenir bloqueos de IP y mantener la estabilidad del sitio.
                                </p>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Origen del Catálogo</label>
                                    <select 
                                        value={scraperSource}
                                        onChange={(e) => {
                                            setScraperSource(e.target.value as 'soma-tech' | 'soma-parts' | 'pukang' | 'joson' | 'aerti' | 'dre' | 'amcaremed' | 'rd-batteries');
                                            setSelectedScrapeCategory('all');
                                        }}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    >
                                        <option value="soma-tech">Soma Tech (Equipos Médicos)</option>
                                        <option value="soma-parts">Soma Medical Parts (Repuestos/Accesorios)</option>
                                        <option value="pukang">Pukang Medical (Muebles y Equipos Hospitalarios)</option>
                                        <option value="joson">Joson Care (Camas y Mobiliario Hospitalario)</option>
                                        <option value="aerti">Aerti Oxygen (Equipos de Oxigenoterapia)</option>
                                        <option value="dre">DRE Medical (Equipos Médicos e Imagenología)</option>
                                        <option value="amcaremed">AmcareMed (Gases Medicinales y Quirófano)</option>
                                        <option value="rd-batteries">R&D Batteries (Baterías Médicas y Lámparas)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoría de Inicio</label>
                                    <select 
                                        id="scrape-category-select"
                                        value={selectedScrapeCategory}
                                        onChange={(e) => setSelectedScrapeCategory(e.target.value)}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    >
                                        <option value="all">Todas las Categorías</option>
                                        {scraperSource === 'soma-tech' ? (
                                            SOMA_CATEGORIES.map(cat => {
                                                const isImported = importedCategories.includes(cat.label);
                                                return (
                                                    <option key={cat.value} value={cat.value}>
                                                        {isImported ? `✓ ${cat.label}` : cat.label}
                                                    </option>
                                                );
                                            })
                                        ) : scraperSource === 'rd-batteries' ? (
                                            RD_CATEGORIES.map(cat => {
                                                const isImported = importedCategories.includes(cat.label);
                                                return (
                                                    <option key={cat.value} value={cat.value}>
                                                        {isImported ? `✓ ${cat.label}` : cat.label}
                                                    </option>
                                                );
                                            })
                                        ) : scraperSource === 'pukang' ? (
                                            PUKANG_CATEGORIES.map(cat => {
                                                const isImported = importedCategories.includes(cat.label);
                                                return (
                                                    <option key={cat.value} value={cat.value}>
                                                        {isImported ? `✓ ${cat.label}` : cat.label}
                                                    </option>
                                                );
                                            })
                                        ) : scraperSource === 'joson' ? (
                                            JOSON_CATEGORIES.map(cat => {
                                                const isImported = importedCategories.includes(cat.label);
                                                return (
                                                    <option key={cat.value} value={cat.value}>
                                                        {isImported ? `✓ ${cat.label}` : cat.label}
                                                    </option>
                                                );
                                            })
                                        ) : scraperSource === 'aerti' ? (
                                            AERTI_CATEGORIES.map(cat => {
                                                const isImported = importedCategories.includes(cat.label);
                                                return (
                                                    <option key={cat.value} value={cat.value}>
                                                        {isImported ? `✓ ${cat.label}` : cat.label}
                                                    </option>
                                                );
                                            })
                                        ) : scraperSource === 'dre' ? (
                                            DRE_CATEGORIES.map(cat => {
                                                const isImported = importedCategories.includes(cat.label);
                                                return (
                                                    <option key={cat.value} value={cat.value}>
                                                        {isImported ? `✓ ${cat.label}` : cat.label}
                                                    </option>
                                                );
                                            })
                                        ) : scraperSource === 'amcaremed' ? (
                                            AMCAREMED_CATEGORIES.map(group => {
                                                const isGroupImported = importedCategories.includes(group.label);
                                                return (
                                                    <optgroup key={group.value} label={isGroupImported ? `✓ ${group.label}` : group.label}>
                                                        <option value={group.value}>
                                                            {isGroupImported ? `✓ ${group.label} (Todo)` : `${group.label} (Todo)`}
                                                        </option>
                                                        {group.subcategories.map(sub => {
                                                            const isSubImported = importedCategories.includes(sub.label);
                                                            return (
                                                                <option key={sub.value} value={sub.value}>
                                                                    {isSubImported ? `✓ ${sub.label}` : sub.label}
                                                                </option>
                                                            );
                                                        })}
                                                    </optgroup>
                                                );
                                            })
                                        ) : (
                                            SOMA_PARTS_CATEGORIES.map(group => {
                                                const isGroupImported = importedCategories.includes(group.label);
                                                return (
                                                    <optgroup key={group.value} label={isGroupImported ? `✓ ${group.label}` : group.label}>
                                                        <option value={group.value}>
                                                            {isGroupImported ? `✓ ${group.label} (Todo)` : `${group.label} (Todo)`}
                                                        </option>
                                                        {group.subcategories.map(sub => {
                                                            const isSubImported = importedCategories.includes(sub.label);
                                                            return (
                                                                <option key={sub.value} value={sub.value}>
                                                                    {isSubImported ? `✓ ${sub.label}` : sub.label}
                                                                </option>
                                                            );
                                                        })}
                                                    </optgroup>
                                                );
                                            })
                                        )}
                                    </select>
                                    
                                    {/* Preview Link */}
                                    <div className="mt-1.5 flex flex-col gap-1.5 text-[11px] px-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-sans">Previsualizar origen:</span>
                                            <a 
                                                href={getExternalCategoryUrl()} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[#00A8CC] hover:underline font-semibold flex items-center gap-1 font-sans transition-colors hover:text-[#008ba8]"
                                            >
                                                <span>Ver en {scraperSource === 'soma-tech' ? 'Soma Tech' : scraperSource === 'pukang' ? 'Pukang Medical' : scraperSource === 'joson' ? 'Joson Care' : scraperSource === 'aerti' ? 'Aerti Oxygen' : scraperSource === 'dre' ? 'DRE Medical' : scraperSource === 'amcaremed' ? 'AmcareMed' : scraperSource === 'rd-batteries' ? 'R&D Batteries' : 'Soma Parts'}</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        {categoryImportStatus.isImported && (
                                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100 animate-fade-in">
                                                <span className="text-slate-400 font-sans font-medium text-emerald-700">En nuestra página:</span>
                                                <a 
                                                    href={categoryImportStatus.href} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-emerald-600 hover:underline font-semibold flex items-center gap-1 font-sans transition-colors hover:text-emerald-700"
                                                >
                                                    <span>Ver Categoría</span>
                                                    <ExternalLink size={10} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    id="start-scraper-btn"
                                    onClick={handleStartScrape}
                                    disabled={isImporting}
                                    className={`w-full text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                        isImporting 
                                            ? 'bg-slate-400 cursor-not-allowed' 
                                            : 'bg-[#00A8CC] hover:bg-[#008ba8] active:scale-95'
                                    }`}
                                >
                                    <Activity size={14} className={isImporting ? 'animate-spin' : ''} />
                                    <span>{isImporting ? 'Importando...' : 'Comenzar Importación'}</span>
                                </button>
                            </div>

                            {/* Scraper Status Panel */}
                            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4 lg:col-span-2 flex flex-col justify-between shadow-inner">
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isImporting ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                                        <span>Bitácora de Importación</span>
                                    </h3>
                                    
                                    <div ref={logContainerRef} className="h-40 bg-slate-950 text-emerald-400 font-mono text-[10px] p-3 rounded-xl overflow-y-auto space-y-1 select-none scrollbar-thin scrollbar-thumb-slate-800">
                                        {scraperLogs.map((log, index) => (
                                            <div key={index} className="leading-relaxed border-b border-slate-900/50 pb-0.5 last:border-none">
                                                {log}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Progress Bar Container */}
                                    {(isImporting || progressTotal > 0) && (
                                        <div className="space-y-1.5 mt-2 bg-white border border-slate-200/60 p-3 rounded-xl shadow-sm">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                <span>Progreso de Importación</span>
                                                <span className="font-mono">
                                                    {progressTotal > 0 ? `${Math.round((progressCurrent / progressTotal) * 100)}%` : '0%'} ({progressCurrent}/{progressTotal})
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 relative">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-full transition-all duration-300 relative shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                                    style={{ width: `${progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0}%` }}
                                                >
                                                    {isImporting && (
                                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progressbar-stripes_1s_linear_infinite]" />
                                                    )}
                                                </div>
                                            </div>
                                            <style dangerouslySetInnerHTML={{__html: `
                                                @keyframes progressbar-stripes {
                                                    from { background-position: 1rem 0; }
                                                    to { background-position: 0 0; }
                                                }
                                            `}} />
                                        </div>
                                    )}

                                    {/* Link to visited category */}
                                    {!isImporting && importedCategorySlug && (
                                        <div className="mt-4 p-4 bg-cyan-50/50 border border-cyan-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shrink-0">
                                            <div className="text-left space-y-0.5">
                                                <span className="text-xs font-bold text-cyan-800 block">¡Importación Exitosa!</span>
                                                <span className="text-[10px] text-slate-500 block">
                                                    La categoría ha sido procesada. Ya puedes ver los productos en la web pública.
                                                </span>
                                            </div>
                                            <a 
                                                href={importedCategorySlug === 'all' 
                                                    ? (scraperSource === 'soma-parts' ? '/repuestos' : '/productos')
                                                    : `/productos?category=${encodeURIComponent(importedCategoryName || '')}${scraperSource === 'soma-parts' ? '&type=producto' : ''}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                                            >
                                                <span>Ver Categoría en la Web</span>
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 text-xs border-t pt-4 font-semibold text-slate-500 justify-between">
                                    <span>Estado Scraper: <strong className={isImporting ? 'text-amber-600' : 'text-slate-900'}>{isImporting ? 'Extrayendo lotes...' : 'Listo'}</strong></span>
                                    <span>Último Estado: <strong className="text-slate-900">Exitoso</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Administrar Categorías Importadas */}
                        <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-sm text-slate-800">Categorías Importadas Activas en la Web</h3>
                                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                                        Esta es la lista de categorías generadas por tus productos importados activos en la web. Al eliminar una categoría, todos los productos asociados se moverán a <strong>"Sin Categorizar"</strong> y la categoría dejará de mostrarse en los menús de navegación de la landing page.
                                    </p>
                                </div>
                                {/* View toggles & bulk actions */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none">
                                        <button
                                            type="button"
                                            onClick={() => setCategoryViewMode('cards')}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${categoryViewMode === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Tarjetas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategoryViewMode('list')}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${categoryViewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                                        >
                                            Lista
                                        </button>
                                    </div>
                                    
                                    {selectedCats.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteSelectedCategories}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer animate-fade-in"
                                        >
                                            <Trash2 size={13} />
                                            <span>Eliminar Seleccionadas ({selectedCats.length})</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {importedCategories.length === 0 ? (
                                <p className="text-xs text-slate-400 italic font-sans py-4 text-center">No hay categorías importadas activas en la base de datos.</p>
                            ) : (
                                (() => {
                                    const filteredCategories = importedCategories.filter(cat =>
                                        cat.toLowerCase().includes(categorySearch.toLowerCase())
                                    );

                                    const isAllFilteredSelected = filteredCategories.length > 0 && 
                                        filteredCategories.every(cat => selectedCats.includes(cat));

                                    return (
                                        <div className="space-y-4">
                                            {/* Search input & Select All */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                                                <div className="relative w-full sm:max-w-xs">
                                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                    <input
                                                        type="text"
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        placeholder="Buscar categorías..."
                                                        className="w-full bg-white border border-slate-200 rounded-xl text-xs py-2 pl-9.5 pr-4 text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-semibold shadow-sm transition-all"
                                                    />
                                                    {categorySearch && (
                                                        <button 
                                                            onClick={() => setCategorySearch('')}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            Limpiar
                                                        </button>
                                                    )}
                                                </div>

                                                {filteredCategories.length > 0 && (
                                                    <div className="flex items-center gap-2 pl-1 sm:pl-0 text-xs text-slate-600 font-semibold select-none">
                                                        <input
                                                            type="checkbox"
                                                            id="select-all-cats-checkbox"
                                                            checked={isAllFilteredSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedCats(prev => {
                                                                        const union = new Set([...prev, ...filteredCategories]);
                                                                        return Array.from(union);
                                                                    });
                                                                } else {
                                                                    setSelectedCats(prev => prev.filter(cat => !filteredCategories.includes(cat)));
                                                                }
                                                            }}
                                                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer w-4 h-4 transition-all"
                                                        />
                                                        <label htmlFor="select-all-cats-checkbox" className="cursor-pointer font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                            {isAllFilteredSelected ? 'Deseleccionar Todas' : 'Seleccionar Todas las Filtradas'}
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Categories Render */}
                                            {filteredCategories.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic font-sans py-6 text-center">No se encontraron categorías que coincidan con tu búsqueda.</p>
                                            ) : categoryViewMode === 'cards' ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                                                    {filteredCategories.map((cat) => {
                                                        const isSelected = selectedCats.includes(cat);
                                                        return (
                                                            <div 
                                                                key={cat} 
                                                                className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                                                                    isSelected 
                                                                        ? 'bg-cyan-50/20 border-cyan-300 shadow-sm ring-1 ring-cyan-300' 
                                                                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
                                                                }`}
                                                            >
                                                                <label className="flex items-center gap-2.5 min-w-0 flex-1 select-none cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedCats(prev => [...prev, cat]);
                                                                            } else {
                                                                                setSelectedCats(prev => prev.filter(c => c !== cat));
                                                                            }
                                                                        }}
                                                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer w-4 h-4"
                                                                    />
                                                                    <span className="text-xs font-semibold text-slate-800 truncate font-sans" title={cat}>
                                                                        {cat}
                                                                    </span>
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteCategory(cat)}
                                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
                                                                    title={`Eliminar categoría ${cat}`}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto scrollbar-thin shadow-sm">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                                                <th className="p-3 w-12 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isAllFilteredSelected}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedCats(prev => {
                                                                                    const union = new Set([...prev, ...filteredCategories]);
                                                                                    return Array.from(union);
                                                                                });
                                                                            } else {
                                                                                setSelectedCats(prev => prev.filter(cat => !filteredCategories.includes(cat)));
                                                                            }
                                                                        }}
                                                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer w-4 h-4"
                                                                    />
                                                                </th>
                                                                <th className="p-3">Nombre de la Categoría</th>
                                                                <th className="p-3 w-24 text-center">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white">
                                                            {filteredCategories.map((cat) => {
                                                                const isSelected = selectedCats.includes(cat);
                                                                return (
                                                                    <tr 
                                                                        key={cat} 
                                                                        className={`hover:bg-slate-50/40 transition-colors ${
                                                                            isSelected ? 'bg-cyan-50/10' : ''
                                                                        }`}
                                                                    >
                                                                        <td className="p-3 text-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedCats(prev => [...prev, cat]);
                                                                                    } else {
                                                                                        setSelectedCats(prev => prev.filter(c => c !== cat));
                                                                                    }
                                                                                }}
                                                                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer w-4 h-4"
                                                                            />
                                                                        </td>
                                                                        <td className="p-3 font-semibold text-slate-800">
                                                                            {cat}
                                                                        </td>
                                                                        <td className="p-3 text-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteCategory(cat)}
                                                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                                title={`Eliminar categoría ${cat}`}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: Web Contacts */}
                {activeTab === 'contacts' && (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Mensajes y Solicitudes de Cotización Web</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Consulta la lista de personas que solicitaron información o presupuestos desde la web pública.</p>
                            </div>
                            <button
                                onClick={fetchContacts}
                                disabled={loadingContacts}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
                            >
                                <RefreshCw size={14} className={loadingContacts ? 'animate-spin' : ''} />
                                <span>Refrescar</span>
                            </button>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <div className="relative w-full sm:flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    placeholder="Buscar por nombre, correo, teléfono o mensaje..."
                                    className="pl-9 pr-4 py-2 w-full text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                                />
                                {contactSearch && (
                                    <button 
                                        onClick={() => setContactSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                                {(['ALL', 'PENDIENTE', 'LEIDO', 'CONTACTADO', 'ARCHIVADO'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setContactFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 ${
                                            contactFilter === filter
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {filter === 'ALL' ? 'Todos' : filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contacts List Grid */}
                        {loadingContacts ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                Cargando contactos...
                            </div>
                        ) : (
                            (() => {
                                const filtered = contacts.filter(c => {
                                    const matchSearch = 
                                        c.nombre.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                        c.correo.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                        c.telefono.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                        c.mensaje.toLowerCase().includes(contactSearch.toLowerCase());
                                    const matchFilter = contactFilter === 'ALL' || c.estado === contactFilter;
                                    return matchSearch && matchFilter;
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="py-12 text-center border border-dashed rounded-2xl bg-slate-50/50 space-y-2">
                                            <p className="text-xs font-semibold text-slate-450">No se encontraron contactos web</p>
                                            <p className="text-[10px] text-slate-400">Prueba cambiando los filtros de búsqueda.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 gap-4">
                                        {filtered.map((c) => {
                                            const isSelected = selectedContact?.id === c.id;
                                            return (
                                                <div 
                                                    key={c.id} 
                                                    className={`border rounded-2xl p-5 transition-all bg-white relative overflow-hidden ${
                                                        isSelected ? 'ring-2 ring-brand-500 border-transparent shadow-sm' : 'hover:border-slate-350 shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-extrabold text-sm text-slate-900">{c.nombre}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                                                                    c.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                    c.estado === 'LEIDO' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                                    c.estado === 'CONTACTADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                                }`}>
                                                                    {c.estado}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                                                                <a href={`mailto:${c.correo}`} className="hover:text-brand-600 transition-colors flex items-center gap-1">
                                                                    <Mail size={12} />
                                                                    {c.correo}
                                                                </a>
                                                                <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors flex items-center gap-1 font-mono">
                                                                    <Smartphone size={12} />
                                                                    {c.telefono}
                                                                </a>
                                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                    <Clock size={12} />
                                                                    {new Date(c.createdAt).toLocaleDateString('es-HN', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                                            <select
                                                                value={c.estado}
                                                                onChange={(e) => handleUpdateContactStatus(c.id, e.target.value)}
                                                                className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-brand-500"
                                                            >
                                                                <option value="PENDIENTE">Pendiente</option>
                                                                <option value="LEIDO">Leído</option>
                                                                <option value="CONTACTADO">Contactado</option>
                                                                <option value="ARCHIVADO">Archivado</option>
                                                            </select>
                                                            <button
                                                                onClick={() => handleDeleteContact(c.id)}
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                                title="Eliminar contacto"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 space-y-1">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mensaje / Detalle:</span>
                                                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-wrap">
                                                            {c.mensaje}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}

                {/* TAB: Web Live Traffic */}
                {activeTab === 'activity' && (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">Actividad en Vivo en la Web</h2>
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">Visualiza en tiempo real quién está navegando por el sitio web de Bioelectrónica y motívalos a chatear.</p>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                                    En Vivo - Actualiza cada 10s
                                </span>
                                <button
                                    onClick={() => fetchTraffic()}
                                    disabled={loadingTraffic}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
                                >
                                    <RefreshCw size={14} className={loadingTraffic ? 'animate-spin' : ''} />
                                    <span>Refrescar</span>
                                </button>
                            </div>
                        </div>

                        {/* Top KPI row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 border rounded-2xl bg-white shadow-sm flex items-center justify-between gap-4 relative overflow-hidden">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usuarios Online</span>
                                    <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-baseline gap-1">
                                        {activeCount}
                                        <span className="text-xs text-slate-400 font-semibold">visitas activas</span>
                                    </h3>
                                </div>
                                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/20 rounded-full blur-xl pointer-events-none" />
                            </div>

                            <div className="p-4 border rounded-2xl bg-white shadow-sm flex items-center justify-between gap-4 relative col-span-2">
                                <div className="space-y-1.5 w-full">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Páginas Visitadas</span>
                                    {topPages.length === 0 ? (
                                        <p className="text-[10px] text-slate-400 font-medium">Sin datos de tráfico en este período.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {topPages.map((tp, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 font-mono">
                                                    <span className="text-slate-400">{tp.page}</span>
                                                    <span className="font-bold text-brand-700 bg-brand-50 px-1 rounded">{tp.count}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Split view: Active visitors & logs */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            
                            {/* Column 1: Online Profiles (3 cols) */}
                            <div className="lg:col-span-3 space-y-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={14} className="text-brand-600" />
                                    <span>Usuarios Conectados Actualmente ({activeVisitors.length})</span>
                                </h3>
                                
                                {loadingTraffic ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                        Analizando conexiones...
                                    </div>
                                ) : activeVisitors.length === 0 ? (
                                    <div className="p-6 border border-dashed rounded-2xl bg-slate-50/50 text-center space-y-1">
                                        <p className="text-xs font-semibold text-slate-400">Ningún usuario navegando actualmente</p>
                                        <p className="text-[10px] text-slate-400">Las sesiones inactivas por más de 15 minutos expiran automáticamente.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {activeVisitors.map((visitor, idx) => (
                                            <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-3 hover:border-slate-300 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                                                            <span className="font-bold text-xs text-slate-800 font-mono">{visitor.ip}</span>
                                                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                                                <Globe size={11} />
                                                                {visitor.ciudad}, {visitor.pais}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{visitor.dispositivo}</span>
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{visitor.so}</span>
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{visitor.browser}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Motivate to chat button */}
                                                    <button
                                                        onClick={() => setSimulatingChat(visitor)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 hover:border-brand-300 text-[10px] font-bold rounded-lg transition-all"
                                                    >
                                                        <MessageCircle size={12} />
                                                        <span>Motivar Chat</span>
                                                    </button>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[10px]">
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Página Actual:</span>
                                                        <span className="font-semibold text-slate-600 font-mono">{visitor.lastPage}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Última Actividad:</span>
                                                        <span>{new Date(visitor.lastActive).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Column 2: Raw Recent Activity Logs (2 cols) */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity size={14} className="text-slate-500" />
                                    <span>Registro de Accesos Recientes</span>
                                </h3>

                                <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                                        {loadingTraffic && trafficLogs.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400">
                                                Cargando registros...
                                            </div>
                                        ) : trafficLogs.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400">
                                                No hay logs disponibles.
                                            </div>
                                        ) : (
                                            trafficLogs.map((log) => (
                                                <div key={log.id} className="p-3 text-[11px] hover:bg-slate-50 transition-colors space-y-1">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span className="font-bold text-slate-700 font-mono">{log.ip}</span>
                                                        <span className="text-[9px] text-slate-400 font-semibold font-mono">
                                                            {new Date(log.timestamp).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-2 text-slate-500 font-medium">
                                                        <span className="truncate font-mono text-brand-650" title={log.pagina}>{log.pagina}</span>
                                                        <span className="shrink-0 text-slate-400 text-[9px]">{log.ciudad || 'HN'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Simulated Chat Invitation Modal */}
                {simulatingChat && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                        <div className="bg-white border rounded-2xl shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                                        <MessageCircle size={16} className="text-brand-600" />
                                        <span>Enviar Invitación de Chat Directo</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-500">Envía un mensaje proactivo a la sesión activa IP <span className="font-mono font-bold text-slate-700">{simulatingChat.ip}</span> ({simulatingChat.ciudad}, {simulatingChat.pais})</p>
                                </div>
                                <button 
                                    onClick={() => setSimulatingChat(null)}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensaje de Bienvenida/Motivación</label>
                                    <textarea
                                        value={chatMsgText}
                                        onChange={(e) => setChatMsgText(e.target.value)}
                                        rows={4}
                                        placeholder="Escribe el mensaje que verá el usuario en su pantalla..."
                                        className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 leading-relaxed"
                                    />
                                </div>

                                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl flex gap-2 text-[10px] text-brand-850 leading-relaxed">
                                    <Check className="shrink-0 text-brand-650" size={14} />
                                    <span>Esta invitación activará una ventana de chat flotante emergente en el navegador del visitante, permitiéndole interactuar directamente con tu terminal ERP.</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setSimulatingChat(null)}
                                    className="px-4 py-2 border rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        toast.success('¡Invitación de chat enviada con éxito!');
                                        setSimulatingChat(null);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/10"
                                >
                                    <Send size={12} />
                                    <span>Enviar Invitación</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Detailed Sheet Modal */}
                {selectedItem && (() => {
                    const isSaving = updatingImageId === selectedItem.id;
                    const isUploading = uploadingItemId === selectedItem.id;
                    
                    return (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-200" onPaste={(e) => handlePasteImage(selectedItem.id, e)}>
                            <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                                {/* Header / Top Ribbon */}
                                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                selectedItem.type === 'activo' 
                                                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' 
                                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                            }`}>
                                                {selectedItem.type === 'activo' ? 'Equipo Físico' : 'Consumible / Repuesto'}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">
                                                {selectedItem.code}
                                            </span>
                                            <a
                                                href={`/landing/productos/${slugify(selectedItem.category || 'equipos')}/${selectedItem.id}-${slugify(selectedItem.name || '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] font-bold text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 bg-white border border-cyan-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all shrink-0 cursor-pointer ml-1"
                                                title="Ver cómo se ve en el catálogo público"
                                            >
                                                <Globe size={10} className="shrink-0" />
                                                <span>Ver Web</span>
                                            </a>
                                        </div>
                                        <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                                            {selectedItem.name}
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedItem(null)}
                                        className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Scrollable Body */}
                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                    {/* Images Preview Section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Column 1: Original Inventory Photo */}
                                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                                                Foto de Inventario (Interna)
                                            </span>
                                            <div className="relative w-full aspect-video rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner group">
                                                {selectedItem.imageUrl ? (
                                                    <img 
                                                        src={selectedItem.imageUrl} 
                                                        alt="Foto original" 
                                                        className="w-full h-full object-cover cursor-zoom-in hover:opacity-95 hover:scale-[1.02] transition-all duration-200" 
                                                        onClick={() => setLightboxImageUrl(selectedItem.imageUrl || null)}
                                                    />
                                                ) : (
                                                    <ImageIcon className="text-slate-350" size={32} />
                                                )}
                                                <span className="absolute bottom-2 left-2 bg-slate-900/80 text-[8px] text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Original IA Vision
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 text-center italic mt-1">
                                                {selectedItem.imageUrl ? "Foto tomada en campo o taller." : "No se ha subido foto en el inventario interno."}
                                            </p>
                                        </div>

                                        {/* Column 2: Web Public Photo */}
                                        <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-br from-cyan-50/20 to-blue-50/20 space-y-3 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                                                Imagen en la Web (Pública)
                                            </span>
                                            <div className="relative w-full aspect-video rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner group">
                                                {itemImageUrls[selectedItem.id] ? (
                                                    <img 
                                                        src={itemImageUrls[selectedItem.id]} 
                                                        alt="Foto web" 
                                                        className="w-full h-full object-cover cursor-zoom-in hover:opacity-95 hover:scale-[1.02] transition-all duration-200" 
                                                        onClick={() => setLightboxImageUrl(itemImageUrls[selectedItem.id] || null)}
                                                    />
                                                ) : (
                                                    <ImageIcon className="text-slate-350" size={32} />
                                                )}
                                                <span className="absolute bottom-2 left-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-[8px] text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Vista en Catálogo
                                                </span>
                                                {itemImageUrls[selectedItem.id] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setItemImageUrls(prev => ({ ...prev, [selectedItem.id]: '' }))}
                                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow shadow-red-500/25"
                                                        title="Eliminar imagen personalizada"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Edit Controls Directly inside the Photo Box! */}
                                            <div className="w-full space-y-1.5 pt-1">
                                                <div className="flex gap-1.5 w-full">
                                                    <label className={`flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 bg-white transition-all hover:border-slate-300 shrink-0 ${
                                                        isUploading ? 'opacity-50 pointer-events-none' : ''
                                                    }`}>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadFile(selectedItem.id, file);
                                                            }}
                                                        />
                                                        <ImageIcon size={11} className="text-slate-550 shrink-0" />
                                                        <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider shrink-0">
                                                            {isUploading ? '...' : 'Subir'}
                                                        </span>
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={itemImageUrls[selectedItem.id] || ''}
                                                        onChange={(e) => setItemImageUrls(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
                                                        onPaste={(e) => handlePasteImage(selectedItem.id, e)}
                                                        placeholder="Pegar enlace o imagen (Ctrl+V)..."
                                                        className="flex-1 min-w-0 text-xs px-2.5 py-2 border border-slate-200 rounded-xl font-mono bg-white focus:outline-none focus:border-cyan-500 transition-all text-slate-700"
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-400 text-center font-medium leading-normal">
                                                    {itemImageUrls[selectedItem.id] 
                                                        ? "Imagen comercial activa. Haz clic en Guardar abajo para aplicar." 
                                                        : "Actualmente usa la foto interna como fallback."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technical details Section */}
                                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 space-y-3">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                                            Información y Atributos Técnicos
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Marca</span>
                                                <span className="text-xs font-bold text-slate-800">{selectedItem.brand}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Modelo</span>
                                                <span className="text-xs font-bold text-slate-800">{selectedItem.model}</span>
                                            </div>
                                            {selectedItem.type === 'activo' && selectedItem.cost !== undefined && selectedItem.cost !== null && (
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Costo de Adquisición</span>
                                                    <span className="text-xs font-mono font-bold text-slate-800">
                                                        L {selectedItem.cost.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Identificador QR / SKU</span>
                                                <span className="text-xs font-mono font-bold text-slate-750">{selectedItem.code}</span>
                                            </div>
                                        </div>

                                        {selectedItem.internalDescription && (
                                            <div className="pt-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Descripción Interna (Inventario)</span>
                                                <p className="text-xs text-slate-600 leading-relaxed bg-white border p-2.5 rounded-xl mt-1 whitespace-pre-line">
                                                    {selectedItem.internalDescription}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Web personalization details Section */}
                                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 space-y-4">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                                            Datos del Catálogo Comercial (Público)
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            {/* Input: Título Web */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Título en la Web</label>
                                                <input 
                                                    type="text" 
                                                    value={itemWebTitles[selectedItem.id] || ''}
                                                    onChange={(e) => setItemWebTitles(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
                                                    placeholder={selectedItem.name}
                                                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-cyan-500 font-semibold text-slate-800"
                                                />
                                            </div>

                                            {/* Input: Descripción Web */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción en la Web</label>
                                                <textarea 
                                                    value={itemWebDescriptions[selectedItem.id] || ''}
                                                    onChange={(e) => setItemWebDescriptions(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
                                                    placeholder={selectedItem.internalDescription || "Descripción comercial..."}
                                                    rows={3}
                                                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-cyan-500 leading-normal font-medium text-slate-600 resize-y"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer buttons */}
                                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between gap-2 shrink-0">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedItem(null)}
                                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            Cerrar Ficha
                                        </button>
                                        
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const deleted = await handleDeleteItem(selectedItem.id, selectedItem.type, selectedItem.name);
                                                if (deleted) {
                                                    setSelectedItem(null);
                                                }
                                            }}
                                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                                        >
                                            <Trash2 size={12} className="shrink-0" />
                                            <span>Eliminar Producto</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await handleSaveItemWebFields(selectedItem.id, selectedItem.type);
                                        }}
                                        disabled={isSaving || isUploading}
                                        className="bg-slate-900 hover:bg-slate-850 disabled:bg-slate-350 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all hover:scale-[1.02] shadow cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                    >
                                        {isSaving ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={12} />
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={12} />
                                                <span>Guardar Cambios</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Lightbox Modal */}
                {lightboxImageUrl && (
                    <div 
                        className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fade-in cursor-zoom-out"
                        onClick={() => setLightboxImageUrl(null)}
                    >
                        <button 
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white hover:text-slate-200 transition-colors cursor-pointer shadow-lg"
                            onClick={() => setLightboxImageUrl(null)}
                        >
                            <X size={24} />
                        </button>
                        <img 
                            src={lightboxImageUrl} 
                            alt="Vista ampliada" 
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

