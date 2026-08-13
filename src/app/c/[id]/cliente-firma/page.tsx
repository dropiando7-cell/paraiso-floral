import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ClienteFirmaView from './ClienteFirmaView';

export const revalidate = 0;

export default async function ClienteFirmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) notFound();

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      rtn: true,
      telefono: true,
      email: true,
      direccion: true,
      nombreContacto: true,
      telefonoContacto: true,
      firmaDigitalUrl: true,
      firmaDigitalNombre: true,
      firmaDigitalFecha: true,
      organization: {
        select: {
          name: true,
          logoUrl: true
        }
      }
    }
  });

  if (!cliente) {
    notFound();
  }

  const clienteSerialized = JSON.parse(JSON.stringify(cliente));

  return <ClienteFirmaView cliente={clienteSerialized} />;
}
