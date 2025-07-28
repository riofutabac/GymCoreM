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
        {/* Header responsive */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
          {/* Espacio para el botón hamburger en mobile */}
          <div className="flex items-center gap-4 md:gap-0">
            {/* En mobile, dejamos espacio para el botón hamburger que está fijo */}
            <div className="w-8 md:w-0"></div>
            <div className="flex-1">
              <h1 className="text-base md:text-lg font-semibold text-foreground">GymCore Dashboard</h1>
            </div>
          </div>
        </header>

        {/* Área de contenido principal - scrollable y responsive */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
