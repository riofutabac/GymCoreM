import { API_V1_URL } from './config';

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function updateUserProfile(data: ProfileUpdateData) {
  const response = await fetch(`${API_V1_URL()}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar el perfil');
  }
  
  return response.json();
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_V1_URL()}/auth/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al solicitar restablecimiento de contraseña');
  }
  
  return response.json();
}
