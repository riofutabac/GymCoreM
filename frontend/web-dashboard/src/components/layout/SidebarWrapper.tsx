// src/components/layout/SidebarWrapper.tsx
"use client";

import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';

export function SidebarWrapper() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <aside className="w-64 h-screen border-r bg-sidebar flex flex-col">
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </aside>
    );
  }

  if (!user) {
    return (
      <aside className="w-64 h-screen border-r bg-sidebar flex flex-col">
        <div className="p-4 text-center text-sidebar-foreground">
          <p>No autenticado</p>
        </div>
      </aside>
    );
  }

  // Asegurar que el rol esté correctamente normalizado
  const normalizeRole = (role: string): "owner" | "manager" | "receptionist" | "member" => {
    const roleMap: Record<string, "owner" | "manager" | "receptionist" | "member"> = {
      'OWNER': 'owner',
      'owner': 'owner',
      'MANAGER': 'manager', 
      'manager': 'manager',
      'RECEPTIONIST': 'receptionist',
      'receptionist': 'receptionist',
      'MEMBER': 'member',
      'member': 'member'
    };
    
    return roleMap[role] || 'member';
  };

  return (
    <Sidebar
      userRole={normalizeRole(user.role)}
      userName={user.name || user.email?.split('@')[0] || 'Usuario'}
      userEmail={user.email || ''}
    />
  );
}
