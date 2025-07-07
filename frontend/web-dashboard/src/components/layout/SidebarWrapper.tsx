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

  return (
    <Sidebar
      userRole={(user.role as "owner" | "manager" | "receptionist" | "member") || 'member'}
      userName={user.name || user.email?.split('@')[0] || 'Usuario'}
      userEmail={user.email || ''}
    />
  );
}
