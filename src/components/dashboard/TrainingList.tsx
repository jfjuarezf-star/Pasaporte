"use client";

import { useState, useMemo, useCallback } from "react";
import { useOptimistic } from 'react';
import type { PopulatedAssignment, TrainingUrgency } from "@/lib/types";
import { TrainingCard } from "./TrainingCard";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "../ui/card";

type SortableKeys = "urgency" | "category" | "status";

export function TrainingList({ initialTrainings }: { initialTrainings: PopulatedAssignment[] }) {
  const [sortBy, setSortBy] = useState<SortableKeys>("urgency");
  const [optimisticTrainings, setOptimisticTrainings] = useOptimistic(
    initialTrainings,
    (state, { assignmentId, newStatus }: { assignmentId: string; newStatus: boolean }) => {
      return state.map(t =>
        t.assignmentId === assignmentId ? { ...t, status: newStatus ? "completed" : "pending" } : t
      );
    }
  );

  const handleTrainingCompletion = useCallback((assignmentId: string, isCompleted: boolean) => {
    setOptimisticTrainings({ assignmentId: assignmentId, newStatus: isCompleted });
  }, [setOptimisticTrainings]);

  const sortedTrainings = useMemo(() => {
    return [...optimisticTrainings].sort((a, b) => {
      if (sortBy === "urgency") {
        const urgencyOrder: Record<TrainingUrgency, number> = { high: 1, medium: 2, low: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      if (sortBy === "category") {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }, [optimisticTrainings, sortBy]);

  const completedCount = useMemo(() => optimisticTrainings.filter((t) => t.status === "completed").length, [optimisticTrainings]);
  const totalCount = optimisticTrainings.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="w-full sm:w-auto flex-grow">
                    <h2 className="font-semibold mb-2">Tu Progreso</h2>
                    <Progress value={progressPercentage} className="w-full h-3" />
                    <p className="text-sm text-muted-foreground mt-2">{completedCount} de {totalCount} capacitaciones completadas.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium">Ordenar por:</span>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortableKeys)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="urgency">Urgencia</SelectItem>
                            <SelectItem value="category">Categoría</SelectItem>
                            <SelectItem value="status">Estado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>
      
      {sortedTrainings.length > 0 ? (
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedTrainings.map((training) => (
            <TrainingCard key={training.assignmentId} training={training} onCompletionChange={handleTrainingCompletion} />
          ))}
        </div>
      ) : (
        <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No tienes capacitaciones asignadas. ¡Revisa más tarde!</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
