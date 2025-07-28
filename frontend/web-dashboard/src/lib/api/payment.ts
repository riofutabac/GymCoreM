
import { API_V1_URL } from './config';

// El frontend está corriendo en el puerto 3030, pero el backend está en el puerto 3000

export async function createMembershipPayment(membershipId: string) {
  const response = await fetch(`${API_V1_URL()}/payments/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ membershipId: membershipId })
  });
  if (!response.ok) throw new Error('Error al crear pago');
  return response.json();
}
