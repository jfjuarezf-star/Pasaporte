
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChangePasswordSchema } from '@/lib/schemas';
import {
  updateAssignmentStatus as updateAssignmentStatusData,
  getUserById,
  updateUserPassword,
  authenticateUser,
} from '@/lib/data';
import type { TrainingStatus } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';


export async function logout() {
  cookies().delete('userId');
  redirect('/');
}

export async function updateTrainingStatus(assignmentId: string, isCompleted: boolean) {
  const newStatus: TrainingStatus = isCompleted ? 'completed' : 'pending';
  await updateAssignmentStatusData(assignmentId, newStatus);
  revalidatePath('/dashboard');
  revalidatePath('/admin');
}

export async function changePassword(prevState: any, formData: FormData) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { message: 'Debes iniciar sesión para cambiar tu contraseña.', status: 'error' };
  }
  const currentUser = await getUserById(currentUserId);
   if (!currentUser) {
    return { message: 'Usuario no encontrado.', status: 'error' };
  }

  const validatedFields = ChangePasswordSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    const firstError = validatedFields.error.errors[0];
    return { message: firstError.message, status: 'error' };
  }

  const { currentPassword, newPassword } = validatedFields.data;
  
  const authResult = await authenticateUser(currentUser.email, currentPassword);
  if (!authResult.user || authResult.error) {
    return { message: authResult.error || 'La contraseña actual es incorrecta.', status: 'error' };
  }

  try {
    await updateUserPassword(currentUser.id, newPassword);
    return { message: '¡Contraseña actualizada exitosamente!', status: 'success' };
  } catch (error) {
    return { message: 'Ocurrió un error al actualizar la contraseña.', status: 'error' };
  }
}
