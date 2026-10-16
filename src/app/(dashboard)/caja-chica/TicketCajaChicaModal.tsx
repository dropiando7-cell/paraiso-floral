'use client'

import React, { useRef, useState } from 'react'
import { X, Printer, Receipt, FileText, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface TicketCajaChicaProps {
    isOpen: boolean
    onClose: () => void
    movimiento: {
        id?: string
        fecha?: string
        hora?: string
        createdAt?: string | Date
        tipo?: string
        categoria: string
        cuentaContable?: string
        descripcion: string
        documento: string
        nroDoc?: string | null
        importe: number
        moneda?: string
        total: number
        beneficiario?: string | null
        usuario?: string
        creadoPor?: {
            nombre?: string | null
            apellido?: string | null
            email?: string | null
        } | null
    } | null
    cajaNombre?: string
    responsableCaja?: string
}

function numeroALetrasHNL(num: number): string {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
    const especiales: Record<number, string> = {
        11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
        16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
        21: 'VEINTIÚN', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
        25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE'
    }
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

    function convertirGrupo(n: number): string {
        if (n === 0) return ''
        if (n === 100) return 'CIEN'
        let texto = ''
        const c = Math.floor(n / 100)
        const resto = n % 100
        if (c > 0) texto += centenas[c] + (resto > 0 ? ' ' : '')
        if (resto > 0) {
            if (especiales[resto]) {
                texto += especiales[resto]
            } else if (resto < 10) {
                texto += unidades[resto]
            } else {
                const d = Math.floor(resto / 10)
                const u = resto % 10
                texto += decenas[d] + (u > 0 ? ' Y ' + unidades[u] : '')
            }
        }
        return texto
    }

    const entero = Math.floor(Math.abs(num))
    const centavos = Math.round((Math.abs(num) - entero) * 100)
    const centavosStr = `${String(centavos).padStart(2, '0')}/100`

    if (entero === 0) return `CERO LEMPIRAS CON ${centavosStr}`

    let letras = ''
    const millones = Math.floor(entero / 1000000)
    const restoMillones = entero % 1000000
    const miles = Math.floor(restoMillones / 1000)
    const unidadesMil = restoMillones % 1000

    if (millones > 0) {
        letras += (millones === 1 ? 'UN MILLÓN' : `${convertirGrupo(millones)} MILLONES`) + ' '
    }
    if (miles > 0) {
        letras += (miles === 1 ? 'MIL' : `${convertirGrupo(miles)} MIL`) + ' '
    }
    if (unidadesMil > 0) {
        letras += convertirGrupo(unidadesMil)
    }

    return `${letras.trim()} LEMPIRAS CON ${centavosStr}`
}

export default function TicketCajaChicaModal({
    isOpen,
    onClose,
    movimiento,
    cajaNombre = 'Caja Chica Principal',
    responsableCaja = 'Cajero(a)'
}: TicketCajaChicaProps) {
    const cartaRef = useRef<HTMLDivElement>(null)
    const [formatoVista, setFormatoVista] = useState<'TICKET' | 'CARTA'>('TICKET')
    const [enviandoPrintServer, setEnviandoPrintServer] = useState(false)

    if (!isOpen || !movimiento) return null

    const monto = Number(movimiento.total || movimiento.importe || 0)
    const montoLetras = numeroALetrasHNL(monto)
    const correlativo = movimiento.nroDoc && movimiento.nroDoc !== 'S/N' ? movimiento.nroDoc : 'RC-S/N'

    // Format date & time
    let fechaStr = movimiento.fecha || ''
    let horaStr = movimiento.hora || ''
    if (!fechaStr && movimiento.createdAt) {
        const d = new Date(movimiento.createdAt)
        fechaStr = d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        horaStr = d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
    if (!fechaStr) {
        const now = new Date()
        fechaStr = now.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        horaStr = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }

    const cajeroNombre = movimiento.creadoPor
        ? `${movimiento.creadoPor.nombre || ''} ${movimiento.creadoPor.apellido || ''}`.trim() || movimiento.creadoPor.email || responsableCaja
        : movimiento.usuario || responsableCaja

    const beneficiarioStr = (movimiento.beneficiario || '').trim()

    // Enviar al Print Server (Impresora Térmica de Tickets 80mm)
    const handleSendToPrintServer = async () => {
        if (enviandoPrintServer) return
        setEnviandoPrintServer(true)
        const toastId = toast.loading('Enviando recibo al Print Server de Tickets...')
        try {
            const res = await fetch('/api/impresion/tickets/encolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoTicket: 'CAJA_CHICA',
                    ticketData: {
                        correlativo,
                        fechaISO: movimiento.createdAt ? new Date(movimiento.createdAt).toISOString() : new Date().toISOString(),
                        fechaHora: `${fechaStr} ${horaStr}`,
                        bancoDestino: movimiento.categoria || 'GASTO DE CAJA CHICA',
                        rubro: movimiento.categoria || 'GASTO DE CAJA CHICA',
                        cuentaContable: movimiento.cuentaContable || '',
                        metodoPago: 'EFECTIVO (CAJA CHICA)',
                        cajeroNombre,
                        responsableNombre: beneficiarioStr || 'PORTADOR / BENEFICIARIO',
                        concepto: movimiento.descripcion || 'GASTO DE CAJA CHICA',
                        referencia: correlativo,
                        monto,
                        montoLetras
                    }
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                toast.success('¡Ticket enviado a la impresora térmica!', { id: toastId })
            } else {
                toast.error(data.error || 'No se pudo enviar al Print Server', { id: toastId })
            }
        } catch (err) {
            console.error('Error enviando ticket de caja chica al Print Server:', err)
            toast.error('Error de conexión con el Print Server', { id: toastId })
        } finally {
            setEnviandoPrintServer(false)
        }
    }

    const handlePrintTicketBrowser = () => {
        const printWindow = window.open('', '_blank', 'width=380,height=680')
        if (!printWindow) {
            window.print()
            return
        }

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Ticket Caja Chica ${correlativo}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 2mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
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
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
        }
        .title {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .subtitle {
            font-size: 11px;
            font-weight: bold;
            margin-top: 2px;
        }
        .correlativo-box {
            border: 1.5px solid #000;
            padding: 4px 6px;
            margin: 6px 0;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
        }
        .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 10.5px;
        }
        .section-label {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 4px;
        }
        .concept-box {
            border: 1px solid #000;
            padding: 5px;
            margin: 4px 0;
            font-size: 11.5px;
            font-weight: bold;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .amount-box {
            border: 2px solid #000;
            padding: 6px;
            margin: 6px 0;
            text-align: center;
        }
        .amount-num {
            font-size: 16px;
            font-weight: bold;
        }
        .amount-words {
            font-size: 9.5px;
            margin-top: 3px;
            font-weight: bold;
        }
        .sig-space {
            margin-top: 26px;
            border-top: 1px solid #000;
            padding-top: 3px;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
        }
        .field-line {
            margin-top: 10px;
            font-size: 10px;
            font-weight: bold;
        }
        .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 9.5px;
        }
    </style>
</head>
<body>
    <div class="center">
        <div class="title">DISTRIBUIDORA PARAÍSO FLORAL</div>
        <div style="font-size: 10px;">S. DE R.L.</div>
        <div class="subtitle">VALE / RECIBO DE CAJA CHICA</div>
        <div style="font-size: 9.5px;">COMPROBANTE INTERNO DE EGRESO</div>
    </div>

    <div class="correlativo-box">
        N° ${correlativo}
    </div>

    <div class="row">
        <span>FECHA: <b>${fechaStr}</b></span>
        <span>HORA: <b>${horaStr}</b></span>
    </div>
    <div class="row">
        <span>CAJA:</span>
        <b>${cajaNombre.toUpperCase()}</b>
    </div>
    <div class="row">
        <span>TIPO DOC:</span>
        <b>${(movimiento.documento || 'RECIBO INTERNO').toUpperCase()}</b>
    </div>
    <div class="row">
        <span>RUBRO:</span>
        <b>${(movimiento.categoria || 'GASTO GENERAL').toUpperCase()}</b>
    </div>
    ${movimiento.cuentaContable ? `
    <div class="row">
        <span>CUENTA:</span>
        <b>${movimiento.cuentaContable}</b>
    </div>` : ''}

    <div class="divider"></div>

    <div class="section-label">MOTIVO / DETALLE DEL GASTO:</div>
    <div class="concept-box">${(movimiento.descripcion || 'SIN DESCRIPCIÓN').toUpperCase()}</div>

    <div class="amount-box">
        <div style="font-size: 10px;">TOTAL ENTREGADO (HNL)</div>
        <div class="amount-num">L. ${monto.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="amount-words">SON: ${montoLetras}</div>
    </div>

    <div class="divider"></div>

    <div style="font-size: 10.5px; margin: 4px 0;">
        <div><b>ENTREGADO POR (CAJA):</b></div>
        <div>${cajeroNombre.toUpperCase()}</div>
    </div>

    <div style="font-size: 10.5px; margin: 6px 0;">
        <div><b>RECIBIDO POR (BENEFICIARIO):</b></div>
        <div>${beneficiarioStr ? beneficiarioStr.toUpperCase() : '________________________________'}</div>
    </div>

    <div style="font-size: 9.5px; text-align: justify; margin: 6px 0;">
        Hago constar que he recibido de Caja Chica la suma arriba detallada para cubrir el gasto descrito en este comprobante.
    </div>

    <div class="sig-space">
        FIRMA DE RECIBIDO CONFORME
    </div>

    <div class="field-line">
        NOMBRE: ${beneficiarioStr ? beneficiarioStr.toUpperCase() : '________________________'}
    </div>
    <div class="field-line">
        IDENTIDAD: _____________________
    </div>

    <div class="sig-space" style="margin-top: 22px;">
        FIRMA CAJERO(A) / AUTORIZADO
    </div>

    <div class="divider"></div>
    <div class="footer">
        ERP PARAÍSO FLORAL • CONTROL CAJA CHICA<br/>
        Impreso: ${new Date().toLocaleString('es-HN')}
    </div>
</body>
</html>
        `

        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
        }, 250)
    }

    const handlePrintCarta = () => {
        if (!cartaRef.current) return
        const printContents = cartaRef.current.innerHTML
        const win = window.open('', '_blank', 'width=850,height=900')
        if (!win) {
            window.print()
            return
        }
        win.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <title>Recibo de Caja Chica ${correlativo} - Paraíso Floral</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @page { size: letter portrait; margin: 12mm; }
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
                        setTimeout(function() { window.print(); }, 350);
                    };
                </script>
            </body>
            </html>
        `)
        win.document.close()
    }

    return (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <div className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-full overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200 ${
                formatoVista === 'TICKET' ? 'max-w-lg' : 'max-w-3xl'
            }`}>
                {/* Top Action Bar */}
                <div className="px-5 py-4 bg-slate-900 text-white flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                                <Receipt className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                                    Recibo / Vale de Caja Chica
                                    <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full">
                                        {correlativo}
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-400">Impresión en Ticket Térmico (80mm) o Formato Carta</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
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
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            <span>Formato Carta</span>
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                {formatoVista === 'TICKET' ? (
                    <div className="p-5 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
                        <div className="bg-white w-[300px] shadow-md border border-slate-300 p-4 font-mono text-[11px] text-slate-900 leading-snug select-all rounded-xl">
                            <div className="text-center">
                                <p className="font-black text-xs tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</p>
                                <p className="text-[10px] text-slate-600">S. DE R.L.</p>
                                <p className="font-black text-[11px] mt-1">VALE / RECIBO DE CAJA CHICA</p>
                                <p className="text-[9.5px] text-slate-600">COMPROBANTE INTERNO DE EGRESO</p>
                            </div>

                            <div className="border-2 border-slate-900 py-1.5 px-2 my-2.5 text-center font-black text-sm bg-slate-50">
                                N° {correlativo}
                            </div>

                            <div className="space-y-0.5 text-[10.5px]">
                                <div className="flex justify-between">
                                    <span>FECHA: <b>{fechaStr}</b></span>
                                    <span>HORA: <b>{horaStr}</b></span>
                                </div>
                                <div className="flex justify-between">
                                    <span>CAJA:</span>
                                    <b className="text-right">{cajaNombre.toUpperCase()}</b>
                                </div>
                                <div className="flex justify-between">
                                    <span>DOCUMENTO:</span>
                                    <b className="text-right">{(movimiento.documento || 'RECIBO INTERNO').toUpperCase()}</b>
                                </div>
                                <div className="flex justify-between">
                                    <span>RUBRO:</span>
                                    <b className="text-right">{(movimiento.categoria || 'GASTO GENERAL').toUpperCase()}</b>
                                </div>
                                {movimiento.cuentaContable && (
                                    <div className="flex justify-between">
                                        <span>CUENTA:</span>
                                        <b className="text-right">{movimiento.cuentaContable}</b>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-dashed border-slate-900 my-2.5" />

                            <p className="text-[10px] font-black uppercase mb-1">MOTIVO / DETALLE DEL GASTO:</p>
                            <div className="border border-slate-900 p-2 font-bold text-xs bg-amber-50/40 break-words whitespace-pre-wrap">
                                {(movimiento.descripcion || 'SIN DESCRIPCIÓN').toUpperCase()}
                            </div>

                            <div className="border-2 border-slate-900 p-2.5 my-2.5 text-center bg-slate-50">
                                <p className="text-[9.5px] font-bold text-slate-600">TOTAL ENTREGADO (HNL)</p>
                                <p className="text-base font-black text-slate-950">
                                    L. {monto.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9.5px] font-bold mt-1 leading-tight">
                                    SON: {montoLetras}
                                </p>
                            </div>

                            <div className="border-t border-dashed border-slate-900 my-2.5" />

                            <div className="space-y-1.5 text-[10.5px]">
                                <div>
                                    <span className="font-bold block">ENTREGADO POR (CAJA):</span>
                                    <span>{cajeroNombre.toUpperCase()}</span>
                                </div>
                                <div>
                                    <span className="font-bold block">RECIBIDO POR (BENEFICIARIO):</span>
                                    <span>{beneficiarioStr ? beneficiarioStr.toUpperCase() : '________________________________'}</span>
                                </div>
                            </div>

                            <p className="text-[9.5px] text-justify my-2.5 text-slate-700">
                                Hago constar que he recibido de Caja Chica la suma arriba detallada para cubrir el gasto descrito en este comprobante.
                            </p>

                            <div className="mt-7 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                FIRMA DE RECIBIDO CONFORME
                            </div>

                            <div className="mt-2.5 font-bold text-[10px]">
                                NOMBRE: {beneficiarioStr ? beneficiarioStr.toUpperCase() : '________________________'}
                            </div>
                            <div className="mt-2 font-bold text-[10px]">
                                IDENTIDAD: _____________________
                            </div>

                            <div className="mt-6 border-t border-slate-900 pt-1 text-center font-bold text-[10px]">
                                FIRMA CAJERO(A) / AUTORIZADO
                            </div>

                            <div className="border-t border-dashed border-slate-900 my-2.5" />
                            <div className="text-center text-[9px] text-slate-500">
                                ERP PARAÍSO FLORAL • CONTROL CAJA CHICA
                            </div>
                        </div>
                    </div>
                ) : (
                    /* VISTA PREVIA FORMATO CARTA */
                    <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex-1">
                        <div
                            ref={cartaRef}
                            className="bg-white border-2 border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-900 shadow-sm"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-md">
                                        COMPROBANTE INTERNO DE CAJA CHICA
                                    </div>
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                                        DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.
                                    </h1>
                                    <p className="text-xs font-bold text-slate-600 uppercase">
                                        VALE / RECIBO INTERNO DE EGRESO DE CAJA CHICA
                                    </p>
                                </div>

                                <div className="sm:text-right bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 shrink-0">
                                    <span className="text-[10px] font-black text-slate-500 uppercase block">N° de Recibo</span>
                                    <span className="text-lg font-black text-slate-950 font-mono">{correlativo}</span>
                                    <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                                        {cajaNombre}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                        CANTIDAD ENTREGADA EN LETRAS:
                                    </span>
                                    <p className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                                        *** {montoLetras} ***
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-600">
                                        Rubro: <strong className="text-slate-900 uppercase">{movimiento.categoria}</strong>
                                        {movimiento.cuentaContable ? ` · Cuenta: ${movimiento.cuentaContable}` : ''}
                                    </p>
                                </div>
                                <div className="bg-white border-2 border-slate-900 rounded-xl px-5 py-3 text-right shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                        TOTAL ENTREGADO
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                                        L. {monto.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-300 rounded-xl p-4 bg-white">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Fecha y Hora de Emisión:</span>
                                    <p className="font-black text-slate-900 uppercase">{fechaStr} — {horaStr}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Tipo de Comprobante:</span>
                                    <p className="font-black text-slate-900 uppercase">{movimiento.documento || 'RECIBO INTERNO'}</p>
                                </div>
                                <div className="border-t border-slate-200 pt-2.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Entregado por (Caja Chica):</span>
                                    <p className="font-black text-slate-900 uppercase">{cajeroNombre}</p>
                                </div>
                                <div className="border-t border-slate-200 pt-2.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Recibido por (Beneficiario):</span>
                                    <p className="font-black text-slate-900 uppercase">{beneficiarioStr || 'PORTADOR / BENEFICIARIO'}</p>
                                </div>
                                <div className="sm:col-span-2 border-t border-slate-200 pt-2.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Motivo / Descripción del Gasto:</span>
                                    <p className="font-bold text-slate-900 uppercase">{movimiento.descripcion}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-12 pb-2 text-center text-xs">
                                <div className="border-t-2 border-slate-800 pt-2">
                                    <p className="font-black text-slate-950 uppercase">{cajeroNombre}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">ENTREGADO POR (CAJA CHICA)</p>
                                </div>
                                <div className="border-t-2 border-slate-800 pt-2">
                                    <p className="font-black text-slate-950 uppercase">{beneficiarioStr || 'FIRMA DE RECIBIDO CONFORME'}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">RECIBÍ CONFORME · IDENTIDAD: ___________________</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="px-5 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                        Cerrar
                    </button>

                    {formatoVista === 'TICKET' ? (
                        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                            <button
                                onClick={handlePrintTicketBrowser}
                                className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                                title="Abrir diálogo de impresión del navegador en 80mm"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Diálogo Navegador</span>
                            </button>
                            <button
                                onClick={handleSendToPrintServer}
                                disabled={enviandoPrintServer}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>{enviandoPrintServer ? 'Enviando...' : 'Imprimir en Impresora de Ticket'}</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handlePrintCarta}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                            <Printer className="w-4 h-4 text-amber-400" />
                            <span>Imprimir en Formato Carta</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
