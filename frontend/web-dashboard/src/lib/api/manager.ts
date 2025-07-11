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

const apiFetch = async (url: string, options?: RequestInit, returnBlob = false) => {
    const res = await fetch(`/api/v1${url}`, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorBody.message || 'API request failed');
    }
    if (returnBlob) {
        return res.blob();
    }
    if (options?.method === 'DELETE') {
        return;
    }
    return res.json();
};

// --- Dashboard ---
export const getManagerDashboardKpis = async () => {
  return apiFetch('/analytics/kpis/my-gym');
};

// --- Members ---
export const getMembersForManager = async (): Promise<Member[]> => {
  return apiFetch('/members'); 
};

export const createMember = async (payload: CreateMemberPayload) => {
    return apiFetch('/members', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateMember = async (payload: UpdateMemberPayload) => {
    return apiFetch(`/members/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

// --- Memberships ---
export const activateMembership = async (payload: ActivateMembershipPayload) => {
    return apiFetch('/memberships/activate', { method: 'POST', body: JSON.stringify(payload) });
};

// --- Staff ---
export const getGymStaff = async (): Promise<StaffMember[]> => {
    return apiFetch('/staff/my-gym');
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
    return apiFetch('/members/export', { headers: {} }, true);
};

export const exportSales = async (): Promise<Blob> => {
    return apiFetch('/pos/sales/export', { headers: {} }, true);
};
