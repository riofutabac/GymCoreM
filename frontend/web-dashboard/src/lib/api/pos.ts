// Frontend API functions for POS Real
import { CreateSaleDto, CreateSaleResponse, SaleResponse } from './types';
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

// POS API functions
export const posApi = {
  // Find product by barcode
  async findProductByBarcode(barcode: string) {
    return apiCall(`/pos/products/${barcode}`);
  },

  // List all products
  async listProducts() {
    return apiCall('/pos/products');
  },

  // Create PayPal sale (existing async flow)
  async createPayPalSale(dto: CreateSaleDto): Promise<CreateSaleResponse> {
    return apiCall('/pos/sales', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Create cash sale (instant)
  async createCashSale(dto: CreateSaleDto): Promise<SaleResponse> {
    return apiCall('/pos/sales/cash', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Create card present sale (instant)
  async createCardSale(dto: CreateSaleDto): Promise<SaleResponse> {
    return apiCall('/pos/sales/card-present', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // List all sales
  async listSales() {
    return apiCall('/pos/sales');
  },

  // Get sale by ID
  async getSale(saleId: string) {
    return apiCall(`/pos/sales/${saleId}`);
  },

  // Inventory Management Functions
  // List all products (inventory)
  async listInventoryProducts() {
    return apiCall('/inventory/products');
  },

  // Create a new product
  async createProduct(product: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    barcode: string;
  }) {
    return apiCall('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  // Update an existing product
  async updateProduct(id: string, product: {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    barcode?: string;
  }) {
    return apiCall(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  // Delete a product
  async deleteProduct(id: string) {
    return apiCall(`/inventory/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Diagnostic function to test API connectivity and permissions
  async testConnection() {
    try {
      console.log('🔍 Testing API connection...');
      
      // Test user authentication
      const authTest = await apiCall('/auth/me');
      console.log('✅ Auth check:', authTest);
      
      // Test products list
      const productsTest = await apiCall('/inventory/products');
      console.log('✅ Products list:', productsTest.length, 'products found');
      
      return {
        success: true,
        auth: authTest,
        productCount: productsTest.length
      };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
};

// Legacy exports for backward compatibility
export const createSaleCash = posApi.createCashSale;
export const createSaleCard = posApi.createCardSale;
export const findProductByBarcode = posApi.findProductByBarcode;
