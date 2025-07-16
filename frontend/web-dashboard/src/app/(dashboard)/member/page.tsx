"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Activity, CreditCard, Clock, Loader2, User, BarChart3 } from "lucide-react";
import { JoinGym } from "@/components/member/JoinGym";
import { getMemberProfile, getMembershipStatus } from "@/lib/api/member";
import { MemberProfile, MembershipStatus } from "@/lib/api/types";

export default function MemberDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<MemberProfile | null>(null);
  const [membershipData, setMembershipData] = useState<MembershipStatus | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memberProfile, membershipStatus] = await Promise.all([
          getMemberProfile().catch(() => null),
          getMembershipStatus().catch(() => null)
        ]);
        
        setMemberData(memberProfile);
        setMembershipData(membershipStatus);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // If loading, show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando información...</p>
        </div>
      </div>
    );
  }
  
  // If no gym assigned, show join gym component
  if (!memberData?.gymId) {
    return <JoinGym />;
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Portal de Miembro</h1>
        <p className="text-muted-foreground">
          Bienvenido a tu espacio personal
        </p>
      </div>

      {/* Member Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas este Mes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberData?.visits?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {memberData?.visits?.change > 0 ? `+${memberData?.visits?.change}` : memberData?.visits?.change || '0'} vs mes anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Membresía</CardTitle>
            <Badge 
              variant={membershipData?.status === 'ACTIVE' ? 'default' : 'destructive'} 
              className="text-xs"
            >
              {membershipData?.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${membershipData?.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
              {membershipData?.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
            </div>
            <p className="text-xs text-muted-foreground">
              {membershipData?.status === 'ACTIVE' ? `Vence: ${new Date(membershipData?.expiresAt).toLocaleDateString()}` : 'Membresía vencida'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Pago</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{membershipData?.nextPayment?.amount || '€0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {membershipData?.nextPayment?.date ? new Date(membershipData?.nextPayment?.date).toLocaleDateString() : 'No programado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Services */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Servicios</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-muted/50">
            <CardContent className="p-0">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-4"
                onClick={() => router.push('/member/profile')}
              >
                <div className="text-left">
                  <div className="font-medium">Actualizar Datos</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Modifica tu información personal
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-0">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-4"
                onClick={() => router.push('/member/visits')}
              >
                <div className="text-left">
                  <div className="font-medium">Historial de Visitas</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Ver tus entradas al gimnasio
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-0">
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto p-4"
                onClick={() => router.push('/member/payments')}
              >
                <div className="text-left">
                  <div className="font-medium">Historial de Pagos</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Ver facturas y recibos
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-0">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-4"
                onClick={() => router.push('/member/classes')}
              >
                <div className="text-left">
                  <div className="font-medium">Reservar Clases</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Inscríbete a clases grupales
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Info */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Horarios del Gimnasio</AlertTitle>
        <AlertDescription>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
            <div>
              <div className="font-medium">Lun - Vie</div>
              <div className="text-muted-foreground">6:00 - 23:00</div>
            </div>
            <div>
              <div className="font-medium">Sábado</div>
              <div className="text-muted-foreground">8:00 - 22:00</div>
            </div>
            <div>
              <div className="font-medium">Domingo</div>
              <div className="text-muted-foreground">9:00 - 20:00</div>
            </div>
            <div>
              <div className="font-medium">Ocupación Actual</div>
              <div className="text-muted-foreground">Moderada (65%)</div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
      

    </div>
  );
}