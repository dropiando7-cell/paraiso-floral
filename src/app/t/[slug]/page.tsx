import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import DigitalCardClient from './DigitalCardClient';

export const dynamic = 'force-dynamic';

export default async function PublicCardPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    // Fetch the digital card with organization details
    const card = await prisma.digitalCard.findUnique({
        where: { slug },
        include: {
            organization: true
        }
    });

    if (!card) {
        return notFound();
    }

    // Increment views asynchronously
    try {
        await prisma.digitalCard.update({
            where: { id: card.id },
            data: { views: { increment: 1 } }
        });
    } catch (err) {
        console.error('Error incrementing card views:', err);
    }

    return <DigitalCardClient card={card} />;
}
