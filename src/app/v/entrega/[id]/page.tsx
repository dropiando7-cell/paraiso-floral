import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EntregaValidationClientView from './EntregaValidationClientView';

export const metadata = {
  title: 'Validación de Entrega y Garantía | Bioelectrónica',
  description: 'Verificación pública de trazabilidad digital, orden de entrega, garantía y mantenimientos programados.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EntregaValidationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const cleanId = decodeURIComponent(rawId).trim();

  // Buscar OrdenEntrega por ID, correlativo u ID de factura
  const orden = await prisma.ordenEntrega.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { correlativo: { equals: cleanId, mode: 'insensitive' } },
        { facturaId: cleanId }
      ]
    },
    include: {
      factura: {
        include: {
          cliente: true,
          detalles: {
            include: {
              activo: true
            }
          }
        }
      },
      organization: true
    }
  });

  if (!orden || !orden.factura) {
    return notFound();
  }

  // Buscar los EquiposCliente asociados a esta factura y sus mantenimientos programados
  const equipos = await prisma.equipoCliente.findMany({
    where: {
      facturaId: orden.facturaId
    },
    include: {
      mantenimientos: {
        orderBy: { fechaProgramada: 'asc' }
      }
    }
  });

  return (
    <EntregaValidationClientView 
      orden={orden}
      equipos={equipos}
    />
  );
}
