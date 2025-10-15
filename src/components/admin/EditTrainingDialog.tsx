

'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { updateTraining } from '@/app/admin-actions';
import { Training, TrainingCategory, User } from '@/lib/types';
import { AlertCircle, Check, FilePlus2, Loader2 } from 'lucide-react';

const TRAINING_CATEGORIES: TrainingCategory[] = ['Seguridad', 'Calidad', 'DPO', 'TPM', 'Medio Ambiente', 'Mejora Enfocada', 'Obligatoria'];

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
}

const initialFormState = { message: '', errors: {}, success: false };

export function EditTrainingDialog({
  training,
  isOpen,
  onOpenChange,
}: {
  training: Training;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction] = useActionState(updateTraining, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  useEffect(() => {
    if (isOpen) {
        formRef.current?.reset();
    }
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Plantilla de Capacitación</DialogTitle>
          <DialogDescription>Modifica los detalles de la plantilla.</DialogDescription>
        </DialogHeader>
        <form action={formAction} ref={formRef}>
           <input type="hidden" name="trainingId" value={training.id} />
           <div className="space-y-4 py-4">
            {state?.message && !state.success && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}
            {state?.success && (
                <Alert variant="default" className="bg-green-100 dark:bg-green-900">
                    <Check className="h-4 w-4" />
                    <AlertTitle>Éxito</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
             )}
            <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={training.title} />
                {state?.errors?.title && <p className="text-sm text-destructive">{state.errors.title[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" required defaultValue={training.description} />
                {state?.errors?.description && <p className="text-sm text-destructive">{state.errors.description[0]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <Input id="duration" name="duration" type="number" required defaultValue={training.duration} />
                    {state?.errors?.duration && <p className="text-sm text-destructive">{state.errors.duration[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="validityDays">Vigencia (días)</Label>
                    <Input id="validityDays" name="validityDays" type="number" placeholder="Ej: 365" defaultValue={training.validityDays} />
                    {state?.errors?.validityDays && <p className="text-sm text-destructive">{state.errors.validityDays[0]}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select name="category" defaultValue={training.category}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                         {TRAINING_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                {state?.errors?.category && <p className="text-sm text-destructive">{state.errors.category[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="urgency">Urgencia</Label>
                <Select name="urgency" defaultValue={training.urgency}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                </Select>
                {state?.errors?.urgency && <p className="text-sm text-destructive">{state.errors.urgency[0]}</p>}
            </div>
            <SubmitButton>Guardar Cambios</SubmitButton>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
