"use server";

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import * as z from "zod";

import { loginUser } from '@/lib/api/auth';
import { loginFormSchema } from '@/lib/validations';

export type FormState = {
  success: boolean;
  message: string;
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

    if (data && data.access_token) {
      cookies().set("jwt_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 día de expiración
      });
      // La redirección ocurre fuera, solo si el estado es exitoso
    } else {
      return { success: false, message: data.message || "No se recibió el token de acceso." };
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
  redirect('/dashboard');
}

export async function logoutAction() {
  cookies().delete('jwt_token');
  redirect('/login');
}
