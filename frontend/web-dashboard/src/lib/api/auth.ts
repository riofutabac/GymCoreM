import { loginFormSchema, registerFormSchema } from "@/lib/validations";
import * as z from "zod";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000/api/v1';

/**
 * Llama al endpoint de registro del API Gateway.
 * @param userData - Datos del formulario de registro.
 * @returns La respuesta del servidor.
 */
export async function registerUser(userData: z.infer<typeof registerFormSchema>) {
  const response = await fetch(`${API_GATEWAY_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${API_GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Credenciales inválidas.');
  }

  return response.json();
}