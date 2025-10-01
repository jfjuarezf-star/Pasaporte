
'use client';

import React, { useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateTrainingStatus } from '@/app/actions';
import type { PopulatedAssignment, TrainingUrgency, User } from '@/lib/types';
import { Check, Loader2, BookOpen } from 'lucide-react';

const urgencyVariant: Record<TrainingUrgency, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export function UserTrainingDetailsDialog({
  user,
  assignments,
  onOpenChange,
  onAssignmentStatusChange
}: {
  user: User;
  assignments: PopulatedAssignment[];
  onOpenChange: (open: boolean) => void;
  onAssignmentStatusChange: (assignmentId: string, isCompleted: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleMarkAsComplete = (assignmentId: string) => {
    startTransition(async () => {
      await updateTrainingStatus(assignmentId, true);
      onAssignmentStatusChange(assignmentId, true);
    });
  };

  const completedTrainings = assignments.filter(a => a.status === 'completed');
  const pendingTrainings = assignments.filter(a => a.status === 'pending');

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] glassmorphism backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Pasaporte de: {user.name}</DialogTitle>
          <DialogDescription>
            Visualiza y gestiona las capacitaciones asignadas a {user.email}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-6 py-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Pendientes ({pendingTrainings.length})</h3>
              <div className="space-y-3">
                {pendingTrainings.length > 0 ? (
                  pendingTrainings.map(assignment => (
                    <div key={assignment.assignmentId} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                      <div>
                        <p className="font-semibold">{assignment.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{assignment.category}</Badge>
                          <Badge variant={urgencyVariant[assignment.urgency]}>{assignment.urgency}</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsComplete(assignment.assignmentId)}
                        disabled={isPending}
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Marcar Completo</span>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed">
                     <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">¡Sin pendientes!</p>
                    <p className="text-sm text-muted-foreground">Este usuario está al día.</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Completadas ({completedTrainings.length})</h3>
               <div className="space-y-3">
                {completedTrainings.length > 0 ? (
                  completedTrainings.map(assignment => (
                    <div key={assignment.assignmentId} className="flex items-center justify-between p-3 rounded-lg border bg-green-100/50 dark:bg-green-900/30">
                      <div>
                        <p className="font-semibold text-muted-foreground line-through">{assignment.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <Badge variant="outline">{assignment.category}</Badge>
                           <Badge variant={urgencyVariant[assignment.urgency]}>{assignment.urgency}</Badge>
                        </div>
                      </div>
                       <Badge variant="secondary" className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100">
                           <Check className="mr-1 h-3 w-3" /> Completado
                       </Badge>
                    </div>
                  ))
                ) : (
                   <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed">
                    <p className="text-muted-foreground">Aún no hay capacitaciones completadas.</p>
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
