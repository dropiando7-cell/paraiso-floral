import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveFacturaSarMetadata } from "@/lib/sar-utils";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Obtener el organizationId del usuario
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { organizationId: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
        }

        const orgId = dbUser.organizationId;
        const body = await req.json();
        const { docId, tipoTicket, ticketData } = body;

        // Caso 1: Ticket de Remesa (Cierre de Caja) o Recibo Interno (Caja Chica)
        if ((tipoTicket === "REMESA" || tipoTicket === "CAJA_CHICA") && ticketData) {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
                select: { name: true, rtn: true, direccion: true, telefono: true }
            });

            const esRemesa = tipoTicket === "REMESA";
            const correlativo = ticketData.correlativo || (esRemesa ? "REM-S/N" : "RC-S/N");
            const montoNum = Number(ticketData.monto || 0);
            const cajero = ticketData.cajeroNombre || "CAJERO DE TURNO";
            const receptor = ticketData.responsableNombre || (esRemesa ? "ENCARGADO DE DEPOSITO" : "BENEFICIARIO");
            const concepto = ticketData.concepto || (esRemesa ? "REMESA BANCARIA" : "GASTO DE CAJA CHICA");
            const destino = ticketData.bancoDestino || (esRemesa ? "BANCO" : ticketData.rubro || "CAJA CHICA");
            const metodo = ticketData.metodoPago || "EFECTIVO";
            const montoLetras = ticketData.montoLetras || "";

            // Estructura compatible tanto con print_server_tickets.py actualizado como con versiones anteriores en ejecución
            const itemsFallback = esRemesa
                ? [
                      {
                          cantidad: 1,
                          nombre: `REMESA: ${destino} (${metodo}) - ${concepto}`,
                          totalLinea: montoNum
                      },
                      {
                          cantidad: 1,
                          nombre: `SON: ${montoLetras}`,
                          totalLinea: 0
                      },
                      {
                          cantidad: 1,
                          nombre: `ENTREGA CAJA: ${cajero}`,
                          totalLinea: 0
                      },
                      {
                          cantidad: 1,
                          nombre: `RECIBE: ${receptor} | FIRMA: ______________`,
                          totalLinea: 0
                      }
                  ]
                : [
                      {
                          cantidad: 1,
                          nombre: `${destino}: ${concepto}`,
                          totalLinea: montoNum
                      },
                      {
                          cantidad: 1,
                          nombre: `SON: ${montoLetras}`,
                          totalLinea: 0
                      },
                      {
                          cantidad: 1,
                          nombre: `ENTREGA CAJA: ${cajero}`,
                          totalLinea: 0
                      },
                      {
                          cantidad: 1,
                          nombre: `RECIBE: ${receptor} | FIRMA: ______________`,
                          totalLinea: 0
                      }
                  ];

            const payload = {
                tipoTicket,
                ticketData: {
                    ...ticketData,
                    correlativo,
                    monto: montoNum,
                    cajeroNombre: cajero,
                    responsableNombre: receptor,
                    concepto,
                    bancoDestino: destino,
                    metodoPago: metodo,
                    montoLetras
                },
                organization: org || { name: "DISTRIBUIDORA PARAISO FLORAL, S. DE R.L." },
                documento: {
                    correlativo: `${esRemesa ? "REMESA" : "RECIBO CAJA CHICA"} ${correlativo}`,
                    fechaEmision: ticketData.fechaISO || new Date().toISOString(),
                    cai: esRemesa ? `DESTINO: ${destino}` : `RUBRO: ${destino}`,
                    subTotal: montoNum,
                    totalGravado15: 0,
                    totalGravado18: 0,
                    isv: 0,
                    total: montoNum
                },
                cliente: {
                    nombre: `${receptor} (CAJA: ${cajero})`,
                    rtn: ticketData.referencia || ""
                },
                items: itemsFallback
            };

            const nuevoTrabajo = await prisma.colaImpresion.create({
                data: {
                    organizationId: orgId,
                    urlImagen: JSON.stringify(payload),
                    estado: "PENDIENTE",
                    impresora: "Tickets",
                    tamano: "80mm",
                },
            });

            return NextResponse.json({
                success: true,
                message: "Ticket enviado a la cola de impresión (Print Server)",
                trabajoId: nuevoTrabajo.id,
            });
        }

        // Caso 2: Factura / Documento estándar por docId
        if (!docId) {
            return NextResponse.json(
                { error: "Faltan datos obligatorios (docId o ticketData)" },
                { status: 400 }
            );
        }

        // Fetch full document with items and client
        const doc = await prisma.factura.findUnique({
            where: { id: docId, organizationId: orgId },
            include: {
                detalles: true,
                cliente: true,
                organization: true
            }
        });

        if (!doc) {
            return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
        }

        const resolvedSar = doc.tipoDocumento === "FACTURA"
            ? resolveFacturaSarMetadata(doc, (doc.organization?.invoiceSettings as any)?.sarConfig)
            : {
                numeroCAI: doc.numeroCAI,
                rangoAutorizado: doc.rangoAutorizado,
                fechaLimiteEmision: doc.fechaLimiteEmision,
                isSar: Boolean(doc.numeroCAI)
            };

        // Ordenar detalles según __METADATA__.orden y limpiar etiquetas internas (__METADATA__, __STYLE__, __SECTION__)
        // para que el print_server térmico reciba descripciones 100% limpias.
        const sortedCleanDetalles = [...(doc.detalles || [])]
            .map((d: any, idx: number) => {
                const raw = d.descripcion || "";
                const metaIdx = raw.indexOf("__METADATA__");
                let orden = Number.MAX_SAFE_INTEGER;
                if (metaIdx !== -1) {
                    try {
                        const parsed = JSON.parse(raw.substring(metaIdx + 12));
                        if (typeof parsed.orden === "number") orden = parsed.orden;
                    } catch {}
                }
                return { d, orden, idx, isSection: raw.startsWith("__SECTION__") };
            })
            .filter((x) => !x.isSection)
            .sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.idx - b.idx))
            .map(({ d }) => {
                const cleanFullDesc = (d.descripcion || "")
                    .replace(/__METADATA__[\s\S]*$/, "")
                    .replace(/__STYLE__[\s\S]*$/, "")
                    .replace(/^__SECTION__/, "")
                    .trim();
                const cleanFirstLine = cleanFullDesc
                    .split("\n")[0]
                    .split("Producto registrado")[0]
                    .trim();
                return {
                    ...d,
                    descripcion: cleanFullDesc,
                    nombre: cleanFirstLine || cleanFullDesc,
                };
            });

        const invoiceData = {
            documento: {
                ...doc,
                detalles: sortedCleanDetalles,
                cai: resolvedSar.numeroCAI || doc.numeroCAI,
                numeroCAI: resolvedSar.numeroCAI || doc.numeroCAI,
                rangoAutorizado: resolvedSar.rangoAutorizado || doc.rangoAutorizado,
                fechaLimiteEmision: resolvedSar.fechaLimiteEmision || doc.fechaLimiteEmision
            },
            organization: doc.organization,
            items: sortedCleanDetalles,
            cliente: doc.cliente
        };

        // Crear la entrada en la cola de impresión
        const nuevoTrabajo = await prisma.colaImpresion.create({
            data: {
                organizationId: orgId,
                urlImagen: JSON.stringify(invoiceData),
                estado: "PENDIENTE",
                impresora: "Tickets",
                tamano: "80mm",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Añadido a la cola de impresión",
            trabajoId: nuevoTrabajo.id,
        });

    } catch (error) {
        console.error("[API_IMPRESION_ENCOLAR] Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al encolar impresión" },
            { status: 500 }
        );
    }
}
