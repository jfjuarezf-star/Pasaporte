

'use client';

import React, { useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateTrainingStatus, deleteAssignment } from '@/app/actions';
import type { PopulatedTrainingWithUsers } from '@/lib/types';
import { Check, Loader2, BookOpen, User, Clock, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

function DeleteAssignmentButton({ assignmentId, userName, onDeassign }: { assignmentId: string; userName: string; onDeassign: (id: string) => void }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            await deleteAssignment(assignmentId);
            onDeassign(assignmentId);
        });
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se desasignará esta capacitación a <strong>{userName}</strong>. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                         {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sí, desasignar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function TrainingUsersDialog({
  training,
  isOpen,
  onOpenChange,
  onAssignmentStatusChange,
  onAssignmentDeassign
}: {
  training: PopulatedTrainingWithUsers;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentStatusChange: (assignmentId: string, isCompleted: boolean) => void;
  onAssignmentDeassign: (assignmentId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleMarkAsComplete = (assignmentId: string) => {
    startTransition(async () => {
      await updateTrainingStatus(assignmentId, true);
      onAssignmentStatusChange(assignmentId, true);
    });
  };

  const getInitials = (name: string = '') => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const completedParticipants = training.participants.filter(p => p.status === 'completed');
  const pendingParticipants = training.participants.filter(p => p.status === 'pending');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glassmorphism backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Participantes de: {training.title}</DialogTitle>
          <DialogDescription>
            Gestiona el progreso de los usuarios asignados a esta capacitación.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-6 py-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Pendientes ({pendingParticipants.length})</h3>
              <div className="space-y-3">
                {pendingParticipants.length > 0 ? (
                  pendingParticipants.map(({ id, user, trainerName, scheduledDate }) => (
                    <div key={id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                      <div className="flex items-center gap-3">
                        <Avatar className='h-9 w-9'>
                            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{user?.name || 'Usuario no encontrado'}</p>
                            <div className="text-xs text-muted-foreground flex items-center gap-4">
                               {trainerName && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {trainerName}</span>}
                               {scheduledDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(scheduledDate), 'PPP', { locale: es })}</span>}
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleMarkAsComplete(id)}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Marcar Completo</span>
                        </Button>
                        <DeleteAssignmentButton assignmentId={id} userName={user?.name || 'este usuario'} onDeassign={onAssignmentDeassign} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed">
                     <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">¡Sin pendientes!</p>
                    <p className="text-sm text-muted-foreground">Todos los usuarios están al día.</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Completados ({completedParticipants.length})</h3>
               <div className="space-y-3">
                {completedParticipants.length > 0 ? (
                  completedParticipants.map(({ id, user, completedDate }) => (
                    <div key={id} className="flex items-center justify-between p-3 rounded-lg border bg-green-100/50 dark:bg-green-900/30">
                      <div className="flex items-center gap-3">
                         <Avatar className='h-9 w-9'>
                            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-muted-foreground line-through">{user?.name || 'Usuario no encontrado'}</p>
                             {completedDate && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(completedDate), 'PPP', { locale: es })}
                                </p>
                             )}
                        </div>
                       </div>
                       <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100">
                           <Check className="mr-1 h-3 w-3" /> Completado
                        </Badge>
                        <DeleteAssignmentButton assignmentId={id} userName={user?.name || 'este usuario'} onDeassign={onAssignmentDeassign} />
                       </div>
                    </div>
                  ))
                ) : (
                   <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed">
                    <p className="text-muted-foreground">Aún no hay participantes que hayan completado la capacitación.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
