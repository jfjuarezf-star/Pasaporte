
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authenticateUser } from '@/lib/data';
import type { User } from '@/lib/types';

export async function login(prevState: { message: string }, formData: FormData) {
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;

  if (!identifier || !password) {
    return { message: 'El nombre de usuario/correo y la contraseña son requeridos.' };
  }
  
  let user: User | null = null;
  
  try {
    const authResult = await authenticateUser(identifier, password);

    if (authResult.error || !authResult.user) {
      return { message: authResult.error || 'Credenciales inválidas o el usuario no existe.' };
    }
    
    user = authResult.user;

    // Si llegamos aquí, el usuario se autenticó correctamente.
    cookies().set('userId', user.id, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

  } catch (error: unknown) {
     console.error('Login critical error:', error);
     // No exponer detalles del error al cliente en producción
     return { message: 'Ocurrió un error inesperado durante el inicio de sesión.' };
  }

  // La redirección DEBE ocurrir fuera del bloque try/catch.
  if (user) {
    if (user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }
  
  // Este retorno es por si la redirección falla, aunque no debería.
  return { message: 'Error de redirección.' };
}
