// Member API functions


import { MemberProfile, MembershipStatus, Payment, PayPalCheckoutResponse } from "./types";

/**
 * Get the member profile information
 * @returns Member profile data
 */
export const getMemberProfile = async (): Promise<MemberProfile> => {
  try {
    const response = await fetch('/api/v1/members/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch member profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching member profile', error);
    throw error;
  }
};

// Get member membership status
export const getMembershipStatus = async (): Promise<MembershipStatus> => {
  try {
    const response = await fetch('/api/v1/members/membership', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener el estado de la membresía');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching membership status', error);
    throw error;
  }
};

/**
 * Get payment history for the current member
 * @returns Array of payment history items
 */
export const getPaymentHistory = async (): Promise<Payment[]> => {
  try {
    const response = await fetch('/api/v1/members/me/payments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching payment history', error);
    throw error;
  }
};

// Create a PayPal checkout session
export const createPayPalCheckoutSession = async (amount: number, description: string): Promise<PayPalCheckoutResponse> => {
  try {
    const response = await fetch('/api/v1/payments/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        description,
        paymentMethod: 'paypal'
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear la sesión de pago');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating PayPal checkout session', error);
    throw error;
  }
};

/**
 * Join a gym using a code
 * @param code - The gym code to join
 * @returns Success response
 */
export const joinGym = async (code: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/v1/gyms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al unirse al gimnasio');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al unirse al gimnasio', error);
    throw error;
  }
};

// Renew membership
export const renewMembership = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/v1/memberships/renew', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al renovar la membresía');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error renewing membership:', error);
    throw error;
  }
};

/**
 * Update member profile information
 * @param profileData - The updated profile data
 * @returns Success response
 */
export const updateMemberProfile = async (profileData: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/v1/members/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar el perfil');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al actualizar el perfil', error);
    throw error;
  }
};

/**
 * Get member visit history
 * @returns Array of visit history items
 */
export const getMemberVisitHistory = async (): Promise<Array<{
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: string;
}>> => {
  try {
    const response = await fetch('/api/v1/members/me/visits', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener el historial de visitas');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al obtener el historial de visitas', error);
    throw error;
  }
};
