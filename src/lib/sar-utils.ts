// Utilidades para Gestión de Bloques CAI SAR (Honduras), Transición Automática por Rango e Integridad Histórica

export interface SarBlockConfig {
    cai: string;
    establecimiento: string;
    puntoEmision: string;
    tipoDocumento: string;
    rangoInicial: string;
    rangoFinal: string;
    fechaLimiteEmision: string;
    siguienteCorrelativo?: number;
    correlativoInicial?: number;
    correlativoFinal?: number;
    habilitado?: boolean;
    cerradoEn?: string;
}

// Bloque Histórico 1 (Autorizado hasta correlativo 4000)
export const PARAISO_FLORAL_SAR_BLOCK_4000: SarBlockConfig = {
    cai: '59E2BE-0CEE4D-D2A4E0-63BE03-09094F-EB',
    establecimiento: '000',
    puntoEmision: '001',
    tipoDocumento: '01',
    rangoInicial: '000-001-01-00003001',
    rangoFinal: '000-001-01-00004000',
    fechaLimiteEmision: '2027-08-25',
    correlativoInicial: 1,
    correlativoFinal: 4000,
};

// Bloque Aprobado SAR-927 (Autorizado del 4001 al 5000)
export const PARAISO_FLORAL_SAR_BLOCK_4001_5000: SarBlockConfig = {
    cai: '5E202E-DA26A0-305DE0-63BE03-0909B6-00',
    establecimiento: '000',
    puntoEmision: '001',
    tipoDocumento: '01',
    rangoInicial: '000-001-01-00004001',
    rangoFinal: '000-001-01-00005000',
    fechaLimiteEmision: '2027-10-18',
    siguienteCorrelativo: 4001,
    correlativoInicial: 4001,
    correlativoFinal: 5000,
    habilitado: true,
};

/**
 * Extrae el número secuencial (últimos 8 dígitos) de un correlativo o rango SAR (ej. "000-001-01-00004000" -> 4000)
 */
export function parseSarSequenceNumber(correlativoOrRange?: string | null): number | null {
    if (!correlativoOrRange || typeof correlativoOrRange !== 'string') return null;
    const trimmed = correlativoOrRange.trim();
    if (!trimmed) return null;

    // Formato oficial SAR: XXX-XXX-XX-XXXXXXXX
    const sarMatch = trimmed.match(/^\d{3}-\d{3}-\d{2}-(\d{1,8})$/);
    if (sarMatch) {
        const parsed = parseInt(sarMatch[1], 10);
        return isNaN(parsed) ? null : parsed;
    }

    // Solo dígitos (ej. "00004000" o "4000")
    if (/^\d+$/.test(trimmed)) {
        const parsed = parseInt(trimmed, 10);
        return isNaN(parsed) ? null : parsed;
    }

    return null;
}

/**
 * Hidrata la configuración SAR asegurando que el próximo bloque aprobado (4001-5000)
 * esté en cola si el bloque actual es el que termina en 4000.
 */
export function hydrateSarConfigWithDefaultQueue(rawSarConfig: any): any {
    if (!rawSarConfig || typeof rawSarConfig !== 'object') return rawSarConfig;

    const config = { ...rawSarConfig };
    const currentCai = String(config.cai || '').trim().toUpperCase();
    const currentRangoFinalNum = parseSarSequenceNumber(config.rangoFinal);

    const isBlock4000Active =
        currentCai === PARAISO_FLORAL_SAR_BLOCK_4000.cai ||
        (currentRangoFinalNum === 4000 && currentCai !== PARAISO_FLORAL_SAR_BLOCK_4001_5000.cai);

    if (isBlock4000Active) {
        if (!config.rangoFinal || !String(config.rangoFinal).trim()) {
            config.rangoFinal = PARAISO_FLORAL_SAR_BLOCK_4000.rangoFinal;
        }
        if (!config.rangoInicial || !String(config.rangoInicial).trim()) {
            config.rangoInicial = PARAISO_FLORAL_SAR_BLOCK_4000.rangoInicial;
        }
        if (!config.fechaLimiteEmision) {
            config.fechaLimiteEmision = PARAISO_FLORAL_SAR_BLOCK_4000.fechaLimiteEmision;
        }

        // Si aún no tiene próximo CAI configurado, precargar automáticamente el bloque 4001-5000 aprobado por el SAR
        if (!config.proximoCai || !config.proximoCai.cai || !String(config.proximoCai.cai).trim()) {
            config.proximoCai = { ...PARAISO_FLORAL_SAR_BLOCK_4001_5000 };
        }
    }

    if (!Array.isArray(config.historialCais)) {
        config.historialCais = [];
    }

    return config;
}

/**
 * Evalúa si el siguiente secuencial a emitir supera el rangoFinal del CAI activo (ej. > 4000).
 * Si supera el límite y existe `proximoCai` habilitado, promueve automáticamente el nuevo CAI
 * y archiva el bloque anterior en `historialCais`.
 */
export function resolveSarRolloverForNextSequence(
    rawSarConfig: any,
    nextSeqCandidate: number
): {
    activeSarConfig: any;
    effectiveSeq: number;
    didRollover: boolean;
} {
    const sarConfig = hydrateSarConfigWithDefaultQueue(rawSarConfig);
    if (!sarConfig || !sarConfig.cai) {
        return { activeSarConfig: sarConfig, effectiveSeq: nextSeqCandidate, didRollover: false };
    }

    const rangoFinalActualNum = parseSarSequenceNumber(sarConfig.rangoFinal);
    const proximo = sarConfig.proximoCai;
    const hasValidProximo =
        proximo &&
        proximo.habilitado !== false &&
        typeof proximo.cai === 'string' &&
        proximo.cai.trim().length > 0;

    if (rangoFinalActualNum !== null && nextSeqCandidate > rangoFinalActualNum && hasValidProximo) {
        const previousBlockArchive: SarBlockConfig = {
            cai: String(sarConfig.cai).trim().toUpperCase(),
            establecimiento: String(sarConfig.establecimiento || '000').padStart(3, '0').slice(-3),
            puntoEmision: String(sarConfig.puntoEmision || '001').padStart(3, '0').slice(-3),
            tipoDocumento: String(sarConfig.tipoDocumento || '01').padStart(2, '0').slice(-2),
            rangoInicial: String(sarConfig.rangoInicial || PARAISO_FLORAL_SAR_BLOCK_4000.rangoInicial).trim(),
            rangoFinal: String(sarConfig.rangoFinal || PARAISO_FLORAL_SAR_BLOCK_4000.rangoFinal).trim(),
            fechaLimiteEmision: sarConfig.fechaLimiteEmision || PARAISO_FLORAL_SAR_BLOCK_4000.fechaLimiteEmision,
            correlativoInicial: parseSarSequenceNumber(sarConfig.rangoInicial) || 1,
            correlativoFinal: rangoFinalActualNum,
            cerradoEn: new Date().toISOString(),
        };

        const historialExistente: SarBlockConfig[] = Array.isArray(sarConfig.historialCais)
            ? sarConfig.historialCais
            : [];

        const nextBlockStart = Math.max(
            Number(proximo.siguienteCorrelativo) || 1,
            parseSarSequenceNumber(proximo.rangoInicial) || rangoFinalActualNum + 1
        );
        const effectiveSeq = Math.max(nextSeqCandidate, nextBlockStart);

        const promotedSarConfig = {
            ...sarConfig,
            cai: String(proximo.cai).trim().toUpperCase(),
            establecimiento: String(proximo.establecimiento || sarConfig.establecimiento || '000').padStart(3, '0').slice(-3),
            puntoEmision: String(proximo.puntoEmision || sarConfig.puntoEmision || '001').padStart(3, '0').slice(-3),
            tipoDocumento: String(proximo.tipoDocumento || sarConfig.tipoDocumento || '01').padStart(2, '0').slice(-2),
            rangoInicial: String(proximo.rangoInicial || '').trim(),
            rangoFinal: String(proximo.rangoFinal || '').trim(),
            fechaLimiteEmision: proximo.fechaLimiteEmision || null,
            siguienteCorrelativo: effectiveSeq,
            activo: true,
            proximoCai: null,
            historialCais: [
                ...historialExistente.filter((h) => h?.cai !== previousBlockArchive.cai),
                previousBlockArchive,
            ],
            ultimaTransicionAutomatica: {
                desdeCai: previousBlockArchive.cai,
                haciaCai: String(proximo.cai).trim().toUpperCase(),
                correlativoCorte: rangoFinalActualNum,
                primerCorrelativoNuevo: effectiveSeq,
                fecha: new Date().toISOString(),
            },
        };

        return {
            activeSarConfig: promotedSarConfig,
            effectiveSeq,
            didRollover: true,
        };
    }

    return {
        activeSarConfig: sarConfig,
        effectiveSeq: nextSeqCandidate,
        didRollover: false,
    };
}

/**
 * Resuelve de forma inmutable los metadatos SAR (CAI, Rango Autorizado, Fecha Límite de Emisión)
 * que corresponden a una factura específica.
 *
 * Prioridad 1: Los datos guardados directamente en el registro de la factura (`numeroCAI`, `rangoAutorizado`, `fechaLimiteEmision`).
 * Prioridad 2: Si el documento ya tiene un correlativo SAR emitido (ej. <= 4000 o 4001-5000), busca el bloque histórico exacto por rango de correlativo para jamás mezclar el nuevo CAI con facturas anteriores.
 * Prioridad 3: Si es un documento nuevo sin correlativo asignado aún, usa el `sarConfig` activo.
 */
export function resolveFacturaSarMetadata(
    doc: {
        correlativo?: string | null;
        tipoDocumento?: string | null;
        numeroCAI?: string | null;
        cai?: string | null;
        rangoAutorizado?: string | null;
        fechaLimiteEmision?: Date | string | null;
    } | null | undefined,
    rawSarConfig?: any
): {
    numeroCAI: string | null;
    rangoAutorizado: string | null;
    fechaLimiteEmision: string | Date | null;
    isSar: boolean;
} {
    const sarConfig = hydrateSarConfigWithDefaultQueue(rawSarConfig);
    const savedCai = (doc?.numeroCAI || doc?.cai || '').trim() || null;
    const savedRango = (doc?.rangoAutorizado || '').trim() || null;
    const savedFechaLimite = doc?.fechaLimiteEmision || null;

    // Si la factura ya tiene sus 3 campos históricos completos, devolverlos intactos
    if (savedCai && savedRango && savedFechaLimite) {
        return {
            numeroCAI: savedCai,
            rangoAutorizado: savedRango,
            fechaLimiteEmision: savedFechaLimite,
            isSar: true,
        };
    }

    // Buscar por el número secuencial del correlativo para garantizar integridad histórica
    const seqNum = parseSarSequenceNumber(doc?.correlativo);
    if (seqNum !== null) {
        // 1. Buscar en historialCais guardado en sarConfig
        const historial: SarBlockConfig[] = Array.isArray(sarConfig?.historialCais)
            ? sarConfig.historialCais
            : [];

        for (const block of historial) {
            const minSeq = block.correlativoInicial ?? parseSarSequenceNumber(block.rangoInicial) ?? 1;
            const maxSeq = block.correlativoFinal ?? parseSarSequenceNumber(block.rangoFinal);
            if (maxSeq !== null && seqNum >= minSeq && seqNum <= maxSeq) {
                const rangoStr =
                    block.rangoInicial && block.rangoFinal
                        ? `Del ${block.rangoInicial} al ${block.rangoFinal}`
                        : null;
                return {
                    numeroCAI: savedCai || block.cai || null,
                    rangoAutorizado: savedRango || rangoStr,
                    fechaLimiteEmision: savedFechaLimite || block.fechaLimiteEmision || null,
                    isSar: true,
                };
            }
        }

        // 2. Regla explícita de integridad para Bloque 1 (<= 4000) de Paraíso Floral
        if (seqNum <= 4000) {
            // Si el bloque activo aún es el 4000 y tiene un rangoInicial personalizado, respetarlo
            const rangoInicialBlock1 =
                sarConfig?.cai === PARAISO_FLORAL_SAR_BLOCK_4000.cai && sarConfig?.rangoInicial
                    ? sarConfig.rangoInicial
                    : PARAISO_FLORAL_SAR_BLOCK_4000.rangoInicial;
            const rangoFinalBlock1 = PARAISO_FLORAL_SAR_BLOCK_4000.rangoFinal;
            return {
                numeroCAI: savedCai || PARAISO_FLORAL_SAR_BLOCK_4000.cai,
                rangoAutorizado: savedRango || `Del ${rangoInicialBlock1} al ${rangoFinalBlock1}`,
                fechaLimiteEmision: savedFechaLimite || PARAISO_FLORAL_SAR_BLOCK_4000.fechaLimiteEmision,
                isSar: true,
            };
        }

        // 3. Regla explícita para Bloque 2 (4001 al 5000) de Paraíso Floral
        if (seqNum >= 4001 && seqNum <= 5000) {
            return {
                numeroCAI: savedCai || PARAISO_FLORAL_SAR_BLOCK_4001_5000.cai,
                rangoAutorizado:
                    savedRango ||
                    `Del ${PARAISO_FLORAL_SAR_BLOCK_4001_5000.rangoInicial} al ${PARAISO_FLORAL_SAR_BLOCK_4001_5000.rangoFinal}`,
                fechaLimiteEmision: savedFechaLimite || PARAISO_FLORAL_SAR_BLOCK_4001_5000.fechaLimiteEmision,
                isSar: true,
            };
        }
    }

    // Fallback para documentos nuevos / vistas previas cuando el régimen SAR está activo
    if (sarConfig && sarConfig.activo !== false && sarConfig.cai) {
        // Si el correlativo en vista previa ya es > rangoFinal (ej. 4001), resolver con el bloque promovido
        const effectiveConfig =
            seqNum !== null
                ? resolveSarRolloverForNextSequence(sarConfig, seqNum).activeSarConfig
                : sarConfig;

        const rangoStr =
            effectiveConfig.rangoInicial && effectiveConfig.rangoFinal
                ? `Del ${effectiveConfig.rangoInicial} al ${effectiveConfig.rangoFinal}`
                : effectiveConfig.rangoInicial || effectiveConfig.rangoFinal || null;

        return {
            numeroCAI: savedCai || effectiveConfig.cai || null,
            rangoAutorizado: savedRango || rangoStr,
            fechaLimiteEmision: savedFechaLimite || effectiveConfig.fechaLimiteEmision || null,
            isSar: true,
        };
    }

    return {
        numeroCAI: savedCai,
        rangoAutorizado: savedRango,
        fechaLimiteEmision: savedFechaLimite,
        isSar: Boolean(savedCai),
    };
}
