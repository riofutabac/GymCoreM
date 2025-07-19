import { loginFormSchema, registerFormSchema } from "@/lib/validations";
import * as z from "zod";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_GATEWAY_URL}/api/v1`;

/**
 * Llama al endpoint de registro del API Gateway.
 * @param userData - Datos del formulario de registro.
 * @returns La respuesta del servidor.
 */
export async function registerUser(userData: z.infer<typeof registerFormSchema>) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Para enviar cookies HTTP-Only
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error en el registro.');
  }

  return response.json();
}

/**
 * Llama al endpoint de login del API Gateway.
 * @param credentials - Credenciales del formulario de login.
 * @returns La respuesta del servidor, que debe incluir el access_token.
 */
export async function loginUser(credentials: z.infer<typeof loginFormSchema>) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Para recibir cookies HTTP-Only
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Credenciales inválidas.');
  }

  return response.json();
}

/**
 * Llama al endpoint de logout del API Gateway.
 * @returns La respuesta del servidor.
 */
export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include', // Para enviar cookies HTTP-Only
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al cerrar sesión.');
  }

  return response.json();
}

/**
 * Obtiene la información del usuario autenticado
 * @returns La información del usuario actual
 */
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    credentials: 'include', // Para enviar cookies HTTP-Only
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('No autenticado');
    }
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error obteniendo información del usuario.');
  }

  return response.json();
}


export async function updateProfile(data: { firstName?: string; lastName?: string }) {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al actualizar perfil');
  return response.json();
};

export async function forgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: email })
  });
  if (!response.ok) throw new Error('Error al solicitar recuperación de contraseña');
  return response.json();
};