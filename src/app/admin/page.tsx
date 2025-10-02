
import { getAllUsers, getAllTrainings, getAllAssignments, getUserById } from '@/lib/data';
import { AdminPageClient } from '@/components/admin/AdminPageClient';
import { User, Training, Assignment, PopulatedAssignment } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isBefore, startOfToday, subDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type TrainingWithAssignments = Training & {
    assignments: Assignment[];
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

    const trainings: TrainingWithAssignments[] = trainingsData.map(training => ({
        ...training,
        assignments: allAssignments.filter(a => a.trainingId === training.id),
    }));

    const today = startOfToday();
    const threeDaysAgo = subDays(today, 3);

    const overdueTrainings = trainings.filter(t => 
        t.scheduledDate && 
        isBefore(new Date(t.scheduledDate), today) && 
        t.assignments.some(a => a.status === 'pending')
    );

    const recentAssignments = allAssignments
        .filter(a => a.assignedDate && isBefore(threeDaysAgo, new Date(a.assignedDate)))
        .map(a => {
            const user = users.find(u => u.id === a.userId);
            const training = trainings.find(t => t.id === a.trainingId);
            return {
                ...a,
                userName: user?.name || 'Usuario desconocido',
                trainingTitle: training?.title || 'Capacitación desconocida',
            }
        })
        .sort((a,b) => new Date(b.assignedDate!).getTime() - new Date(a.assignedDate!).getTime());

    return (
        <div className="container mx-auto p-0 sm:p-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline">Panel de Administración</h1>
                <p className="text-muted-foreground">Gestiona usuarios y capacitaciones de la empresa.</p>
            </div>

            <div className="grid gap-6 mb-8 lg:grid-cols-2">
                <Card className="glassmorphism">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <div>
                            <CardTitle>Capacitaciones Atrasadas</CardTitle>
                            <CardDescription>Capacitaciones cuya fecha pasó y tienen pendientes.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {overdueTrainings.length > 0 ? (
                            <ul className="space-y-2">
                                {overdueTrainings.map(t => (
                                    <li key={t.id} className="text-sm p-2 rounded-md border border-destructive/50 bg-destructive/10">
                                        <span className="font-semibold">{t.title}</span>
                                        <span className="text-xs text-muted-foreground ml-2">(Responsable: {t.trainerName})</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">¡Sin atrasos! Buen trabajo.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="glassmorphism">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Bell className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Asignaciones Recientes</CardTitle>
                            <CardDescription>Usuarios asignados a capacitaciones en los últimos 3 días.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentAssignments.length > 0 ? (
                           <ul className="space-y-2">
                                {recentAssignments.slice(0, 5).map(a => (
                                    <li key={a.id} className="text-sm p-2 rounded-md border bg-background/50">
                                       <Badge variant="secondary" className="mr-2">{a.userName}</Badge>
                                       fue asignado a <span className="font-semibold">{a.trainingTitle}</span>.
                                    </li>
                                ))}
                           </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No hay asignaciones recientes.</p>
                        )}
                    </CardContent>
                </Card>
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
