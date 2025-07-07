// Frontend API functions for Inventory Management
import { ProductDto } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

// Helper function to get auth token
function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('jwt_token='))
    ?.split('=')[1] ?? '';
}

// Helper function to make authenticated API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
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
