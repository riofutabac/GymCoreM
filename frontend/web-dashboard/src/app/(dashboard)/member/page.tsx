'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, CreditCard, User, Settings } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getMyMembership } from '@/lib/api/member';
import JoinGymForm from '@/components/member/JoinGymForm';
import MembershipStatus from '@/components/member/MembershipStatus';
import ProfileEditForm from '@/components/member/ProfileEditForm';
import PasswordResetForm from '@/components/member/PasswordResetForm';

export default function MemberDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [membership, setMembership] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading) {
      fetchMembership();
    }
  }, [isAuthLoading]);

  const fetchMembership = async () => {
    setIsLoading(true);
    try {
      const data = await getMyMembership();
      // Datos de membresía obtenidos correctamente
      
      // La función getMyMembership ya normaliza los datos
      // No necesitamos procesamiento adicional aquí
      setMembership(data);
    } catch (error) {
      console.error('Error crítico al obtener membresía:', error);
      setError('Error inesperado al cargar tu información. Por favor, intenta nuevamente.');
      setMembership({ hasGym: false }); // Default state on critical failure
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-[250px] mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => {
          setError('');
          fetchMembership();
        }}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!membership || !membership.hasGym) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Únete a un Gimnasio</h1>
          <p className="text-muted-foreground">
            Para acceder a todas las funcionalidades, primero debes unirte a un gimnasio.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Ingresa el código de invitación</CardTitle>
            <CardDescription>
              Solicita el código único al personal del gimnasio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinGymForm onSuccess={fetchMembership} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Remove Tabs, show dashboard content directly
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Portal de Miembro</h1>
        <p className="text-muted-foreground">
          {membership?.gym?.name ? `Bienvenido a ${membership.gym.name}` : 'Bienvenido a tu espacio personal'}
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
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">
              +3 vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Membresía</CardTitle>
            {/* Usamos los campos procesados para mayor claridad */}
            <Badge 
              variant={membership?.membershipStatus === 'ACTIVE' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {membership?.membershipStatus === 'ACTIVE' ? 'Activa' : 
                membership?.membershipStatus === 'PENDING_PAYMENT' ? 'Pendiente' : 
                membership?.membershipStatus === 'EXPIRED' ? 'Expirada' : 'Inactiva'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div 
              className={`text-xl font-bold ${membership?.membershipStatus === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}
            >
              {membership?.membershipStatus === 'ACTIVE' ? 'Activa' : 
                membership?.membershipStatus === 'PENDING_PAYMENT' ? 'Pendiente de pago' : 
                membership?.membershipStatus === 'EXPIRED' ? 'Expirada' : 'Inactiva'}
            </div>
            {membership?.membershipEndDate && (
              <p className="text-xs text-muted-foreground">
                Vence: {new Date(membership.membershipEndDate).toLocaleDateString('es-ES')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones Rápidas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            {membership?.membershipStatus === 'PENDING_PAYMENT' ? (
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/api/v1/payments/create-checkout-session?membershipId=${membership.membershipId}`)}
              >
                Completar Pago
              </Button>
            ) : membership?.membershipStatus === 'EXPIRED' ? (
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => router.push('/api/v1/payments/create-checkout-session')}
              >
                Renovar Membresía
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                asChild
              >
                <Link href="/member/visits">Ver mis visitas</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Links */}
      <Card>
        <CardHeader>
          <CardTitle>Acceso Rápido</CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones principales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center" asChild>
              <Link href="/member/profile">
                <User className="h-6 w-6 mb-2" />
                <span>Perfil</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center" asChild>
              <Link href="/member/membership">
                <CreditCard className="h-6 w-6 mb-2" />
                <span>Membresía</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center" asChild>
              <Link href="/member/settings">
                <Settings className="h-6 w-6 mb-2" />
                <span>Configuración</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
