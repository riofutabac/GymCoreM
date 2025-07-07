// src/lib/auth.ts
import { logoutUser } from '@/lib/api/auth';

/**
 * Función para cerrar sesión del usuario
 * Llama al endpoint de logout y redirige al login
 */
export async function handleLogout() {
  try {
    // Llamar al endpoint de logout para limpiar cookies del servidor
    await logoutUser();
    
    // Limpiar cualquier información local del cliente
    if (typeof window !== 'undefined') {
      // Limpiar localStorage/sessionStorage si los usas
      localStorage.clear();
      sessionStorage.clear();
    }
    
    // Redirigir al login
    window.location.href = '/login';
  } catch (error) {
    console.error('Error during logout:', error);
    // Incluso si hay error, redirigir al login
    window.location.href = '/login';
  }
}

/**
 * Función para obtener información del usuario desde cookies
 */
export function getUserInfo() {
  if (typeof window === 'undefined') return null;
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const userName = getCookie('user_name');
  const userEmail = getCookie('user_email');
  
  return {
    name: userName || 'Usuario',
    email: userEmail || '',
  };
}

/**
 * Función para obtener el rol del usuario desde cookies
 */
export function getUserRole(): 'owner' | 'manager' | 'receptionist' | 'member' | null {
  if (typeof window === 'undefined') return null;
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const role = getCookie('user_role');
  
  // Mapear roles del backend a roles del frontend
  const roleMap: Record<string, 'owner' | 'manager' | 'receptionist' | 'member'> = {
    'OWNER': 'owner',
    'MANAGER': 'manager', 
    'RECEPTIONIST': 'receptionist',
    'MEMBER': 'member'
  };

  return roleMap[role as string] || null;
}
