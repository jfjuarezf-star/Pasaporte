

'use server';

import { revalidatePath } from 'next/cache';
import { CreateUserSchema, CreateTrainingSchema, UpdateUserSchema } from '@/lib/schemas';
import {
  assignTrainingToUsers as assignTrainingToUsersData,
  createTraining as createTrainingData,
  deleteTraining as deleteTrainingData,
  deleteUser as deleteUserData,
  createUser as createUserData,
  updateUserData,
  promoteUser as promoteUserData,
  findUserByEmail,
  findUserByUsername,
  assignTrainingToUser as assignTrainingToUserData,
  updateTraining as updateTrainingData,
} from '@/lib/data';
import type { Training, UserCategory } from '@/lib/types';
import { getCurrentUserId } from '@/lib/auth';

export async function createUser(prevState: any, formData: FormData) {
    const validatedFields = CreateUserSchema.safeParse({
        name: formData.get('name'),
        username: formData.get('username'),
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
        const existingUsername = await findUserByUsername(validatedFields.data.username);
        if (existingUsername) {
            return {
                errors: { username: ['Este nombre de usuario ya está en uso.'] },
                message: 'Error al crear el usuario.',
            };
        }

        if (validatedFields.data.email) {
            const existingUserEmail = await findUserByEmail(validatedFields.data.email);
            if (existingUserEmail) {
                return {
                    errors: { email: ['Este correo electrónico ya está en uso.'] },
                    message: 'Error al crear el usuario.',
                };
            }
        }
        
        await createUserData({
            name: validatedFields.data.name, 
            username: validatedFields.data.username,
            email: validatedFields.data.email,
            password: validatedFields.data.password, 
            role: validatedFields.data.role as 'user' | 'admin',
            categories: validatedFields.data.categories as UserCategory[]
        });
        revalidatePath('/admin');
        return { success: true, message: `Usuario creado con la contraseña: ${validatedFields.data.password}. ¡Recuerda compartirla!`, errors: {} };
    } catch (error: any) {
        return { message: error.message || 'No se pudo crear el usuario.', errors: {} };
    }
}

export async function updateUser(prevState: any, formData: FormData) {
    const userId = formData.get('userId') as string;
    if (!userId) {
        return { message: 'ID de usuario no encontrado.', errors: {}, success: false };
    }

    const validatedFields = UpdateUserSchema.safeParse({
        name: formData.get('name'),
        username: formData.get('username'),
        email: formData.get('email'),
        role: formData.get('role'),
        categories: formData.getAll('categories'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error de validación. Por favor, revisa los campos.',
            success: false,
        };
    }
    
    try {
        const existingUsername = await findUserByUsername(validatedFields.data.username);
        if (existingUsername && existingUsername.id !== userId) {
            return {
                errors: { username: ['Este nombre de usuario ya está en uso por otro usuario.'] },
                message: 'Error al actualizar el usuario.',
                success: false,
            };
        }
        
        if (validatedFields.data.email) {
            const existingUserEmail = await findUserByEmail(validatedFields.data.email);
            if (existingUserEmail && existingUserEmail.id !== userId) {
                return {
                    errors: { email: ['Este correo electrónico ya está en uso por otro usuario.'] },
                    message: 'Error al actualizar el usuario.',
                    success: false,
                };
            }
        }

        await updateUserData(userId, {
            name: validatedFields.data.name,
            username: validatedFields.data.username,
            email: validatedFields.data.email,
            role: validatedFields.data.role as 'user' | 'admin',
            categories: validatedFields.data.categories as UserCategory[],
        });

        revalidatePath('/admin');
        return { success: true, message: 'Usuario actualizado exitosamente.', errors: {} };
    } catch (error: any) {
        return { message: error.message || 'No se pudo actualizar el usuario.', errors: {}, success: false };
    }
}


export async function createTraining(prevState: any, formData: FormData) {
    const validatedFields = CreateTrainingSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        urgency: formData.get('urgency'),
        duration: formData.get('duration'),
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
        });
        revalidatePath('/admin');
        return { success: true, message: 'Capacitación creada exitosamente.', errors: {} };
    } catch (error: any) {
        return { message: error.message || 'No se pudo crear la capacitación.', errors: {} };
    }
}

export async function updateTraining(prevState: any, formData: FormData) {
    const trainingId = formData.get('trainingId') as string;
    if (!trainingId) {
        return { message: 'ID de capacitación no encontrado.', errors: {} };
    }
    const validatedFields = CreateTrainingSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        urgency: formData.get('urgency'),
        duration: formData.get('duration'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error de validación. Por favor, revisa los campos.',
        };
    }

    try {
        await updateTrainingData(trainingId, {
            title: validatedFields.data.title,
            description: validatedFields.data.description,
            category: validatedFields.data.category as Training['category'],
            urgency: validatedFields.data.urgency as Training['urgency'],
            duration: validatedFields.data.duration,
        });
        revalidatePath('/admin');
        return { success: true, message: 'Capacitación actualizada exitosamente.', errors: {} };
    } catch (error: any) {
        return { message: error.message || 'No se pudo actualizar la capacitación.', errors: {} };
    }
}


export async function assignTrainingToUser(trainingId: string, userId: string, scheduledDate?: string, trainerName?: string) {
    try {
        await assignTrainingToUserData(trainingId, userId, scheduledDate, trainerName);
        revalidatePath('/admin');
        return { success: true, message: 'Asignación exitosa.' };
    } catch (error) {
        return { success: false, message: 'Error al asignar.' };
    }
}

export async function assignTrainingToUsers(trainingId: string, userIds: string[], scheduledDate?: string, trainerName?: string) {
    if (!userIds || userIds.length === 0) {
        return { success: false, message: 'No se seleccionaron usuarios.' };
    }
    try {
        await assignTrainingToUsersData(trainingId, userIds, scheduledDate, trainerName);
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

