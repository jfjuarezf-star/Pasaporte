
export type TrainingCategory = 'Seguridad' | 'Calidad' | 'DPO' | 'TPM' | 'Medio Ambiente' | 'Mejora Enfocada' | 'Obligatoria';
export type TrainingStatus = 'completed' | 'pending';
export type TrainingUrgency = 'high' | 'medium' | 'low';
export type UserCategory = 'Supervisión' | 'Ingresantes' | 'Operaciones' | 'Línea de Mando (FC)' | 'Terceros' | 'Mantenimiento' | 'Brigadistas' | 'RRHH';

export type User = {
  id: string;
  name: string; // Full name
  username: string; // Unique username for login
  email?: string; // Optional email
  avatarUrl: string;
  role: 'admin' | 'user';
  passwordHash: string;
  categories?: UserCategory[]; // User categories for bulk assignment
};

export type Assignment = {
  id: string;
  userId: string;
  trainingId: string;
  status: TrainingStatus;
  assignedDate?: string; // ISO date string when status is 'pending'
  completedDate?: string; // ISO date string when status is 'completed'
  scheduledDate?: string; // ISO date string for when the training is planned for this specific user
};

// This is the shape of data passed to the TrainingCard
export type PopulatedAssignment = Training & Assignment & {
  assignmentId: string;
};


// Used for the Training -> Users dialog
export type Participant = Assignment & {
    user?: User | null;
}

export type PopulatedTrainingWithUsers = Training & {
    participants: Participant[];
}

export type Training = {
  id: string;
  title: string;
  description: string;
  category: TrainingCategory;
  urgency: TrainingUrgency;
  duration?: number; // Duration in minutes
  trainerName: string; // Name of the person giving the training
};
