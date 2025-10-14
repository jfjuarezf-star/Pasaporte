

"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PopulatedAssignment, TrainingCategory, TrainingUrgency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Shield, Wrench, ClipboardList, Users, Icon, Clock, CheckCircle, Leaf, Zap, Award, BookOpen, User, Calendar } from "lucide-react";
import { updateTrainingStatus } from "@/app/actions";
import { useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoryIcons: Record<TrainingCategory, Icon> = {
  Seguridad: Shield,
  Calidad: CheckCircle,
  DPO: Shield, // Re-using Shield, consider a more specific icon if available
  TPM: Wrench,
  'Medio Ambiente': Leaf,
  'Mejora Enfocada': Zap,
  Obligatoria: BookOpen,
};


const urgencyVariant: Record<TrainingUrgency, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const urgencyText: Record<TrainingUrgency, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};


export function TrainingCard({
  training,
  onCompletionChange,
}: {
  training: PopulatedAssignment;
  onCompletionChange: (trainingId: string, isCompleted: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isCompleted = training.status === "completed";
  const CategoryIcon = categoryIcons[training.category] || Award; // Fallback to a generic icon
  const checkboxId = `complete-${training.assignmentId}`;

  const handleCheckedChange = (checked: boolean | "indeterminate") => {
    if (typeof checked === 'boolean') {
      startTransition(() => {
        onCompletionChange(training.assignmentId, checked);
        updateTrainingStatus(training.assignmentId, checked);
      });
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg",
        isCompleted ? "bg-black/10" : "bg-white/30",
        isPending && "opacity-70",
        "shadow-lg border border-white/30"
      )}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className={cn(
                "font-headline text-lg leading-tight font-semibold",
                isCompleted && "line-through text-gray-500"
            )}>
                {training.title}
            </CardTitle>
            <CategoryIcon className="h-6 w-6 text-gray-600 flex-shrink-0 ml-4" />
        </div>
        <CardDescription
          className={cn(
            "pt-2 text-gray-700",
            isCompleted && "line-through text-gray-500"
          )}
        >
          {training.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{training.category}</Badge>
          <Badge variant={urgencyVariant[training.urgency]}>{urgencyText[training.urgency]}</Badge>
          {training.duration && (
            <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {training.duration} min
            </Badge>
          )}
        </div>
         <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground"/>
                <span>Responsable: <span className="font-medium">{training.trainerName || 'A definir'}</span></span>
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground"/>
                <span>
                    Fecha: <span className="font-medium">
                        {training.scheduledDate ? format(new Date(training.scheduledDate), 'PPP', { locale: es }) : 'A definir'}
                    </span>
                </span>
            </div>
        </div>
      </CardContent>
      <CardFooter className="bg-black/5 py-3 px-6">
        <div className="flex items-center space-x-2">
            <Checkbox
              id={checkboxId}
              checked={isCompleted}
              onCheckedChange={handleCheckedChange}
              disabled={isPending}
            />
            <Label
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Marcar como Completado
            </Label>
        </div>
      </CardFooter>
    </Card>
  );
}

