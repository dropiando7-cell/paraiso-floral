'use client';

import React, { useRef, useState } from 'react';
import { Printer, X, Banknote, Receipt, FileText, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    const esGastoRuta = mov.concepto === 'GASTO_RUTA';
    let bancoDestino = esGastoRuta ? 'GASTO OPERATIVO DE RUTA / VENTAS' : 'DEPÓSITO BANCARIO GENERAL';
    let entregadoA = '';
    let referenciaBoleta = '';
    let efectivoDeclarado = 0;
    let notasLimpias = mov.descripcion || '';

    // Si referenciaId tiene formato estructurado: "BANCO:...|ENTREGADO:...|REF:..." o "CATEGORIA:...|ENTREGADO:...|DECLARADO:...|REF:..."
    const refRaw = mov.referenciaId || '';
    if (refRaw.includes('BANCO:') || refRaw.includes('CATEGORIA:') || refRaw.includes('ENTREGADO:')) {
        const parts = refRaw.split('|');
        for (const p of parts) {
            const [k, ...vArr] = p.split(':');
            const val = vArr.join(':').trim();
            if ((k === 'BANCO' || k === 'CATEGORIA') && val) bancoDestino = val;
            if (k === 'ENTREGADO' && val) entregadoA = val;
            if (k === 'DECLARADO' && val) {
                const parsed = parseFloat(val);
                if (!isNaN(parsed) && parsed > 0) efectivoDeclarado = parsed;
            }
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
        entregadoA: entregadoA || (esGastoRuta ? 'VENDEDOR / MOTORISTA DE RUTA' : 'ENCARGADO DE DEPÓSITO / GERENCIA'),
        referenciaBoleta,
        efectivoDeclarado,
        notasLimpias
    };
}

export default function ComprobanteRemesaModal({ movimiento, session, onClose }: ComprobanteRemesaModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [formatoVista, setFormatoVista] = useState<'TICKET' | 'CARTA'>('TICKET');
    const [enviandoPrintServer, setEnviandoPrintServer] = useState(false);

    const esGastoRuta = movimiento.concepto === 'GASTO_RUTA';
    const meta = parseRemesaMetadata(movimiento);
    const prefijoFolio = esGastoRuta ? 'GRS' : 'REM';
    const folio = `${prefijoFolio}-${movimiento.id.substring(0, 8).toUpperCase()}`;
    const turnoFolio = session?.id ? `TURNO-${session.id.substring(0, 6).toUpperCase()}` : 'TURNO ACTIVO';

    const cajeroNombre =
        (movimiento.creadoPor?.nombre
            ? `${movimiento.creadoPor.nombre} ${movimiento.creadoPor.apellido || ''}`.trim()
            : null) ||
        (session?.creadoPor?.nombre
            ? `${session.creadoPor.nombre} ${session.creadoPor.apellido || ''}`.trim()
            : 'CAJERO DE TURNO');

    const fechaObj = movimiento.createdAt ? new Date(movimiento.createdAt) : new Date();
    const fechaCorta = fechaObj.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
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

    const montoNum = Number(movimiento.monto) || 0;
    const montoEnLetras = numeroALetrasHNL(montoNum);
    const conceptoTexto =
        meta.notasLimpias ||
        (esGastoRuta
            ? 'Gasto operativo de ruta descontado del efectivo recaudado de ventas del día'
            : 'Retiro de efectivo de ventas de contado en caja para depósito bancario');

    const efectivoNetoRuta = meta.efectivoDeclarado > 0 ? Math.max(0, meta.efectivoDeclarado - montoNum) : 0;

    // Enviar a Print Server (Cola de Tickets 80mm)
    const handleSendToPrintServer = async () => {
        if (enviandoPrintServer) return;
        setEnviandoPrintServer(true);
        const toastId = toast.loading(
            esGastoRuta
                ? 'Enviando ticket de gasto de ruta al Print Server...'
                : 'Enviando ticket de remesa al Print Server...'
        );
        try {
            const detalleConceptoPrint =
                esGastoRuta && meta.efectivoDeclarado > 0
                    ? `${conceptoTexto} | EFECTIVO BRUTO RUTA: ${formatCurrency(meta.efectivoDeclarado)} - GASTO: ${formatCurrency(montoNum)} = NETO ENTREGADO: ${formatCurrency(efectivoNetoRuta)}`
                    : conceptoTexto;

            const res = await fetch('/api/impresion/tickets/encolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoTicket: esGastoRuta ? 'CAJA_CHICA' : 'REMESA',
                    ticketData: {
                        correlativo: folio,
                        fechaISO: fechaObj.toISOString(),
                        fechaHora: `${fechaCorta} ${horaFormateada}`,
                        bancoDestino: meta.bancoDestino,
                        rubro: meta.bancoDestino,
                        metodoPago: movimiento.metodoPago || 'EFECTIVO',
                        cajeroNombre,
                        responsableNombre: meta.entregadoA,
                        concepto: detalleConceptoPrint,
                        referencia: meta.referenciaBoleta || '',
                        monto: montoNum,
                        montoLetras: montoEnLetras,
                        esGastoRuta,
                        efectivoDeclarado: meta.efectivoDeclarado || 0,
                        efectivoNetoRuta
                    }
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('¡Ticket enviado a la impresora térmica!', { id: toastId });
            } else {
                toast.error(data.error || 'No se pudo encolar en el Print Server', { id: toastId });
            }
        } catch (err) {
            console.error('Error enviando al Print Server:', err);
            toast.error('Error de conexión al enviar al Print Server', { id: toastId });
        } finally {
            setEnviandoPrintServer(false);
        }
    };

    // Impresión directa navegador en formato Ticket 80mm
    const handlePrintTicketBrowser = () => {
        const win = window.open('', '_blank', 'width=380,height=740');
        if (!win) {
            window.print();
            return;
        }
        const tituloDoc = esGastoRuta
            ? 'RECIBO DE GASTO DE RUTA / VENTAS'
            : 'COMPROBANTE DE ENTREGA / REMESA';
        const subtituloDoc = esGastoRuta
            ? 'DECLARACION DE FONDOS Y GASTOS DE VENDEDOR'
            : 'CONTROL INTERNO DE TESORERIA Y CAJA';
        const labelDestino = esGastoRuta ? 'CONCEPTO/RUBRO:' : 'DESTINO:';
        const labelMonto = esGastoRuta
            ? 'MONTO DEL GASTO DEDUCIDO EN RUTA (HNL)'
            : 'MONTO TOTAL A DEPOSITAR (HNL)';

        win.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <title>Ticket ${folio}</title>
                <style>
                    @page { size: 80mm auto; margin: 2mm; }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: 74mm;
                        margin: 0 auto;
                        padding: 2mm 1mm;
                        color: #000;
                        background: #fff;
                        font-size: 11px;
                        line-height: 1.35;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .correlativo-box {
                        border: 1.5px solid #000;
                        padding: 4px 6px;
                        margin: 6px 0;
                        text-align: center;
                        font-size: 13px;
                        font-weight: bold;
                    }
                    .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10.5px; }
                    .concept-box {
                        border: 1px solid #000;
                        padding: 5px;
                        margin: 4px 0;
                        font-size: 11px;
                        font-weight: bold;
                        word-wrap: break-word;
                    }
                    .amount-box {
                        border: 2px solid #000;
                        padding: 6px;
                        margin: 6px 0;
                        text-align: center;
                    }
                    .sig-space {
                        margin-top: 26px;
                        border-top: 1px solid #000;
                        padding-top: 3px;
                        text-align: center;
                        font-size: 10px;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="center">
                    <div style="font-size:13px;font-weight:bold;">DISTRIBUIDORA PARAÍSO FLORAL</div>
                    <div style="font-size:10px;">S. DE R.L.</div>
                    <div style="font-size:11px;font-weight:bold;margin-top:2px;">${tituloDoc}</div>
                    <div style="font-size:9.5px;">${subtituloDoc}</div>
                </div>
                <div class="correlativo-box">N° ${folio} (${turnoFolio})</div>
                <div class="row"><span>FECHA: <b>${fechaCorta}</b></span><span>HORA: <b>${horaFormateada}</b></span></div>
                <div class="row"><span>${labelDestino}</span><b>${meta.bancoDestino}</b></div>
                <div class="row"><span>MEDIO:</span><b>${(movimiento.metodoPago || 'EFECTIVO').toUpperCase()}</b></div>
                ${meta.referenciaBoleta ? `<div class="row"><span>REF/SOPORTE:</span><b>${meta.referenciaBoleta}</b></div>` : ''}
                <div class="divider"></div>
                <div style="font-size:10px;font-weight:bold;">${esGastoRuta ? 'DETALLE DE GASTOS DECLARADOS:' : 'CONCEPTO / DETALLE DE ORIGEN:'}</div>
                <div class="concept-box">${conceptoTexto.toUpperCase()}</div>
                ${
                    esGastoRuta && meta.efectivoDeclarado > 0
                        ? `
                        <div style="border:1px dashed #000;padding:5px;margin:5px 0;font-size:10px;">
                            <div class="row"><span>EFECTIVO BRUTO RUTA:</span><b>${formatCurrency(meta.efectivoDeclarado)}</b></div>
                            <div class="row"><span>(-) GASTOS DE RUTA:</span><b>-${formatCurrency(montoNum)}</b></div>
                            <div class="row" style="border-top:1px solid #000;padding-top:2px;margin-top:2px;"><span>(=) NETO ENTREGADO:</span><b>${formatCurrency(efectivoNetoRuta)}</b></div>
                        </div>
                        `
                        : ''
                }
                <div class="amount-box">
                    <div style="font-size:10px;">${labelMonto}</div>
                    <div style="font-size:16px;font-weight:bold;">${formatCurrency(montoNum)}</div>
                    <div style="font-size:9.5px;margin-top:3px;font-weight:bold;">SON: ${montoEnLetras}</div>
                </div>
                <div class="divider"></div>
                ${
                    esGastoRuta
                        ? `
                        <div style="font-size:10.5px;margin:4px 0;"><b>DECLARADO POR (VENDEDOR / RUTA):</b><br/>${meta.entregadoA.toUpperCase()}</div>
                        <div style="font-size:10.5px;margin:6px 0;"><b>RECIBIDO / REBAJADO EN CAJA POR:</b><br/>${cajeroNombre.toUpperCase()}</div>
                        <div class="sig-space">${meta.entregadoA.toUpperCase()}<br/>FIRMA VENDEDOR (FONDOS DECLARADOS)</div>
                        <div class="sig-space">${cajeroNombre.toUpperCase()}<br/>FIRMA CAJA DE VENTAS</div>
                        <div class="sig-space">GERENCIA / AUDITORÍA<br/>AUTORIZADO Y VERIFICADO</div>
                        `
                        : `
                        <div style="font-size:10.5px;margin:4px 0;"><b>ENTREGADO POR (CAJA):</b><br/>${cajeroNombre.toUpperCase()}</div>
                        <div style="font-size:10.5px;margin:6px 0;"><b>RECIBIDO POR (DEPÓSITO):</b><br/>${meta.entregadoA.toUpperCase()}</div>
                        <div class="divider"></div>
                        <div style="font-size:10px;font-weight:bold;">CONTROL RETORNO DE VOUCHER:</div>
                        <div style="font-size:10px;margin-top:4px;">N° BOLETA: ${meta.referenciaBoleta || '_____________________'}</div>
                        <div style="font-size:10px;margin-top:4px;">HORA DEPÓSITO: _________________</div>
                        <div class="sig-space">${cajeroNombre.toUpperCase()}<br/>ENTREGUÉ CONFORME (CAJA)</div>
                        <div class="sig-space">${meta.entregadoA.toUpperCase()}<br/>RECIBÍ CONFORME (DEPÓSITO)</div>
                        <div class="sig-space">GERENCIA / AUDITORÍA<br/>VERIFICADO CONTRA BOLETA</div>
                        `
                }
            </body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 250);
    };

    // Impresión en Formato Carta (Navegador)
    const handlePrintCarta = () => {
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
                <title>Comprobante ${folio} - Paraíso Floral</title>
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
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[110] p-3 sm:p-6 overflow-y-auto animate-fade-in">
            <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full overflow-hidden my-auto transition-all duration-200 ${
                formatoVista === 'TICKET' ? 'max-w-lg' : 'max-w-3xl'
            }`}>
                {/* Barra superior de acciones y selector de formato */}
                <div className="bg-slate-900 px-5 py-4 text-white flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${esGastoRuta ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                                    {esGastoRuta ? 'Ticket de Gasto de Ruta / Ventas' : 'Comprobante de Entrega (Remesa)'}
                                    <span className={`px-2 py-0.5 text-[10px] font-mono font-black rounded-full ${esGastoRuta ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
                                        {folio}
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    {esGastoRuta
                                        ? 'Comprobante para firma del vendedor por gastos descontados de ventas en efectivo'
                                        : 'Elige vista previa en Ticket (80mm) o Formato Carta'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Selector de Formato: Ticket 80mm vs Carta */}
                    <div className="flex items-center justify-between gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                        <button
                            type="button"
                            onClick={() => setFormatoVista('TICKET')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                formatoVista === 'TICKET'
                                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <Receipt className="w-4 h-4" />
                            <span>Vista Ticket (80mm)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormatoVista('CARTA')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                formatoVista === 'CARTA'
                                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            <span>Formato Carta</span>
                        </button>
                    </div>
                </div>

                {/* CONTENIDO DE VISTA PREVIA EN MODAL */}
                {formatoVista === 'TICKET' ? (
                    <div className="p-5 max-h-[72vh] overflow-y-auto bg-slate-100 flex justify-center">
                        <div className="bg-white w-[310px] shadow-lg border border-slate-300 p-4 font-mono text-[11px] text-slate-900 leading-snug select-all rounded-xl">
                            <div className="text-center">
                                <p className="font-black text-xs tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</p>
                                <p className="text-[10px] text-slate-600">S. DE R.L.</p>
                                <p className="font-black text-[11px] mt-1">
                                    {esGastoRuta ? 'RECIBO DE GASTO DE RUTA / VENTAS' : 'COMPROBANTE DE ENTREGA / REMESA'}
                                </p>
                                <p className="text-[9.5px] text-slate-600">
                                    {esGastoRuta ? 'DECLARACIÓN DE GASTOS DE VENDEDOR' : 'CONTROL DE TESORERÍA Y CAJA'}
                                </p>
                            </div>

                            <div className="border-2 border-slate-900 py-1.5 px-2 my-2.5 text-center font-black text-xs bg-slate-50">
                                N° {folio} <span className="text-[10px] font-normal block">Ref. {turnoFolio}</span>
                            </div>

                            <div className="space-y-0.5 text-[10.5px]">
                                <div className="flex justify-between">
                                    <span>FECHA: <b>{fechaCorta}</b></span>
                                    <span>HORA: <b>{horaFormateada}</b></span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span>{esGastoRuta ? 'RUBRO / CONCEPTO:' : 'DESTINO:'}</span>
                                    <b className="text-right">{meta.bancoDestino.toUpperCase()}</b>
                                </div>
                                <div className="flex justify-between">
                                    <span>MEDIO:</span>
                                    <b className="text-right">{(movimiento.metodoPago || 'EFECTIVO').toUpperCase()}</b>
                                </div>
                                {meta.referenciaBoleta && (
                                    <div className="flex justify-between">
                                        <span>{esGastoRuta ? 'SOPORTE / REF:' : 'REF / BOLETA:'}</span>
                                        <b className="text-right">{meta.referenciaBoleta}</b>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-dashed border-slate-900 my-2.5" />

                            <p className="text-[10px] font-black uppercase mb-1">
                                {esGastoRuta ? 'DETALLE DEL GASTO DECLARADO:' : 'CONCEPTO / ORIGEN DE FONDOS:'}
                            </p>
                            <div className={`border border-slate-900 p-2 font-bold text-xs break-words whitespace-pre-wrap ${esGastoRuta ? 'bg-amber-50/50' : 'bg-emerald-50/40'}`}>
                                {conceptoTexto.toUpperCase()}
                            </div>

                            {esGastoRuta && meta.efectivoDeclarado > 0 && (
                                <div className="border border-dashed border-slate-800 p-2 my-2 bg-slate-50 text-[10px] space-y-0.5">
                                    <p className="font-black text-[9.5px] uppercase text-slate-600 mb-1">ARQUEO DE RUTA DECLARADO:</p>
                                    <div className="flex justify-between">
                                        <span>EFECTIVO BRUTO VENTAS:</span>
                                        <b>{formatCurrency(meta.efectivoDeclarado)}</b>
                                    </div>
                                    <div className="flex justify-between text-rose-700">
                                        <span>(-) GASTOS EN RUTA:</span>
                                        <b>-{formatCurrency(montoNum)}</b>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-400 pt-1 mt-1 font-black text-slate-950">
                                        <span>(=) EFECTIVO NETO:</span>
                                        <b>{formatCurrency(efectivoNetoRuta)}</b>
                                    </div>
                                </div>
                            )}

                            <div className="border-2 border-slate-900 p-2.5 my-2.5 text-center bg-slate-50">
                                <p className="text-[9.5px] font-bold text-slate-600">
                                    {esGastoRuta ? 'MONTO DEL GASTO REBAJADO DE CAJA (HNL)' : 'MONTO TOTAL A DEPOSITAR (HNL)'}
                                </p>
                                <p className="text-base font-black text-slate-950">
                                    {formatCurrency(montoNum)}
                                </p>
                                <p className="text-[9.5px] font-bold mt-1 leading-tight">
                                    SON: {montoEnLetras}
                                </p>
                            </div>

                            <div className="border-t border-dashed border-slate-900 my-2.5" />

                            {esGastoRuta ? (
                                <>
                                    <div className="space-y-1.5 text-[10.5px]">
                                        <div>
                                            <span className="font-bold block">DECLARADO POR (VENDEDOR / RUTA):</span>
                                            <span>{meta.entregadoA.toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold block">REGISTRADO EN CAJA DE VENTAS POR:</span>
                                            <span>{cajeroNombre.toUpperCase()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                        {meta.entregadoA.toUpperCase()}
                                        <span className="block text-[9px] font-normal">FIRMA VENDEDOR (FONDOS Y GASTOS DECLARADOS)</span>
                                    </div>

                                    <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                        {cajeroNombre.toUpperCase()}
                                        <span className="block text-[9px] font-normal">FIRMA CAJA DE VENTAS (REBAJADO CONFORME)</span>
                                    </div>

                                    <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                        GERENCIA / AUDITORÍA
                                        <span className="block text-[9px] font-normal">VERIFICADO CONFORME</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5 text-[10.5px]">
                                        <div>
                                            <span className="font-bold block">ENTREGADO POR (CAJERO DE TURNO):</span>
                                            <span>{cajeroNombre.toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold block">RECIBIDO POR (RESPONSABLE DEPÓSITO):</span>
                                            <span>{meta.entregadoA.toUpperCase()}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-slate-900 my-2.5" />

                                    <div className="text-[10px] space-y-1">
                                        <p className="font-black">CONTROL RETORNO DE VOUCHER:</p>
                                        <p>N° BOLETA: {meta.referenciaBoleta || '_____________________'}</p>
                                        <p>HORA DEPÓSITO: _________________</p>
                                    </div>

                                    <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                        {cajeroNombre.toUpperCase()}
                                        <span className="block text-[9px] font-normal">ENTREGUÉ CONFORME (CAJA)</span>
                                    </div>

                                    <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                        {meta.entregadoA.toUpperCase()}
                                        <span className="block text-[9px] font-normal">RECIBÍ CONFORME (DEPÓSITO)</span>
                                    </div>

                                    <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                        GERENCIA / AUDITORÍA
                                        <span className="block text-[9px] font-normal">VERIFICADO CONTRA BOLETA</span>
                                    </div>
                                </>
                            )}

                            <div className="border-t border-dashed border-slate-900 my-2.5" />
                            <div className="text-center text-[9px] text-slate-500">
                                ERP PARAÍSO FLORAL • CONTROL DE CAJA
                            </div>
                        </div>
                    </div>
                ) : (
                    /* VISTA PREVIA FORMATO CARTA */
                    <div className="p-4 sm:p-8 max-h-[72vh] overflow-y-auto bg-slate-100/70">
                        <div
                            ref={printRef}
                            className="bg-white border-2 border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-900 shadow-sm"
                        >
                            {/* Encabezado Oficial */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                                        CONTROL INTERNO DE TESORERÍA Y CAJA DE VENTAS
                                    </div>
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                                        DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.
                                    </h1>
                                    <p className="text-xs font-bold text-slate-600 uppercase">
                                        {esGastoRuta
                                            ? 'CONSTANCIA DE GASTOS OPERATIVOS DE RUTA DESCONTADOS DE EFECTIVO DE VENTAS'
                                            : 'ACTA DE ENTREGA DE EFECTIVO PARA DEPÓSITO BANCARIO (REMESA)'}
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
                                        {esGastoRuta ? 'CANTIDAD DEL GASTO EN LETRAS:' : 'CANTIDAD ENTREGADA EN LETRAS:'}
                                    </span>
                                    <p className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                                        *** {montoEnLetras} ***
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-600">
                                        Medio: <strong className="text-slate-900 uppercase">{movimiento.metodoPago || 'EFECTIVO (GAVETA / RUTA)'}</strong>
                                    </p>
                                </div>
                                <div className="bg-white border-2 border-slate-900 rounded-xl px-5 py-3 text-right shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                        {esGastoRuta ? 'MONTO DEL GASTO REBAJADO' : 'MONTO TOTAL A DEPOSITAR'}
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                                        {formatCurrency(movimiento.monto)}
                                    </span>
                                </div>
                            </div>

                            {esGastoRuta && meta.efectivoDeclarado > 0 && (
                                <div className="grid grid-cols-3 gap-3 bg-amber-50/60 border border-amber-300 rounded-xl p-4 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Efectivo Bruto Hoja / Facturas:</span>
                                        <span className="text-base font-black text-slate-900">{formatCurrency(meta.efectivoDeclarado)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-rose-600 uppercase block">(-) Gasto Declarado en Ruta:</span>
                                        <span className="text-base font-black text-rose-700">-{formatCurrency(montoNum)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">(=) Efectivo Neto Entregado:</span>
                                        <span className="text-base font-black text-emerald-900">{formatCurrency(efectivoNetoRuta)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Tabla de Detalles de la Entrega */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-300 rounded-xl p-4 bg-white">
                                <div className="space-y-0.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2.5 sm:pb-0 sm:pr-4">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Fecha y Hora de Registro:</span>
                                    <p className="font-black text-slate-900 uppercase">{fechaFormateada} — {horaFormateada}</p>
                                </div>
                                <div className="space-y-0.5 sm:pl-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                        {esGastoRuta ? 'Categoría / Rubro del Gasto:' : 'Banco / Destino de los Fondos:'}
                                    </span>
                                    <p className="font-black text-slate-900 uppercase">{meta.bancoDestino}</p>
                                </div>
                                <div className="space-y-0.5 border-t border-slate-200 pt-2.5 sm:pr-4 sm:border-r">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                        {esGastoRuta ? 'Registrado en Caja por:' : 'Entregado por (Cajero de Turno):'}
                                    </span>
                                    <p className="font-black text-slate-900 uppercase">{cajeroNombre}</p>
                                </div>
                                <div className="space-y-0.5 border-t border-slate-200 pt-2.5 sm:pl-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                        {esGastoRuta ? 'Declarado por (Vendedor / Ruta):' : 'Recibido por (Responsable de Depósito):'}
                                    </span>
                                    <p className="font-black text-slate-900 uppercase">{meta.entregadoA}</p>
                                </div>
                                <div className="sm:col-span-2 space-y-0.5 border-t border-slate-200 pt-2.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                        {esGastoRuta ? 'Detalle de los Gastos Declarados:' : 'Concepto / Detalle de Origen de los Fondos:'}
                                    </span>
                                    <p className="font-bold text-slate-800">{conceptoTexto}</p>
                                </div>
                            </div>

                            {/* Declaración de Conformidad */}
                            <div className="text-[11px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                {esGastoRuta ? (
                                    <>
                                        Por medio del presente documento el vendedor/encargado de ruta declara haber utilizado la suma arriba detallada para cubrir gastos operativos de ruta (combustible, alimentación, viáticos u otros), descontados directamente del efectivo recaudado de las facturas y abonos del día de <strong>DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.</strong>
                                    </>
                                ) : (
                                    <>
                                        Por medio del presente documento se hace constar que el cajero de turno entregó la suma arriba detallada en efectivo, previamente contada y verificada a satisfacción por ambas partes, con el único propósito de ser depositada íntegramente en las cuentas bancarias de <strong>DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.</strong>
                                    </>
                                )}
                            </div>

                            {!esGastoRuta && (
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
                            )}

                            {/* Sección de Firmas */}
                            <div className="grid grid-cols-3 gap-6 pt-12 pb-2 text-center text-xs">
                                <div className="space-y-1">
                                    <div className="border-t-2 border-slate-800 pt-2">
                                        <p className="font-black text-slate-950 uppercase">
                                            {esGastoRuta ? meta.entregadoA : cajeroNombre}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">
                                            {esGastoRuta ? 'FIRMA VENDEDOR (FONDOS DECLARADOS)' : 'ENTREGUÉ CONFORME (CAJA)'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="border-t-2 border-slate-800 pt-2">
                                        <p className="font-black text-slate-950 uppercase">
                                            {esGastoRuta ? cajeroNombre : meta.entregadoA}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">
                                            {esGastoRuta ? 'RECIBÍ Y REBAJÉ EN CAJA' : 'RECIBÍ CONFORME (DEPÓSITO)'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="border-t-2 border-slate-800 pt-2">
                                        <p className="font-black text-slate-950 uppercase">GERENCIA / AUDITORÍA</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">VERIFICADO CONFORME</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pie del Modal con botones según formato activo */}
                <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                        Cerrar
                    </button>

                    {formatoVista === 'TICKET' ? (
                        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                            <button
                                type="button"
                                onClick={handlePrintTicketBrowser}
                                className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                                title="Abrir diálogo de impresión del navegador en 80mm"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Diálogo Navegador</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSendToPrintServer}
                                disabled={enviandoPrintServer}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>{enviandoPrintServer ? 'Enviando...' : 'Imprimir en Impresora de Ticket'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePrintCarta}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
                            >
                                <Printer className="w-4 h-4 text-emerald-400" />
                                <span>Imprimir en Formato Carta</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
