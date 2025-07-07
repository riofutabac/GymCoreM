// src/components/layout/Sidebar.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Home, 
  Users, 
  Settings, 
  Building2, 
  UserCheck, 
  CreditCard,
  BarChart3,
  Calendar,
  Bell,
  LogOut,
  ShoppingCart,
  Package
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logoutUser } from "@/lib/api/auth";

// Definir tipos para los elementos del menú
interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

// Configuración de menús por rol
const roleMenus: Record<string, MenuSection[]> = {
  owner: [
    {
      title: "General",
      items: [
        { href: '/owner', label: 'Dashboard', icon: Home },
        { href: '/owner/gyms', label: 'Gimnasios', icon: Building2 },
        { href: '/owner/analytics', label: 'Análisis', icon: BarChart3 },
      ]
    },
    {
      title: "Gestión",
      items: [
        { href: '/owner/staff', label: 'Personal', icon: Users },
        { href: '/owner/inventory', label: 'Inventario', icon: Package },
        { href: '/owner/finances', label: 'Finanzas', icon: CreditCard },
        { href: '/owner/settings', label: 'Configuración', icon: Settings },
      ]
    }
  ],
  manager: [
    {
      title: "Operaciones",
      items: [
        { href: '/manager', label: 'Dashboard', icon: Home },
        { href: '/manager/members', label: 'Miembros', icon: Users, badge: '287' },
        { href: '/manager/staff', label: 'Personal', icon: UserCheck },
        { href: '/manager/schedule', label: 'Horarios', icon: Calendar },
        { href: '/manager/inventory', label: 'Inventario', icon: Package },
      ]
    },
    {
      title: "Herramientas",
      items: [
        { href: '/manager/reports', label: 'Reportes', icon: BarChart3 },
        { href: '/manager/notifications', label: 'Notificaciones', icon: Bell },
        { href: '/manager/settings', label: 'Configuración', icon: Settings },
      ]
    }
  ],
  receptionist: [
    {
      title: "Atención al Cliente",
      items: [
        { href: '/receptionist', label: 'Dashboard', icon: Home },
        { href: '/receptionist/checkin', label: 'Check-in', icon: UserCheck },
        { href: '/receptionist/members', label: 'Miembros', icon: Users },
        { href: '/receptionist/payments', label: 'Pagos', icon: CreditCard, badge: '15' },
      ]
    },
    {
      title: "Herramientas",
      items: [
        { href: '/receptionist/visitors', label: 'Visitantes', icon: Users },
        { href: '/receptionist/reports', label: 'Reportes', icon: BarChart3 },
      ]
    }
  ],
  member: [
    {
      title: "Mi Cuenta",
      items: [
        { href: '/member', label: 'Dashboard', icon: Home },
        { href: '/member/profile', label: 'Mi Perfil', icon: Users },
        { href: '/member/membership', label: 'Membresía', icon: CreditCard },
        { href: '/member/classes', label: 'Clases', icon: Calendar },
      ]
    },
    {
      title: "Servicios",
      items: [
        { href: '/member/history', label: 'Historial', icon: BarChart3 },
        { href: '/member/notifications', label: 'Notificaciones', icon: Bell },
      ]
    }
  ]
};

interface SidebarProps {
  userRole?: 'owner' | 'manager' | 'receptionist' | 'member';
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export function Sidebar({ 
  userRole = 'owner', 
  userName = "Usuario", 
  userAvatar 
}: SidebarProps) {
  const pathname = usePathname();
  const menuSections = roleMenus[userRole] || roleMenus.owner;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      // Redirigir al login después del logout exitoso
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Incluso si hay error, redirigir al login
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-64 h-screen border-r bg-sidebar flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">GC</span>
          </div>
          <span className="font-semibold text-lg text-sidebar-foreground">GymCore</span>
        </div>

        {/* User Info Card */}
        <Card className="bg-sidebar-accent/50 border-sidebar-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="text-xs">
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {section.title && (
              <h3 className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={`
                      w-full justify-start gap-3 h-9 px-3
                      ${isActive 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }
                    `}
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className="ml-auto h-5 px-1.5 text-xs bg-sidebar-primary/10 text-sidebar-primary border-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                );
              })}
            </div>
            {sectionIndex < menuSections.length - 1 && (
              <Separator className="mt-4 bg-sidebar-border" />
            )}
          </div>
        ))}
        
        {/* POS Section - Only for managers and receptionists */}
        {(userRole === 'manager' || userRole === 'receptionist') && (
          <div className="mb-6">
            <Separator className="mb-4 bg-sidebar-border" />
            <h3 className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2 px-2">
              Punto de Venta
            </h3>
            <div className="space-y-1">
              <Button
                variant={pathname === '/pos' ? "secondary" : "ghost"}
                className={`
                  w-full justify-start gap-3 h-9 px-3
                  ${pathname === '/pos'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                `}
                asChild
              >
                <Link href="/pos">
                  <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">POS</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-9 px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4" />
          <span>{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
        </Button>
      </div>
    </aside>
  );
}