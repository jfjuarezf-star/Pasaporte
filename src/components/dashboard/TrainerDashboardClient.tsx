
'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateTrainingStatus } from '@/app/actions';
import { Assignment, Training, User } from '@/lib/types';
import { Check, Loader2, BookUser, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '../ui/input';

type TrainingWithAssignmentsAndUsers = Training & {
    assignments: (Assignment & { user?: User | null })[];
}

interface TrainerDashboardClientProps {
    initialTrainings: TrainingWithAssignmentsAndUsers[];
}

function MarkCompleteButton({ assignmentId, onComplete }: { assignmentId: string, onComplete: (id: string) => void }) {
    const [isPending, startTransition] = useTransition();

    const handleMarkComplete = () => {
        startTransition(async () => {
            await updateTrainingStatus(assignmentId, true);
            onComplete(assignmentId);
        });
    };

    return (
        <Button size="sm" onClick={handleMarkComplete} disabled={isPending}>
            {isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Marcando...
                </>
            ) : (
                <>
                    <Check className="mr-2 h-4 w-4" />
                    Marcar Completo
                </>
            )}
        </Button>
    );
}


export function TrainerDashboardClient({ initialTrainings }: TrainerDashboardClientProps) {
    const [trainings, setTrainings] = useState(initialTrainings);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTrainings = useMemo(() => {
        if (!searchTerm) return trainings;
        return trainings.map(training => {
            const filteredAssignments = training.assignments.filter(assignment => 
                assignment.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                assignment.user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return { ...training, assignments: filteredAssignments };
        }).filter(training => training.assignments.length > 0 || training.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [trainings, searchTerm]);

    const handleAssignmentCompleted = (assignmentId: string) => {
        setTrainings(currentTrainings => 
            currentTrainings.map(training => ({
                ...training,
                assignments: training.assignments.map(assignment => 
                    assignment.id === assignmentId 
                    ? { ...assignment, status: 'completed', completedDate: new Date().toISOString() } 
                    : assignment
                ),
            }))
        );
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
          .split(" ")
          .map((n) => n[0])
          .join("");
      };

    if (initialTrainings.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <BookUser />
                        Sin Capacitaciones a Cargo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Actualmente no estás asignado como responsable de ninguna capacitación.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por título de capacitación o nombre de participante..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredTrainings.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            No se encontraron resultados para tu búsqueda.
                        </p>
                    </CardContent>
                </Card>
            )}
        
            <Accordion type="single" collapsible className="w-full space-y-4">
                {filteredTrainings.map(training => {
                    const pendingCount = training.assignments.filter(a => a.status === 'pending').length;
                    const completedCount = training.assignments.filter(a => a.status === 'completed').length;

                    return (
                        <AccordionItem value={training.id} key={training.id} className="border-none">
                            <Card className='overflow-hidden'>
                                <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50">
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between w-full'>
                                        <div className='text-left'>
                                            <h3 className="font-semibold text-lg">{training.title}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Responsable: {training.trainerName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                            <Badge variant="secondary">Completados: {completedCount}</Badge>
                                            <Badge variant={pendingCount > 0 ? "destructive" : "default"}>Pendientes: {pendingCount}</Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-6 pt-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className='w-[60px]'></TableHead>
                                                    <TableHead>Participante</TableHead>
                                                    <TableHead>Fecha Programada</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead className="text-right">Acción</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {training.assignments.map(({ id, user, status, scheduledDate }) => (
                                                    <TableRow key={id}>
                                                        <TableCell>
                                                            <Avatar className='h-8 w-8'>
                                                                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                                                                <AvatarFallback>{getInitials(user?.name ?? '')}</AvatarFallback>
                                                            </Avatar>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{user?.name || 'Usuario no encontrado'}</TableCell>
                                                        <TableCell>{scheduledDate ? format(new Date(scheduledDate), 'PPP', { locale: es }) : 'N/A'}</TableCell>
                                                        <TableCell>
                                                            {status === 'completed' ? (
                                                                <Badge variant='secondary' className='bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'>Completado</Badge>
                                                            ) : (
                                                                <Badge variant='destructive'>Pendiente</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {status === 'pending' && user && (
                                                                <MarkCompleteButton assignmentId={id} onComplete={handleAssignmentCompleted} />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {training.assignments.length === 0 && (
                                            <p className="text-center text-muted-foreground py-8">No hay participantes para esta capacitación con los filtros aplicados.</p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
}
