/**
 * Utilidad para manejar errores de autenticación de manera consistente
 */
export function handleAuthError(error: Error): void {
  // Si es un error 401, limpiar las cookies accesibles desde JS
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    // Solo limpiar cookies no HTTP-Only (user_name, user_email)
    document.cookie = 'user_name=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    document.cookie = 'user_email=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    
    // Redirigir al login
    window.location.href = '/login';
  }
}

/**
 * Helper para obtener información básica del usuario desde cookies no HTTP-Only
 */
export function getUserFromCookies() {
  if (typeof window === 'undefined') return null;
  
  const userName = document.cookie
    .split('; ')
    .find(row => row.startsWith('user_name='))
    ?.split('=')[1];
  
  const userEmail = document.cookie
    .split('; ')
    .find(row => row.startsWith('user_email='))
    ?.split('=')[1];
  
  return userName && userEmail ? { name: userName, email: userEmail } : null;
}
