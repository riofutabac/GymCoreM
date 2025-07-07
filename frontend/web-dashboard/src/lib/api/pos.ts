// Frontend API functions for POS Real
import { CreateSaleDto, CreateSaleResponse, SaleResponse } from './types';

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
};

// Legacy exports for backward compatibility
export const createSaleCash = posApi.createCashSale;
export const createSaleCard = posApi.createCardSale;
export const findProductByBarcode = posApi.findProductByBarcode;
