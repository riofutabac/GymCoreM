"use server";

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import * as z from "zod";

import { loginUser } from '@/lib/api/auth';
import { loginFormSchema } from '@/lib/validations';

export type FormState = {
  success: boolean;
  message: string;
  redirectUrl?: string;
};

export async function loginAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = loginFormSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Datos inválidos. Por favor, revisa el formulario.",
    };
  }

  try {
    const data = await loginUser(validatedFields.data);

    // El backend devuelve un objeto complejo con el token y los datos del usuario
    if (data && data.access_token && data.user && data.user.role) {
      const user = data.user;
      const userRole = user.role.toLowerCase(); // Convertimos a minúsculas: 'OWNER' -> 'owner'
      
      // 🔒 MEJORA 3: Validar que el rol del backend sea válido
      const validRoles = ['owner', 'manager', 'receptionist', 'member'];
      if (!validRoles.includes(userRole)) {
        return { 
          success: false, 
          message: "Rol de usuario no válido. Contacta al administrador." 
        };
      }

      const cookieStore = await cookies();

      // Guardamos el token en una cookie segura
      cookieStore.set("jwt_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 día de expiración
      });

      // Guardamos el rol en otra cookie para que el middleware pueda usarlo
      cookieStore.set("user_role", userRole, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      // ¡NUEVO! Guardamos el nombre y email del usuario
      cookieStore.set("user_name", `${user.firstName} ${user.lastName}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      cookieStore.set("user_email", user.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      // ¡LÓGICA DE REDIRECCIÓN DINÁMICA!
      let dashboardUrl = '/'; // Fallback por si el rol no es reconocido

      switch (userRole) {
        case 'owner':
          dashboardUrl = '/owner';
          break;
        case 'manager':
          dashboardUrl = '/manager';
          break;
        case 'member':
          dashboardUrl = '/member';
          break;
        case 'receptionist':
          dashboardUrl = '/receptionist';
          break;
      }

      // En lugar de redirigir, devolvemos éxito y la URL
      return { success: true, message: "Login exitoso.", redirectUrl: dashboardUrl };

    } else {
      return { success: false, message: data.message || "No se recibió el token o el rol del usuario." };
    }
  } catch (error) {
    console.error("Error en loginAction:", error);
    if (error instanceof Error) {
        if (error.message.includes('fetch')) {
            return { success: false, message: "Error de conexión. El servidor no está disponible." };
        }
        return { success: false, message: error.message };
    }
    return { success: false, message: "Ha ocurrido un error inesperado." };
  }

  // Si todo fue bien, redirigimos
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('jwt_token');
  cookieStore.delete('user_role');
  cookieStore.delete('user_name');
  cookieStore.delete('user_email');
  redirect('/login');
}
