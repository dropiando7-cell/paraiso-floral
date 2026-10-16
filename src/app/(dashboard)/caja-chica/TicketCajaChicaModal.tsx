'use client'

import React from 'react'
import { X, Printer, Receipt, CheckCircle2 } from 'lucide-react'

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

    const handlePrintTicket = () => {
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
        .double-divider {
            border-top: 2px solid #000;
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

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
                {/* Top Action Bar */}
                <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                                Ticket de Caja Chica
                                <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full">
                                    {correlativo}
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-400">Formato térmico 80mm listo para imprimir y firmar</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Ticket Preview Area */}
                <div className="p-5 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
                    <div className="bg-white w-[300px] shadow-md border border-slate-300 p-4 font-mono text-[11px] text-slate-900 leading-snug select-all">
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

                {/* Footer Actions */}
                <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrintTicket}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Ticket (80mm)
                    </button>
                </div>
            </div>
        </div>
    )
}
