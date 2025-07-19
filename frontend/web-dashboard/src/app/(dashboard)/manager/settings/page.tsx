'use client';

import { redirect } from 'next/navigation';

export default function ManagerSettingsPage() {
  // Redirigir a la nueva ruta unificada de perfil
  redirect('/profile');
}
