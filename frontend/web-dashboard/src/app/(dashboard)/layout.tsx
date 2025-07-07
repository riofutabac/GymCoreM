import { ReactNode } from 'react';
import { cookies } from 'next/headers'; // Importamos cookies de Next.js
import { Sidebar } from '@/components/layout/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // 1. Leemos la cookie del rol en el servidor
  const cookieStore = await cookies();
  
  // 🔒 MEJORA 4: Validación defensiva del rol
  const roleFromCookie = cookieStore.get('user_role')?.value;
  const validRoles = ['owner', 'manager', 'receptionist', 'member'] as const;
  const userRole = validRoles.includes(roleFromCookie as typeof validRoles[number]) 
    ? (roleFromCookie as typeof validRoles[number]) 
    : 'member'; // Fallback seguro

  // 2. Leemos los datos reales del usuario desde las cookies
  const userName = cookieStore.get('user_name')?.value || "Usuario";
  const userEmail = cookieStore.get('user_email')?.value || "Sin email";

  return (
    <div className="flex h-screen w-full bg-background">
      {/* 3. Pasamos el rol y datos del usuario como props al Sidebar */}
      <Sidebar 
        userRole={userRole} // Ahora siempre será un rol válido
        userName={userName} 
        userEmail={userEmail} 
      />

      {/* Contenido Principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header opcional */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">GymCore Dashboard</h1>
          </div>
        </header>

        {/* Área de contenido principal - scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
