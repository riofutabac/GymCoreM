"use client";

import { useOwnerData } from '@/hooks/useOwnerData';
import { ownerApi } from '@/lib/api/owner';
import { AnalyticsCharts } from "@/components/owner";
import { LoadingSkeleton } from '@/components/owner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AnalyticsPage() {
  const { data: kpis, isLoading: isLoadingKpis, error: errorKpis } = useOwnerData(ownerApi.getKpis);
  const { data: trends, isLoading: isLoadingTrends, error: errorTrends } = useOwnerData(ownerApi.getGlobalTrends);

  const isLoading = isLoadingKpis || isLoadingTrends;
  const error = errorKpis || errorTrends;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de Carga</AlertTitle>
            <AlertDescription>
                No se pudieron cargar los datos de analíticas. Por favor, intenta de nuevo más tarde.
                <p className="text-xs mt-2 font-mono">{error}</p>
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analíticas Globales</h1>
        <p className="text-muted-foreground">
          Visualiza el rendimiento y crecimiento de toda la plataforma.
        </p>
      </div>
      
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
        isLoading={isLoading}
      />
    </div>
  );
}
