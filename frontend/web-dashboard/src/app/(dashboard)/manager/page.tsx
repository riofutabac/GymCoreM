'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, UserPlus, Calendar, ArrowRight, FileText, Package, ShoppingCart, UserCheck } from 'lucide-react';
import { getManagerDashboardKpis, exportSales } from '@/lib/api/manager';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface KpiData {
  activeMembers: number;
  newMembersLast30Days: number;
  membershipsExpiringNext7Days: number;
  cashRevenueThisMonth: number;
  lastUpdatedAt: string;
}

export default function ManagerDashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getManagerDashboardKpis()
      .then(setKpis)
      .catch((err) => {
        console.error(err);
        setError("No se pudieron cargar los datos del dashboard. Inténtalo de nuevo más tarde.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportSales = async () => {
    try {
      const blob = await exportSales();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ventas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando ventas:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={`kpi-skeleton-${Date.now()}-${i}`}>
              <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-1/2" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={`shortcut-skeleton-${Date.now()}-${i}`}>
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Centro de Control</h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {kpis?.lastUpdatedAt ? new Date(kpis.lastUpdatedAt).toLocaleString() : 'N/A'}
        </p>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.activeMembers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total de membresías activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Miembros</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.newMembersLast30Days ?? 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.membershipsExpiringNext7Days ?? 0}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 días</p>
          </CardContent>
        </Card> 

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis?.cashRevenueThisMonth ?? 0}</div>
            <p className="text-xs text-muted-foreground">Efectivo este mes (Membresías + POS)</p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Directos */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/manager/members')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Gestionar Miembros</CardTitle>
              <UserCheck className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Ver, editar y activar membresías</p>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                Ir a Miembros <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/manager/staff')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Gestionar Personal</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Asignar y revocar roles del personal</p>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                Ir a Personal <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/manager/inventory')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Inventario</CardTitle>
              <Package className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Administrar productos y stock</p>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                Ir a Inventario <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/pos')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Punto de Venta</CardTitle>
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Realizar ventas y transacciones</p>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                Ir al POS <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sección de Reportes */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Reportes</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exportar Datos</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={handleExportSales} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Exportar Ventas
            </Button>
            <Button onClick={() => router.push('/manager/members')} variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Ver Miembros
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}