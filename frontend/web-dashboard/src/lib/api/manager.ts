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
            // --- MODIFICACIÓN PARA DIAGNÓSTICO ---
            const errorText = await res.text(); // Get raw response text
            console.error(`API Error Response (raw): ${errorText}`); // Log raw text
            // --- FIN MODIFICACIÓN ---
            
            let errorBody;
            try {
                errorBody = JSON.parse(errorText); // Try parsing as JSON
            } catch (jsonError) {
                // If JSON parsing fails, use the raw text as the message
                errorBody = { message: `API request failed: ${res.status} - ${errorText}` };
                console.error(`Failed to parse error response as JSON:`, jsonError);
            }

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
    let membershipStatus: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED' | 'GRACE_PERIOD' | 'BANNED' | 'INACTIVE' = 'INACTIVE';
    let membershipEndDate = '';
    let activeMembershipId = undefined;
    
    if (activeMembership) {
      const endDate = new Date(activeMembership.endDate);
      const today = new Date();
      
      // Mapear directamente el estado del backend, pero validar ACTIVE contra fecha
      switch (activeMembership.status) {
        case 'ACTIVE':
          // Verificar si realmente está activa o expiró
          membershipStatus = endDate > today ? 'ACTIVE' : 'EXPIRED';
          break;
        case 'PENDING_PAYMENT':
          membershipStatus = 'PENDING_PAYMENT';
          // No asignar fecha para usuarios pendientes de pago
          membershipEndDate = '';
          break;
        case 'EXPIRED':
          membershipStatus = 'EXPIRED';
          break;
        case 'CANCELLED':
          membershipStatus = 'CANCELLED';
          break;
        case 'GRACE_PERIOD':
          membershipStatus = 'GRACE_PERIOD';
          break;
        case 'BANNED':
          membershipStatus = 'BANNED';
          break;
        default:
          membershipStatus = 'INACTIVE';
      }
      
      // Asignar la fecha para todos los estados excepto PENDING_PAYMENT
      if (membershipStatus !== 'PENDING_PAYMENT') {
        membershipEndDate = activeMembership.endDate;
      }
      
      activeMembershipId = activeMembership.id;
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
      activeMembershipId, // Include the membership ID
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

export const renewMembership = async (payload: {
    membershipId: string;
    newEndDate: string;
    amount?: number;
    reason?: string;
}) => {
    return apiFetch('/memberships/renew', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const banMembership = async (membershipId: string, reason?: string) =>
  apiFetch(`/memberships/${membershipId}/ban`, {
    method: 'POST',
    body  : JSON.stringify({ reason }),
  });

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
