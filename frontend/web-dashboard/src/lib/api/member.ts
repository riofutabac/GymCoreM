const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_GATEWAY_URL}/api/v1`;

export async function getMemberDashboard() {
  const response = await fetch(`${API_BASE_URL}/member/dashboard`, { credentials: 'include' });
  if (!response.ok) throw new Error('Error al obtener dashboard');
  return response.json();
}

export async function getMyMembership() {
  try {
    // Primero obtenemos el usuario actual para verificar si tiene un gimnasio asignado
    const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        throw new Error('No autenticado');
      }
      const errorData = await userResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error obteniendo información del usuario');
    }
    
    const userData = await userResponse.json();
    console.log('Datos del usuario:', userData);
    
    // Si el usuario tiene un gymId asignado, significa que ya pertenece a un gimnasio
    if (userData.gymId) {
      // Ahora obtenemos la información específica de la membresía
      const membershipResponse = await fetch(`${API_BASE_URL}/members/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!membershipResponse.ok) {
        // Incluso si hay un error, sabemos que el usuario tiene un gimnasio asignado
        console.warn('Error al obtener detalles de membresía, pero el usuario tiene un gimnasio asignado');
        return { 
          hasGym: true, 
          gymId: userData.gymId,
          // Añadimos información básica del usuario
          userId: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email
        };
      }
      
      const membershipData = await membershipResponse.json();
      return { ...membershipData, hasGym: true };
    } else {
      // El usuario no tiene un gimnasio asignado
      console.info('Usuario sin gimnasio asignado');
      return { hasGym: false, message: 'Usuario sin gimnasio asignado' };
    }
  } catch (error) {
    console.error('Error en getMyMembership:', error);
    // Solo en caso de error crítico devolvemos hasGym: false
    return { hasGym: false };
  }
}

export async function listPublicGyms() {
  const response = await fetch(`${API_BASE_URL}/public/gyms`, { credentials: 'include' });
  if (!response.ok) throw new Error('Error al obtener gimnasios');
  return response.json();
}

export async function joinGym(uniqueCode: string) {
  const response = await fetch(`${API_BASE_URL}/gyms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ uniqueCode: uniqueCode })
  });
  if (!response.ok) throw new Error('Error al unirse al gimnasio');
  return response.json();
}
