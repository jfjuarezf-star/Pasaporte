

import { getCurrentUserId } from "@/lib/auth";
import { getAllUsers, getAllTrainings, getAllAssignments, getUserById } from "@/lib/data";
import { redirect } from "next/navigation";
import { TrainerDashboardClient } from "@/components/dashboard/TrainerDashboardClient";
import { Training, Assignment, User } from "@/lib/types";

export const dynamic = 'force-dynamic';

type PopulatedTraining = Training & {
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

    const allAssignments = await getAllAssignments();
    const trainerAssignments = allAssignments.filter(a => a.trainerName === currentUser.name);

    if (trainerAssignments.length === 0 && currentUser.role !== 'admin') {
        // If not a trainer and not an admin, redirect them away.
        redirect('/dashboard');
    }

    const allUsers = await getAllUsers();
    const usersMap = new Map(allUsers.map(u => [u.id, u]));

    const allTrainings = await getAllTrainings();
    const trainingsMap = new Map(allTrainings.map(t => [t.id, t]));

    const populatedTrainingsMap = new Map<string, PopulatedTraining>();

    for (const assignment of trainerAssignments) {
        const trainingDetails = trainingsMap.get(assignment.trainingId);
        if (trainingDetails) {
            if (!populatedTrainingsMap.has(assignment.trainingId)) {
                populatedTrainingsMap.set(assignment.trainingId, {
                    ...trainingDetails,
                    assignments: [],
                });
            }
            const user = usersMap.get(assignment.userId);
            populatedTrainingsMap.get(assignment.trainingId)!.assignments.push({ ...assignment, user });
        }
    }
    
    const populatedTrainings = Array.from(populatedTrainingsMap.values());


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

