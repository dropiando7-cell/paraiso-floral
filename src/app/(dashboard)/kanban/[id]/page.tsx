import { getSpaceDetails } from '../actions';
import KanbanSpaceClient from './KanbanSpaceClient';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SpacePage({ params }: Props) {
    const { id } = await params;
    
    try {
        const spaceData = await getSpaceDetails(id);
        if (!spaceData || !spaceData.space) {
            notFound();
        }

        return (
            <div className="w-full">
                <KanbanSpaceClient initialData={spaceData} />
            </div>
        );
    } catch (e) {
        console.error("SpacePage Error:", e);
        notFound();
    }
}
