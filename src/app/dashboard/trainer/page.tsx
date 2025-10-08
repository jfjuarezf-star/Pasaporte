
import { getCurrentUserId } from "@/lib/auth";
import { getTrainingsByTrainerName, getAssignmentsForTraining, getUserById, getAllUsers } from "@/lib/data";
import { redirect } from "next/navigation";
import { TrainerDashboardClient } from "@/components/dashboard/TrainerDashboardClient";
import { Training, Assignment, User } from "@/lib/types";

export const dynamic = 'force-dynamic';

type TrainingWithAssignmentsAndUsers = Training & {
    assignments: (Assignment & { user?: User | null })[];
}

export default async function TrainerPage() {
    const userId = await getCurrentUserId();
    if (!userId) {
        redirect('/');
    }

    const currentUser = await getUserById(userId);
    if (!currentUser) {
        redirect('/');
    }

    const trainerOfTrainings = await getTrainingsByTrainerName(currentUser.name);

    if (trainerOfTrainings.length === 0 && currentUser.role !== 'admin') {
        // If not a trainer and not an admin, redirect them away.
        redirect('/dashboard');
    }

    const allUsers = await getAllUsers();
    const usersMap = new Map(allUsers.map(u => [u.id, u]));

    const populatedTrainings: TrainingWithAssignmentsAndUsers[] = await Promise.all(
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
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline">Panel del Capacitador</h1>
                <p className="text-muted-foreground">Gestiona el progreso de los participantes en las capacitaciones a tu cargo.</p>
            </div>
            <TrainerDashboardClient initialTrainings={populatedTrainings} />
        </div>
    );
}
