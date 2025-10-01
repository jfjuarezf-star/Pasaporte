import { getTrainingsForUser, getUserById } from "@/lib/data";
import { TrainingList } from "@/components/dashboard/TrainingList";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
      redirect('/');
  }
  const user = await getUserById(userId);
  if (!user) {
      // This case should ideally be handled by the layout, but as a fallback:
      redirect('/');
  }

  const trainings = await getTrainingsForUser(user.id);

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold font-headline mb-2">Tu Pasaporte de Capacitación</h1>
      <p className="text-muted-foreground mb-6">Aquí están tus módulos de capacitación asignados. Márcalos como completados a medida que los termines.</p>
      
      <Suspense fallback={<TrainingListSkeleton />}>
        <TrainingList initialTrainings={trainings} />
      </Suspense>
    </div>
  );
}

function TrainingListSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}
