'use client';

import { redirect } from 'next/navigation';

export default function MemberProfilePage() {
  // Redirigir a la nueva ruta unificada de perfil
  redirect('/profile');
}
