'use client';

import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, Building2, Banknote, ShieldCheck } from 'lucide-react';

interface ComprobanteRemesaModalProps {
    movimiento: {
        id: string;
        tipo: string;
        concepto: string;
        descripcion: string;
        monto: number;
        metodoPago: string;
        referenciaId?: string | null;
        createdAt: string;
        creadoPor?: { nombre?: string | null; apellido?: string | null; email?: string | null } | null;
    };
    session?: any;
    onClose: () => void;
}

// Convierte un monto numérico a letras en español (Lempiras)
function numeroALetrasHNL(num: number): string {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas10 = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const decenas20 = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
    const decenas = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    function convertirMenorMil(n: number): string {
        if (n === 0) return '';
        if (n === 100) return 'CIEN';
        const c = Math.floor(n / 100);
        const resto = n % 100;
        let texto = c > 0 ? centenas[c] : '';

        if (resto > 0) {
            if (texto) texto += ' ';
            if (resto < 10) {
                texto += unidades[resto];
            } else if (resto < 20) {
                texto += decenas10[resto - 10];
            } else if (resto < 30) {
                texto += decenas20[resto - 20];
            } else {
                const d = Math.floor(resto / 10);
                const u = resto % 10;
                texto += decenas[d] + (u > 0 ? ` Y ${unidades[u]}` : '');
            }
        }
        return texto;
    }

    const absNum = Math.abs(num || 0);
    const enteros = Math.floor(absNum);
    const centavos = Math.round((absNum - enteros) * 100);
    const centavosStr = `${String(centavos).padStart(2, '0')}/100`;

    if (enteros === 0) {
        return `CERO LEMPIRAS CON ${centavosStr}`;
    }

    let resultado = '';
    const millones = Math.floor(enteros / 1000000);
    const miles = Math.floor((enteros % 1000000) / 1000);
    const restoUnidades = enteros % 1000;

    if (millones > 0) {
        if (millones === 1) {
            resultado += 'UN MILLÓN ';
        } else {
            resultado += `${convertirMenorMil(millones)} MILLONES `;
        }
    }

    if (miles > 0) {
        if (miles === 1) {
            resultado += 'MIL ';
        } else {
            resultado += `${convertirMenorMil(miles)} MIL `;
        }
    }

    if (restoUnidades > 0) {
        resultado += convertirMenorMil(restoUnidades);
    }

    return `${resultado.trim()} LEMPIRAS CON ${centavosStr}`;
}

// Extrae metadatos estructurados si fueron guardados en referenciaId o descripcion
export function parseRemesaMetadata(mov: { descripcion?: string; referenciaId?: string | null; concepto?: string }) {
    let bancoDestino = 'DEPÓSITO BANCARIO GENERAL';
    let entregadoA = '';
    let referenciaBoleta = '';
    let notasLimpias = mov.descripcion || '';

    // Si referenciaId tiene formato estructurado: "BANCO:...|ENTREGADO:...|REF:..."
    const refRaw = mov.referenciaId || '';
    if (refRaw.includes('BANCO:') || refRaw.includes('ENTREGADO:')) {
        const parts = refRaw.split('|');
        for (const p of parts) {
            const [k, ...vArr] = p.split(':');
            const val = vArr.join(':').trim();
            if (k === 'BANCO' && val) bancoDestino = val;
            if (k === 'ENTREGADO' && val) entregadoA = val;
            if (k === 'REF' && val) referenciaBoleta = val;
        }
    } else if (refRaw && mov.concepto !== 'TRASPASO_CAJA_CHICA') {
        referenciaBoleta = refRaw;
    }

    if (mov.concepto === 'TRASPASO_CAJA_CHICA') {
        bancoDestino = 'CAJA CHICA (TRASLADO INTERNO)';
    }

    return {
        bancoDestino,
        entregadoA: entregadoA || 'ENCARGADO DE DEPÓSITO / GERENCIA',
        referenciaBoleta,
        notasLimpias
    };
}

export default function ComprobanteRemesaModal({ movimiento, session, onClose }: ComprobanteRemesaModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const meta = parseRemesaMetadata(movimiento);
    const folio = `REM-${movimiento.id.substring(0, 8).toUpperCase()}`;
    const turnoFolio = session?.id ? `TURNO-${session.id.substring(0, 6).toUpperCase()}` : 'TURNO ACTIVO';

    const cajeroNombre =
        (movimiento.creadoPor?.nombre
            ? `${movimiento.creadoPor.nombre} ${movimiento.creadoPor.apellido || ''}`.trim()
            : null) ||
        (session?.creadoPor?.nombre
            ? `${session.creadoPor.nombre} ${session.creadoPor.apellido || ''}`.trim()
            : 'CAJERO DE TURNO');

    const fechaObj = movimiento.createdAt ? new Date(movimiento.createdAt) : new Date();
    const fechaFormateada = fechaObj.toLocaleDateString('es-HN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const horaFormateada = fechaObj.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(val || 0);

    const montoEnLetras = numeroALetrasHNL(Number(movimiento.monto) || 0);

    const handlePrint = () => {
        if (!printRef.current) return;
        const printContents = printRef.current.innerHTML;
        const win = window.open('', '_blank', 'width=850,height=900');
        if (!win) {
            window.print();
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <title>Comprobante de Remesa ${folio} - Paraíso Floral</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @page {
                        size: letter portrait;
                        margin: 12mm;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        color: #0f172a;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                </style>
            </head>
            <body class="p-4">
                ${printContents}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 350);
                    };
                </script>
            </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[110] p-3 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-auto">
                {/* Barra superior de acciones (No se imprime) */}
                <div className="bg-slate-900 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm sm:text-base">Comprobante de Entrega de Efectivo (Remesa)</h3>
                            <p className="text-[11px] text-slate-400">Listo para imprimir y firmar por Cajero y Responsable de Depósito</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir Comprobante</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Área imprimible del documento */}
                <div className="p-4 sm:p-8 max-h-[82vh] overflow-y-auto bg-slate-100/70">
                    <div
                        ref={printRef}
                        className="bg-white border-2 border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-900 shadow-sm"
                    >
                        {/* Encabezado Oficial */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
                            <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                                    CONTROL INTERNO DE TESORERÍA Y CAJA
                                </div>
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                                    DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.
                                </h1>
                                <p className="text-xs font-bold text-slate-600 uppercase">
                                    ACTA DE ENTREGA DE EFECTIVO PARA DEPÓSITO BANCARIO (REMESA)
                                </p>
                            </div>

                            <div className="sm:text-right bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 shrink-0">
                                <span className="text-[10px] font-black text-slate-500 uppercase block">N° Comprobante</span>
                                <span className="text-lg font-black text-slate-950 font-mono">{folio}</span>
                                <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                                    Ref. {turnoFolio}
                                </span>
                            </div>
                        </div>

                        {/* Bloque Destacado del Monto */}
                        <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                    CANTIDAD ENTREGADA EN LETRAS:
                                </span>
                                <p className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                                    *** {montoEnLetras} ***
                                </p>
                                <p className="text-[11px] font-semibold text-slate-600">
                                    Medio de Entrega: <strong className="text-slate-900 uppercase">{movimiento.metodoPago || 'EFECTIVO (BILLETES Y MONEDAS)'}</strong>
                                </p>
                            </div>
                            <div className="bg-white border-2 border-slate-900 rounded-xl px-5 py-3 text-right shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                    MONTO TOTAL A DEPOSITAR
                                </span>
                                <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                                    {formatCurrency(movimiento.monto)}
                                </span>
                            </div>
                        </div>

                        {/* Tabla de Detalles de la Entrega */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-300 rounded-xl p-4 bg-white">
                            <div className="space-y-0.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2.5 sm:pb-0 sm:pr-4">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Fecha y Hora de Salida de Caja:</span>
                                <p className="font-black text-slate-900 uppercase">{fechaFormateada} — {horaFormateada}</p>
                            </div>
                            <div className="space-y-0.5 sm:pl-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Banco / Destino de los Fondos:</span>
                                <p className="font-black text-slate-900 uppercase">{meta.bancoDestino}</p>
                            </div>
                            <div className="space-y-0.5 border-t border-slate-200 pt-2.5 sm:pr-4 sm:border-r">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Entregado por (Cajero de Turno):</span>
                                <p className="font-black text-slate-900 uppercase">{cajeroNombre}</p>
                            </div>
                            <div className="space-y-0.5 border-t border-slate-200 pt-2.5 sm:pl-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Recibido por (Responsable de Depósito):</span>
                                <p className="font-black text-slate-900 uppercase">{meta.entregadoA}</p>
                            </div>
                            <div className="sm:col-span-2 space-y-0.5 border-t border-slate-200 pt-2.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Concepto / Detalle de Origen de los Fondos:</span>
                                <p className="font-bold text-slate-800">{meta.notasLimpias || 'Retiro de efectivo de ventas de contado en caja para depósito bancario'}</p>
                            </div>
                        </div>

                        {/* Declaración de Conformidad */}
                        <div className="text-[11px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                            Por medio del presente documento se hace constar que el cajero de turno entregó la suma arriba detallada en efectivo, previamente contada y verificada a satisfacción por ambas partes, con el único propósito de ser depositada íntegramente en las cuentas bancarias de <strong>DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.</strong>
                        </div>

                        {/* Recuadro para llenar al regresar del banco y engrapar voucher */}
                        <div className="border-2 border-dashed border-slate-400 rounded-xl p-4 space-y-3 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                    CONTROL DE RETORNO DE VOUCHER / BOLETA BANCARIA (LLENAR AL REGRESAR DEL BANCO)
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                    📎 Engrapar boleta original aquí
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block">N° de Boleta / Referencia Banco:</span>
                                    <div className="border-b border-slate-400 h-6 flex items-end font-mono font-bold text-slate-900">
                                        {meta.referenciaBoleta || ''}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block">Hora de Depósito en Banco:</span>
                                    <div className="border-b border-slate-400 h-6"></div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block">Voucher Entregado a Caja:</span>
                                    <div className="h-6 flex items-center gap-4 pt-1 text-[11px] font-bold text-slate-700">
                                        <span>[ &nbsp; ] SÍ</span>
                                        <span>[ &nbsp; ] PENDIENTE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección de Firmas */}
                        <div className="grid grid-cols-3 gap-6 pt-12 pb-2 text-center text-xs">
                            <div className="space-y-1">
                                <div className="border-t-2 border-slate-800 pt-2">
                                    <p className="font-black text-slate-950 uppercase">{cajeroNombre}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">ENTREGUÉ CONFORME (CAJA)</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="border-t-2 border-slate-800 pt-2">
                                    <p className="font-black text-slate-950 uppercase">{meta.entregadoA}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">RECIBÍ CONFORME (DEPÓSITO)</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="border-t-2 border-slate-800 pt-2">
                                    <p className="font-black text-slate-950 uppercase">GERENCIA / AUDITORÍA</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">VERIFICADO CONTRA BOLETA</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pie del Modal */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                        Puedes volver a imprimir este comprobante en cualquier momento desde la tabla de Movimientos Extraordinarios.
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                            Cerrar
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir Ahora</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
