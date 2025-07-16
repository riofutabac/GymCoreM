

export async function createMembershipPayment(membershipId: string) {
  const response = await fetch('/api/v1/payments/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ membershipId: membershipId })
  });
  if (!response.ok) throw new Error('Error al crear pago');
  return response.json();
}
