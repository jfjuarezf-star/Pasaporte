

import { z } from 'zod';

const userCategories = z.enum(['Supervisión', 'Ingresantes', 'Operaciones', 'Línea de Mando (FC)', 'Terceros', 'Mantenimiento', 'Brigadistas', 'RRHH']);

export const CreateUserSchema = z.object({
  name: z.string().min(3, { message: 'El nombre completo debe tener al menos 3 caracteres.' }),
  username: z.string().min(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres.' }).regex(/^[a-zA-Z0-9_.-]+$/, { message: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.'}),
  email: z.string().email({ message: 'Por favor, introduce un correo válido.' }).optional().or(z.literal('')),
  password: z.string().min(4, { message: 'La contraseña debe tener al menos 4 caracteres.' }),
  role: z.enum(['user', 'admin']),
  categories: z.array(userCategories).optional(),
}).refine(data => {
    if (data.role === 'admin' && !data.email) {
        return false;
    }
    return true;
}, {
    message: "El correo electrónico es obligatorio para los administradores.",
    path: ["email"],
});


export const UpdateUserSchema = z.object({
  name: z.string().min(3, { message: 'El nombre completo debe tener al menos 3 caracteres.' }),
  username: z.string().min(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres.' }).regex(/^[a-zA-Z0-9_.-]+$/, { message: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.'}),
  email: z.string().email({ message: 'Por favor, introduce un correo válido.' }).optional().or(z.literal('')),
  role: z.enum(['user', 'admin']),
  categories: z.array(userCategories).optional(),
}).refine(data => {
    if (data.role === 'admin' && !data.email) {
        return false;
    }
    return true;
}, {
    message: "El correo electrónico es obligatorio para los administradores.",
    path: ["email"],
});


export const CreateTrainingSchema = z.object({
  title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres.' }),
  category: z.enum(['Seguridad', 'Calidad', 'DPO', 'TPM', 'Medio Ambiente', 'Mejora Enfocada', 'Obligatoria'], { errorMap: () => ({ message: 'Debes seleccionar una categoría.' }) }),
  urgency: z.enum(['high', 'medium', 'low'], { errorMap: () => ({ message: 'Debes seleccionar una urgencia.' }) }),
  duration: z.coerce.number().min(1, { message: 'La duración debe ser al menos 1 minuto.' }),
  validityDays: z.coerce.number().min(0, { message: 'La vigencia no puede ser negativa.' }).optional(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida.'),
    newPassword: z.string().min(4, 'La nueva contraseña debe tener al menos 4 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las nuevas contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

