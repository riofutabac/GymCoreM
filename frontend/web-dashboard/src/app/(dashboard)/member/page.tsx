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
import { Activity, CreditCard, User } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getMyMembership } from '@/lib/api/member';
import { createMembershipPayment } from '@/lib/api/payment';
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
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <Skeleton className="h-6 md:h-8 w-[200px] md:w-[250px] mb-4 md:mb-6" />
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[100px] md:h-[120px] w-full" />
          <Skeleton className="h-[100px] md:h-[120px] w-full" />
          <Skeleton className="h-[100px] md:h-[120px] w-full" />
        </div>
        <Skeleton className="h-[180px] md:h-[200px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => {
            setError('');
            fetchMembership();
          }}
          className="w-full sm:w-auto"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!membership || !membership.hasGym) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Únete a un Gimnasio</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Para acceder a todas las funcionalidades, primero debes unirte a un gimnasio.
          </p>
        </div>
        
        <Card>
          <CardHeader className="text-center md:text-left">
            <CardTitle className="text-lg md:text-xl">Ingresa el código de invitación</CardTitle>
            <CardDescription className="text-sm md:text-base">
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
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Portal de Miembro</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {membership?.gym?.name ? `Bienvenido a ${membership.gym.name}` : 'Bienvenido a tu espacio personal'}
        </p>
      </div>

      {/* Member Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Visitas este Mes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">
              +3 vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Estado de Membresía</CardTitle>
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
              className={`text-lg md:text-xl font-bold ${membership?.membershipStatus === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}
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

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Acciones Rápidas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            {membership?.membershipStatus === 'PENDING_PAYMENT' ? (
              <Button 
                size="sm" 
                className="w-full text-xs md:text-sm"
                onClick={async () => {
                  // 1) Abrimos la ventana en el click para evitar bloqueo de popup
                  const paymentWindow = window.open('', '_blank');
                  try {
                    // 2) Generamos la sesión de pago
                    const response = await createMembershipPayment(membership.membershipId);
                    if (response.url) {
                      // 3) Redirigimos la ventana recién abierta
                      paymentWindow!.location.href = response.url;
                    } else {
                      paymentWindow?.close();
                      alert('Error: URL de pago no disponible');
                    }
                  } catch (error) {
                    paymentWindow?.close();
                    console.error('Error al crear sesión de pago:', error);
                    alert('Error al procesar el pago. Por favor intenta nuevamente.');
                  }
                }}
              >
                Completar Pago
              </Button>
            ) : membership?.membershipStatus === 'EXPIRED' ? (
              <Button 
                size="sm" 
                className="w-full text-xs md:text-sm"
                onClick={async () => {
                  // 1) Abrimos la ventana en el click para evitar bloqueo de popup
                  const paymentWindow = window.open('', '_blank');
                  try {
                    // 2) Generamos la sesión de pago
                    const response = await createMembershipPayment(membership.membershipId);
                    if (response.url) {
                      // 3) Redirigimos la ventana recién abierta
                      paymentWindow!.location.href = response.url;
                    } else {
                      paymentWindow?.close();
                      alert('Error: URL de pago no disponible');
                    }
                  } catch (error) {
                    paymentWindow?.close();
                    console.error('Error al crear sesión de pago:', error);
                    alert('Error al procesar la renovación. Por favor intenta nuevamente.');
                  }
                }}
              >
                Renovar Membresía
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs md:text-sm"
                asChild
              >
                <Link href="/member/membership">Ver membresía</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Links */}
      <Card>
        <CardHeader className="text-center md:text-left">
          <CardTitle className="text-lg md:text-xl">Acceso Rápido</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Accede rápidamente a las funciones principales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Button variant="outline" className="h-20 md:h-24 flex flex-col items-center justify-center hover:shadow-md transition-shadow" asChild>
              <Link href="/member/profile">
                <User className="h-5 w-5 md:h-6 md:w-6 mb-2" />
                <span className="text-sm md:text-base">Perfil</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 md:h-24 flex flex-col items-center justify-center hover:shadow-md transition-shadow" asChild>
              <Link href="/member/membership">
                <CreditCard className="h-5 w-5 md:h-6 md:w-6 mb-2" />
                <span className="text-sm md:text-base">Membresía</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
