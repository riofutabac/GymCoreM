// Frontend API functions for Inventory Management
import { ProductDto } from './types';
import { handleAuthError } from '@/lib/auth-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

// Helper function to make authenticated API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // 🔐 Clave para enviar cookies HTTP-Only
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      const errorMessage = error.message ?? `HTTP ${response.status}`;
      const apiError = new Error(errorMessage);
      
      // Manejar errores de autenticación
      handleAuthError(apiError);
      
      throw apiError;
    }

    return response.json();
  } catch (error) {
    // Manejar errores de red o parsing
    if (error instanceof Error) {
      handleAuthError(error);
    }
    throw error;
  }
}

// Product management API
export const inventoryApi = {
  // List all products
  list: (): Promise<ProductDto[]> => 
    apiCall<ProductDto[]>('/inventory/products'),

  // Create a new product
  create: (product: Omit<ProductDto, 'id' | 'createdAt' | 'updatedAt' | 'gymId'>): Promise<ProductDto> =>
    apiCall<ProductDto>('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  // Update an existing product
  update: (id: string, product: Partial<Omit<ProductDto, 'id' | 'createdAt' | 'updatedAt' | 'gymId'>>): Promise<ProductDto> =>
    apiCall<ProductDto>(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),

  // Delete a product
  remove: (id: string): Promise<void> =>
    apiCall<void>(`/inventory/products/${id}`, {
      method: 'DELETE',
    }),
};
