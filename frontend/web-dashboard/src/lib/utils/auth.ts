// 🔒 MEJORA 5: Utilidades de autenticación centralizadas

export const VALID_ROLES = ['owner', 'manager', 'receptionist', 'member'] as const;

export type UserRole = typeof VALID_ROLES[number];

export const isValidRole = (role: string | undefined): role is UserRole => {
  return role !== undefined && VALID_ROLES.includes(role as UserRole);
};

export const sanitizeRole = (role: string | undefined): UserRole => {
  return isValidRole(role) ? role : 'member';
};

// Función para verificar si un token JWT ha expirado (básica)
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // Si no se puede decodificar, considerarlo expirado
  }
};
