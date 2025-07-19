const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_GATEWAY_URL}/api/v1`;

export async function getMemberDashboard() {
  const response = await fetch(`${API_BASE_URL}/member/dashboard`, { credentials: 'include' });
  if (!response.ok) throw new Error('Error al obtener dashboard');
  return response.json();
}

/**
 * Interfaz que define la estructura de respuesta del perfil de miembro
 * Esta interfaz debe coincidir con el DTO del backend
 */
export interface MemberProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'MEMBER' | 'MANAGER' | 'OWNER';
  hasGym: boolean;
  gym?: { id: string; name: string };
  /* Datos de la membresía (si existe) */
  membership?: {
    id: string;
    status: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'INACTIVE';
    startDate: string;
    endDate: string;
  };
  /* Campos normalizados para facilitar el acceso en componentes */
  membershipStatus?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  membershipId?: string;
}

export async function getMyMembership(): Promise<MemberProfileResponse> {
  try {
    // Usar el endpoint que obtiene el perfil completo del miembro
    const response = await fetch(`${API_BASE_URL}/members/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('No autenticado');
      }
      if (response.status === 404) {
        // Si el usuario no existe en el servicio de gimnasio, devolvemos un objeto con hasGym: false
        // para que la UI pueda mostrar el formulario de unión
        console.log('Usuario no encontrado en el servicio de gimnasio');
        return { hasGym: false } as MemberProfileResponse;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: Error obteniendo información del miembro`);
    }
    
    const memberData = await response.json();
    console.log('Datos del miembro:', memberData);
    
    // Normalización de datos para compatibilidad con componentes existentes
    // Esto maneja tanto el caso de que el backend devuelva membership (singular) o memberships (array)
    let normalizedData = { ...memberData };
    
    // Caso 1: El backend devuelve membership (singular, formato nuevo)
    if (memberData.membership) {
      normalizedData = {
        ...memberData,
        membershipStatus: memberData.membership.status,
        membershipStartDate: memberData.membership.startDate,
        membershipEndDate: memberData.membership.endDate,
        membershipId: memberData.membership.id
      };
    }
    // Caso 2: El backend devuelve memberships (array, formato antiguo)
    else if (memberData.memberships && memberData.memberships.length > 0) {
      const activeMembership = memberData.memberships[0];
      normalizedData = {
        ...memberData,
        membership: activeMembership, // Añadimos el formato singular para compatibilidad futura
        membershipStatus: activeMembership.status,
        membershipStartDate: activeMembership.startDate,
        membershipEndDate: activeMembership.endDate,
        membershipId: activeMembership.id
      };
    } 
    // Caso 3: No hay membresía
    else {
      normalizedData.membershipStatus = 'INACTIVE';
    }
    
    return normalizedData;
    
  } catch (error) {
    console.error('Error en getMyMembership:', error);
    // Propagamos el error para que la UI pueda manejarlo
    throw error;
  }
}

export async function updateMemberProfile(profileData: {
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/members/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error actualizando perfil');
    }

    const updatedProfile = await response.json();
    console.log('Perfil actualizado:', updatedProfile);
    return updatedProfile;
    
  } catch (error) {
    console.error('Error en updateMemberProfile:', error);
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error enviando correo de recuperación');
    }

    const result = await response.json();
    console.log('Correo de recuperación enviado:', result);
    return result;
    
  } catch (error) {
    console.error('Error en requestPasswordReset:', error);
    throw error;
  }
}

export async function listPublicGyms() {
  const response = await fetch(`${API_BASE_URL}/public/gyms`, { credentials: 'include' });
  if (!response.ok) throw new Error('Error al obtener gimnasios');
  return response.json();
}

export async function joinGym(gymCode: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/members/join-gym`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ gymCode })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: No se pudo unir al gimnasio`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en joinGym:', error);
    throw error;
  }
}
