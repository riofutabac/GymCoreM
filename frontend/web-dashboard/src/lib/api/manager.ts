import { 
    Member, 
    StaffMember, 
    ActivateMembershipPayload, 
    CreateMemberPayload, 
    UpdateMemberPayload, 
    AssignStaffPayload,
    Product,
    ProductPayload
} from './types';
import { handleAuthError } from '@/lib/auth-utils';

// API Base URL configuration
const API_BASE_URL = 'http://localhost:3000';

const apiFetch = async (url: string, options?: RequestInit, returnBlob = false) => {
    const defaultOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Essential for sending/receiving httpOnly cookies
        ...options,
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1${url}`, defaultOptions);
        
        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({ message: res.statusText }));
            const error = new Error(errorBody.message || `API request failed: ${res.status}`);
            handleAuthError(error); // Handle authentication errors globally
            throw error;
        }
        
        if (returnBlob) {
            return res.blob();
        }
        
        if (options?.method === 'DELETE') {
            return;
        }
        
        return res.json();
    } catch (error) {
        console.error(`Error in API call to ${url}:`, error);
        if (error instanceof Error) {
            handleAuthError(error);
        }
        throw error;
    }
};

// --- Dashboard ---
export const getManagerDashboardKpis = async () => {
  return apiFetch('/analytics/kpis/my-gym');
};

// --- Members ---
export const getMembersForManager = async (): Promise<Member[]> => {
  const response = await apiFetch('/members');
  // El backend devuelve { items: Member[], total, page, limit, totalPages }
  const rawMembers = response.items || [];
  
  // Transformar los datos del backend al formato esperado por el frontend
  return rawMembers.map((member: any) => {
    // Obtener la membresía activa más reciente
    const activeMembership = member.memberships?.[0];
    
    // Determinar el estado de membresía
    let membershipStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
    let membershipEndDate = '';
    
    if (activeMembership) {
      const endDate = new Date(activeMembership.endDate);
      const today = new Date();
      
      if (activeMembership.status === 'ACTIVE') {
        if (endDate > today) {
          membershipStatus = 'ACTIVE';
        } else {
          membershipStatus = 'EXPIRED';
        }
      }
      
      membershipEndDate = activeMembership.endDate;
    }
    
    return {
      id: member.id,
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email,
      phone: member.phone || '',
      address: member.address || '',
      membershipStatus,
      membershipEndDate,
      role: member.role
    };
  });
};

export const createMember = async (payload: CreateMemberPayload) => {
    return apiFetch('/members', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateMember = async (payload: UpdateMemberPayload) => {
    return apiFetch(`/members/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

// --- Memberships ---
export const activateMembership = async (payload: ActivateMembershipPayload) => {
    return apiFetch('/memberships/activate', {
        method: 'POST',
        body: JSON.stringify({
            // 👇  nombres que entiende el microservicio
            userId: payload.memberId,
            startDate: payload.startsAt,
            endDate: payload.endsAt,
            amount: payload.amount,
            reason: payload.reason ?? 'Activación manual (pago en efectivo)',
        }),
    });
};

// --- Staff ---
export const getGymStaff = async (): Promise<StaffMember[]> => {
    const response = await apiFetch('/staff/my-gym');
    // Transformar los datos del backend al formato esperado por el frontend
    return response.map((staff: any) => ({
        id: staff.id,
        name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Sin nombre',
        email: staff.email,
        role: staff.role as 'MANAGER' | 'RECEPTIONIST' | 'OWNER'
    }));
};

export const assignStaff = async (payload: AssignStaffPayload) => {
    return apiFetch('/staff/assign', {
        method: 'POST',
        body: JSON.stringify({ ...payload, role: 'RECEPTIONIST' }),
    });
};

// --- Inventory ---
export const getProducts = async (): Promise<Product[]> => {
    return apiFetch('/inventory/products');
};

export const createProduct = async (payload: ProductPayload): Promise<Product> => {
    return apiFetch('/inventory/products', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateProduct = async (id: string, payload: ProductPayload): Promise<Product> => {
    return apiFetch(`/inventory/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const deleteProduct = async (id: string): Promise<void> => {
    return apiFetch(`/inventory/products/${id}`, { method: 'DELETE' });
};

// --- Reports ---
export const exportMembers = async (): Promise<Blob> => {
    return apiFetch('/reports/members/export', { headers: {} }, true);
};

export const exportSales = async (): Promise<Blob> => {
    return apiFetch('/reports/sales/export', { headers: {} }, true);
};

// --- Reset Password ---
export const resetMemberPassword = async (email: string) => {
    return apiFetch('/members/reset-password', { 
        method: 'POST', 
        body: JSON.stringify({ email }) 
    });
};

// --- Change User Role ---
export const changeUserRole = async (userId: string, role: string) => {
    return apiFetch(`/staff/${userId}/role`, { 
        method: 'PUT', 
        body: JSON.stringify({ role }) 
    });
};
