"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, Euro, AlertCircle } from "lucide-react";
import { useOwnerData } from '@/hooks/useOwnerData';
import { ownerApi } from '@/lib/api/owner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsCharts } from "@/components/owner";

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-1/2" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-80 w-full" />
        </div>
    );
}

export default function OwnerDashboardPage() {
  const { data: kpis, isLoading: isLoadingKpis, error: errorKpis } = useOwnerData(ownerApi.getKpis);
  const { data: trends, isLoading: isLoadingTrends, error: errorTrends } = useOwnerData(ownerApi.getGlobalTrends);

  if (isLoadingKpis || isLoadingTrends) {
    return <DashboardSkeleton />;
  }

  if (errorKpis || errorTrends) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de Carga</AlertTitle>
            <AlertDescription>
                No se pudieron cargar los datos del dashboard. Por favor, intenta de nuevo más tarde.
                <p className="text-xs mt-2 font-mono">{errorKpis || errorTrends}</p>
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Global</h1>
        <p className="text-muted-foreground">Una vista general de toda la plataforma GymCore.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gimnasios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalGyms || 0}</div>
            <p className="text-xs text-muted-foreground">Sucursales activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalUsers || 0}</div>
             <p className="text-xs text-muted-foreground">+{kpis?.newMembershipsToday || 0} hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Mes)</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(kpis?.totalRevenue || '0').toLocaleString('es-EC')}</div>
            <p className="text-xs text-muted-foreground">Ingresos consolidados</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tendencias del Negocio</CardTitle>
            <CardDescription>Crecimiento de usuarios e ingresos en los últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsCharts 
              data={{
                monthlyRevenue: trends?.monthlyRevenue || [],
                membershipStats: trends?.membershipDistribution || [],
                gymPerformance: trends?.gymPerformance || [],
                dailyCheckIns: trends?.dailyCheckIns || [],
                totalMembers: kpis?.totalUsers || 0,
                totalRevenue: parseFloat(kpis?.totalRevenue || '0'),
                totalGyms: kpis?.totalGyms || 0,
                monthlyGrowth: trends?.monthlyGrowth || 0,
              }}
              isLoading={isLoadingTrends}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
