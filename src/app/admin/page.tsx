

import { getAllUsers, getAllTrainings, getAllAssignments, getUserById, getTrainingsByTrainerName, getAssignmentsForTraining } from '@/lib/data';
import { AdminPageClient } from '@/components/admin/AdminPageClient';
import { User, Training, Assignment } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';

type TrainingWithAssignments = Training & {
    assignments: Assignment[];
}

type PopulatedTraining = Training & {
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

    const usersMap = new Map(users.map(u => [u.id, u]));

    const trainerName = currentUser.name;

    // Data for Trainer Dashboard view (if admin is also a trainer)
    const trainerAssignments = allAssignments.filter(a => a.trainerName === trainerName);
    const trainerTrainingsMap = new Map<string, PopulatedTraining>();

    for (const assignment of trainerAssignments) {
        const trainingDetails = trainingsData.find(t => t.id === assignment.trainingId);
        if (trainingDetails) {
            if (!trainerTrainingsMap.has(trainingDetails.id)) {
                trainerTrainingsMap.set(trainingDetails.id, {
                    ...trainingDetails,
                    assignments: [],
                });
            }
            const user = usersMap.get(assignment.userId);
            trainerTrainingsMap.get(trainingDetails.id)!.assignments.push({ ...assignment, user });
        }
    }
    const populatedTrainerTrainings = Array.from(trainerTrainingsMap.values());


    // Data for RRHH view (all trainings with participants)
    const allPopulatedTrainings: PopulatedTraining[] = trainingsData.map(training => {
        const relatedAssignments = allAssignments.filter(a => a.trainingId === training.id);
        const populatedAssignments = relatedAssignments.map(assignment => ({
            ...assignment,
            user: usersMap.get(assignment.userId)
        }));
        return {
            ...training,
            assignments: populatedAssignments,
        };
    });


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
                allPopulatedTrainings={allPopulatedTrainings}
            />
        </div>
    );
}

