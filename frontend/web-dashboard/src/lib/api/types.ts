// Types for POS API

export interface CreateSaleItemDto {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateSaleDto {
  items: CreateSaleItemDto[];
  total: number;
  paymentRef?: string;
}

export interface CreateSaleResponse {
  saleId: string;
  approvalUrl: string;
}

export interface SaleResponse {
  saleId: string;
  status: string;
  message: string;
}

// Product types for inventory management
export interface ProductDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  barcode: string;
  gymId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  barcode: string;
  gymId: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Sale {
  id: string;
  gymId: string;
  cashierId: string;
  totalAmount: number;
  paymentType: 'CASH' | 'CARD_PRESENT' | 'PAYPAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentRef?: string;
  completedAt?: Date;
  createdAt: Date;
  items: SaleItem[];
}

// Types for Inventory Management
export interface ProductDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  barcode: string;
  gymId: string;
  createdAt: Date;
  updatedAt: Date;
}
