
import { getAllUsers, getAllTrainings, getAllAssignments, getUserById } from '@/lib/data';
import { AdminPageClient } from '@/components/admin/AdminPageClient';
import { User, Training, Assignment } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';

type TrainingWithAssignments = Training & {
    assignments: Assignment[];
}

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const userId = await getCurrentUserId();
    if (!userId) {
        redirect('/');
    }
    
    // Fetch data in parallel
    const [currentUser, users, trainingsData, allAssignments] = await Promise.all([
        getUserById(userId),
        getAllUsers(),
        getAllTrainings(),
        getAllAssignments()
    ]);

     if (!currentUser) {
        // This case should be handled by the layout, but as a fallback:
        redirect('/');
    }

    // Combine trainings with their assignments
    const trainings: TrainingWithAssignments[] = trainingsData.map(training => {
        const assignmentsForThisTraining = allAssignments.filter(
            a => a.trainingId === training.id
        );
        return {
            ...training,
            assignments: assignmentsForThisTraining,
        };
    });

    return (
        <div className="container mx-auto glassmorphism backdrop-blur-lg p-6 rounded-lg">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline">Panel de Administración</h1>
                <p className="text-muted-foreground">Gestiona usuarios y capacitaciones de la empresa.</p>
            </div>
            <AdminPageClient 
                initialUsers={users} 
                initialTrainings={trainings} 
                allAssignments={allAssignments}
                currentUser={currentUser} 
            />
        </div>
    );
}

    