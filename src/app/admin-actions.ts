
'use server';

import { revalidatePath } from 'next/cache';
import { CreateUserSchema, CreateTrainingSchema } from '@/lib/schemas';
import {
  assignTrainingToUsers as assignTrainingToUsersData,
  createTraining as createTrainingData,
  deleteTraining as deleteTrainingData,
  deleteUser as deleteUserData,
  createUser as createUserData,
  promoteUser as promoteUserData,
  findUserByEmail,
  assignTrainingToUser,
} from '@/lib/data';
import type { Training, UserCategory } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';

export async function createUser(prevState: any, formData: FormData) {
    const validatedFields = CreateUserSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        categories: formData.getAll('categories')
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error de validación. Por favor, revisa los campos.',
        };
    }
    
    try {
        const existingUser = await findUserByEmail(validatedFields.data.email);
        if (existingUser) {
            return {
                errors: { email: ['Este correo electrónico ya está en uso.'] },
                message: 'Error al crear el usuario.',
            };
        }

        await createUserData(
            validatedFields.data.name, 
            validatedFields.data.email, 
            validatedFields.data.password, 
            validatedFields.data.role as 'user' | 'admin',
            validatedFields.data.categories as UserCategory[]
        );
        revalidatePath('/admin');
        return { success: true, message: `Usuario creado con la contraseña: ${validatedFields.data.password}. ¡Recuerda compartirla!`, errors: {} };
    } catch (error: any) {
        return { message: error.message || 'No se pudo crear el usuario.', errors: {} };
    }
}


export async function createTraining(prevState: any, formData: FormData) {
    const scheduledDate = formData.get('scheduledDate');
    const validatedFields = CreateTrainingSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        urgency: formData.get('urgency'),
        duration: formData.get('duration'),
        trainerName: formData.get('trainerName'),
        scheduledDate: scheduledDate ? new Date(scheduledDate as string).toISOString() : undefined,
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error de validación. Por favor, revisa los campos.',
        };
    }

    try {
        await createTrainingData({
            title: validatedFields.data.title,
            description: validatedFields.data.description,
            category: validatedFields.data.category as Training['category'],
            urgency: validatedFields.data.urgency as Training['urgency'],
            duration: validatedFields.data.duration,
            trainerName: validatedFields.data.trainerName,
            scheduledDate: validatedFields.data.scheduledDate,
        });
        revalidatePath('/admin');
        return { success: true, message: 'Capacitación creada exitosamente.', errors: {} };
    } catch (error: any) {
        return { message: error.message || 'No se pudo crear la capacitación.', errors: {} };
    }
}

export async function assignTraining(trainingId: string, userId: string) {
    try {
        await assignTrainingToUser(trainingId, userId);
        revalidatePath('/admin');
        return { success: true, message: 'Asignación exitosa.' };
    } catch (error) {
        return { success: false, message: 'Error al asignar.' };
    }
}

export async function assignTrainingToUsers(trainingId: string, userIds: string[]) {
    if (!userIds || userIds.length === 0) {
        return { success: false, message: 'No se seleccionaron usuarios.' };
    }
    try {
        await assignTrainingToUsersData(trainingId, userIds);
        revalidatePath('/admin');
        return { success: true, message: 'Asignación masiva exitosa.' };
    } catch (error) {
        return { success: false, message: 'Error en la asignación masiva.' };
    }
}

export async function deleteTraining(trainingId: string) {
    try {
        await deleteTrainingData(trainingId);
        revalidatePath('/admin');
        return { success: true, message: 'Capacitación eliminada.' };
    } catch (error) {
        console.error('Failed to delete training:', error);
        return { success: false, message: 'Error al eliminar la capacitación.' };
    }
}

export async function deleteUser(userId: string) {
    const currentUserId = await getCurrentUserId();
    if (currentUserId === userId) {
        console.error('Attempted to self-delete user:', userId);
        return { success: false, message: 'No puedes eliminarte a ti mismo.' };
    }

    try {
        await deleteUserData(userId);
        revalidatePath('/admin');
        return { success: true, message: 'Usuario eliminado.' };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, message: 'Error al eliminar el usuario.' };
    }
}


export async function promoteUser(userId: string) {
    try {
        await promoteUserData(userId);
        revalidatePath('/admin');
        return { success: true, message: 'Usuario promovido.' };
    } catch (error) {
        console.error('Failed to promote user:', error);
        return { success: false, message: 'Error al promover al usuario.' };
    }
}
