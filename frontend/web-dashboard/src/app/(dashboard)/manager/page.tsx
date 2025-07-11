'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Activity, AlertTriangle } from 'lucide-react'; // 👈 CAMBIO: Importa Activity en lugar de Package
import { getManagerDashboardKpis } from '@/lib/api/manager';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert'; // 👈 NUEVO: Importa el componente de Alerta

interface KpiData {
  activeMembers: number;
  occupancy: string;
  dailySales: number;
  lowStockItems: number;
}

export default function ManagerDashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 👈 NUEVO: Estado para manejar errores

  useEffect(() => {
    getManagerDashboardKpis()
      .then(setKpis)
      .catch((err) => {
        console.error(err);
        setError("No se pudieron cargar los datos del dashboard. Inténtalo de nuevo más tarde."); // 👈 NUEVO: Guarda el mensaje de error
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
        </div>
      </div>
    );
  }

  // 👇 NUEVO: Renderiza un mensaje de error si la API falla
  if (error) {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <CardTitle>Error de Conexión</CardTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard del Gimnasio</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Miembros Activos</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis?.activeMembers ?? 'N/A'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas del Día</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">${kpis?.dailySales?.toFixed(2) ?? '0.00'}</div></CardContent>
        </Card>
        <Card>
          {/* 👇 CAMBIO: Icono cambiado a Activity y texto mockeado eliminado */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis?.occupancy ?? 'N/A'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Items con Bajo Stock</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis?.lowStockItems ?? 'N/A'}</div></CardContent>
        </Card>
      </div>
    </div>
  );
}