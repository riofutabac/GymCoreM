import { handleAuthError } from '@/lib/auth-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

// Helper genérico para llamadas a la API
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Esencial para enviar/recibir cookies httpOnly
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error de red o respuesta no válida.' }));
      const error = new Error(errorData.message || `Error ${response.status}`);
      handleAuthError(error); // Maneja errores de autenticación globalmente
      throw error;
    }

    // Para respuestas sin contenido (ej. DELETE)
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    console.error(`Error en API call a ${endpoint}:`, error);
    if (error instanceof Error) {
        handleAuthError(error);
    }
    throw error;
  }
}

// Objeto que agrupa todas las funciones de la API del Owner
export const ownerApi = {
  // Analíticas
  getKpis: () => apiCall<any>('/analytics/kpis'),
  getGlobalTrends: () => apiCall<any>('/analytics/global-trends'),

  // Gestión de Gimnasios
  getGyms: () => apiCall<any[]>('/gyms'),
  createGym: (data: { name: string }) => apiCall<any>('/gyms', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateGym: (id: string, data: { name?: string; isActive?: boolean }) => apiCall<any>(`/gyms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteGym: (id: string) => apiCall<void>(`/gyms/${id}`, {
    method: 'DELETE',
  }),

  // Gestión de Staff
  getStaff: () => apiCall<any[]>('/staff'),
  updateUserProfile: (id: string, data: { firstName?: string; lastName?: string }) => apiCall<any>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  assignManager: (gymId: string, userId: string) => apiCall<any>(`/gyms/${gymId}/assign-manager`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  updateUserRole: (userId: string, role: string) => apiCall<any>(`/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  }),
  requestPasswordReset: (email: string) => apiCall<any>('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
};
