
// El frontend está corriendo en el puerto 3030, pero el backend está en el puerto 3000
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_GATEWAY_URL}/api/v1`;

export async function createMembershipPayment(membershipId: string) {
  const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ membershipId: membershipId })
  });
  if (!response.ok) throw new Error('Error al crear pago');
  return response.json();
}
