'use client';

import { redirect } from 'next/navigation';

export default function OwnerSettingsPage() {
  // Redirigir a la nueva ruta unificada de perfil
  redirect('/profile');
}
