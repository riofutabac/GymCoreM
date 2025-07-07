import { ReactNode } from 'react';
import { SidebarWrapper } from '@/components/layout/SidebarWrapper';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar que obtiene automáticamente la información del usuario */}
      <SidebarWrapper />

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
