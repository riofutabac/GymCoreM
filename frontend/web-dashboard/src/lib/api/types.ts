// Manager Panel Types
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  membershipEndDate: string;
  activeMembershipId?: string; // Add this line
  role: 'MEMBER' | 'RECEPTIONIST' | 'MANAGER';
}

export interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: 'MANAGER' | 'RECEPTIONIST' | 'OWNER';
}

export interface Product {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    stock: number;
    barcode?: string | null;
    gymId: string;
}

export interface ActivateMembershipPayload {
  memberId: string;
  startsAt: string;
  endsAt: string;
  amount?: number;
  paymentType: 'CASH' | 'ONLINE';
  reason?: string; // Add this line
}

export interface CreateMemberPayload {
    name: string;
    email: string;
    phone?: string;
    address?: string;
}

export interface UpdateMemberPayload extends CreateMemberPayload {
    id: string;
}

export interface AssignStaffPayload {
    userId: string;
}

export interface ProductPayload {
    name: string;
    description?: string;
    price: number;
    stock: number;
    barcode?: string;
}

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

// Types for Member Portal
export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  gymId: string | null;
  gym?: {
    id: string;
    name: string;
    address: string;
    openingHours?: string;
    contactPhone?: string;
  };
  visits?: {
    thisMonth: number;
    change: number;
    history?: Array<{
      date: string;
      checkInTime: string;
      checkOutTime?: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MembershipStatus {
  id: string;
  memberId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'BANNED';
  type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TRIAL';
  startDate: string;
  expiresAt: string;
  nextPayment?: {
    date: string;
    amount: string;
  };
  paymentMethod?: string;
  autoRenew: boolean;
}

export interface Payment {
  id: string;
  date: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  paymentMethod: string;
  reference?: string;
}

export interface PayPalCheckoutResponse {
  url: string;
  token: string;
  expiresAt: string;
}
