
import { getAllUsers, getAllTrainings, getAllAssignments, getUserById, getTrainingsByTrainerName, getAssignmentsForTraining } from '@/lib/data';
import { AdminPageClient } from '@/components/admin/AdminPageClient';
import { User, Training, Assignment } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';

type TrainingWithAssignments = Training & {
    assignments: Assignment[];
}

type TrainerTraining = Training & {
    assignments: (Assignment & { user?: User | null })[];
}

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const userId = await getCurrentUserId();
    if (!userId) {
        redirect('/');
    }
    
    const [currentUser, users, trainingsData, allAssignments] = await Promise.all([
        getUserById(userId),
        getAllUsers(),
        getAllTrainings(),
        getAllAssignments()
    ]);

    if (!currentUser) {
        redirect('/');
    }

    // Data for General Admin views
    const trainings: TrainingWithAssignments[] = trainingsData.map(training => ({
        ...training,
        assignments: allAssignments.filter(a => a.trainingId === training.id),
    }));

    // Data for Trainer Dashboard view (if admin is also a trainer)
    const trainerOfTrainings = await getTrainingsByTrainerName(currentUser.name);
    const usersMap = new Map(users.map(u => [u.id, u]));

    const populatedTrainerTrainings: TrainerTraining[] = await Promise.all(
        trainerOfTrainings.map(async (training) => {
            const assignments = await getAssignmentsForTraining(training.id);
            const populatedAssignments = assignments.map(assignment => ({
                ...assignment,
                user: usersMap.get(assignment.userId)
            }));
            
            return {
                ...training,
                assignments: populatedAssignments,
            };
        })
    );


    return (
        <div className="container mx-auto p-0 sm:p-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline">Panel de Administración</h1>
                <p className="text-muted-foreground">Gestiona usuarios y capacitaciones de la empresa.</p>
            </div>
            <AdminPageClient 
                initialUsers={users} 
                initialTrainings={trainings} 
                allAssignments={allAssignments}
                currentUser={currentUser}
                trainerTrainings={populatedTrainerTrainings}
            />
        </div>
    );
}
