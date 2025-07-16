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
import { Activity, CreditCard, Clock, User, Calendar, Settings, BarChart } from "lucide-react";
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
    try {
      // getMyMembership ahora maneja internamente los errores y devuelve { hasGym: false } en caso de problemas
      const data = await getMyMembership();
      console.log('Membership data:', data); // Para depuración
      setMembership(data);
    } catch (error) {
      console.error('Error crítico al obtener membresía:', error);
      // Solo establecemos error en caso de fallo crítico que no pudo ser manejado por getMyMembership
      setError('Error inesperado al cargar tu información. Por favor, intenta nuevamente.');
      setMembership({ hasGym: false }); // Estado por defecto
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
      </div>
    );
  }

  // Si hay un error específico, mostrarlo
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

  // Si el usuario no está asociado a ningún gimnasio, mostrar formulario de unión
  if (!membership || !membership.hasGym) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Únete a un Gimnasio</h1>
          <p className="text-muted-foreground">
            Para acceder a todas las funcionalidades, primero debes unirte a un gimnasio
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Ingresa el código de invitación</CardTitle>
            <CardDescription>
              Solicita el código único al personal del gimnasio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinGymForm onSuccess={fetchMembership} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Portal de Miembro</h1>
        <p className="text-muted-foreground">
          {membership?.gym?.name ? `Bienvenido a ${membership.gym.name}` : 'Bienvenido a tu espacio personal'}
        </p>
      </div>

      {/* Tabs para organizar el contenido */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="membership">Membresía</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>
        
        {/* Tab: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
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
                <Badge variant={membership?.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                  {membership?.status === 'ACTIVE' ? 'Activa' : 
                   membership?.status === 'PENDING_PAYMENT' ? 'Pendiente' : 
                   membership?.status === 'EXPIRED' ? 'Expirada' : 'Inactiva'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${membership?.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}>
                  {membership?.status === 'ACTIVE' ? 'Activa' : 
                   membership?.status === 'PENDING_PAYMENT' ? 'Pendiente de pago' : 
                   membership?.status === 'EXPIRED' ? 'Expirada' : 'Inactiva'}
                </div>
                {membership?.endDate && (
                  <p className="text-xs text-muted-foreground">
                    Vence: {new Date(membership.endDate).toLocaleDateString('es-ES')}
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
                {membership?.status === 'PENDING_PAYMENT' ? (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => router.push(`/api/v1/payments/create-checkout-session?membershipId=${membership.membershipId}`)}
                  >
                    Completar Pago
                  </Button>
                ) : membership?.status === 'EXPIRED' ? (
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

          {/* Member Services */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mi Información</CardTitle>
                <CardDescription>
                  Gestiona tus datos personales y configuraciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  asChild
                >
                  <Link href="/member/profile">
                    <div className="text-left">
                      <div className="font-medium">Actualizar Datos Personales</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Email, teléfono, dirección
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  asChild
                >
                  <Link href="/member/payments">
                    <div className="text-left">
                      <div className="font-medium">Historial de Pagos</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Ver facturas y recibos
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  asChild
                >
                  <Link href="/member/visits">
                    <div className="text-left">
                      <div className="font-medium">Historial de Visitas</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Check-ins anteriores
                      </div>
                    </div>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
                <CardDescription>
                  Accede a todas las funcionalidades disponibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start h-auto p-4"
                  asChild
                >
                  <Link href="/member/classes">
                    <div className="text-left">
                      <div className="font-medium">Reservar Clase</div>
                      <div className="text-sm text-primary-foreground/80 mt-1">
                        Yoga, Spinning, Zumba...
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  disabled={membership?.status !== 'ACTIVE'}
                >
                  <div className="text-left">
                    <div className="font-medium">Congelar Membresía</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Pausar temporalmente
                    </div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  disabled={membership?.status !== 'ACTIVE'}
                >
                  <div className="text-left">
                    <div className="font-medium">Invitar Amigo</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Pase de prueba gratuito
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
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
        </TabsContent>
        
        {/* Tab: Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mi Perfil</CardTitle>
              <CardDescription>
                Actualiza tu información personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileEditForm user={{
                firstName: user?.firstName || membership?.user?.firstName,
                lastName: user?.lastName || membership?.user?.lastName,
                email: user?.email || membership?.user?.email
              }} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Membresía */}
        <TabsContent value="membership" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Membresía</CardTitle>
              <CardDescription>
                Información detallada sobre tu membresía actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembershipStatus membership={membership} />
            </CardContent>
          </Card>
          
          {membership?.status === 'ACTIVE' && (
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Uso</CardTitle>
                <CardDescription>
                  Análisis de tu actividad en el gimnasio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Visitas este mes</p>
                    <p className="text-2xl font-bold">14</p>
                  </div>
                  <BarChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Promedio semanal</span>
                    <span className="font-medium">3.5 visitas</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Día más frecuente</span>
                    <span className="font-medium">Lunes</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Horario preferido</span>
                    <span className="font-medium">18:00 - 20:00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Tab: Configuración */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad de la Cuenta</CardTitle>
              <CardDescription>
                Gestiona la seguridad de tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordResetForm />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
              <CardDescription>
                Configura tus preferencias de notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Notificaciones por email</div>
                  <div className="text-sm text-muted-foreground">Recibe actualizaciones sobre tu membresía</div>
                </div>
                <Button variant="outline" size="sm">Configurar</Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Recordatorios de clases</div>
                  <div className="text-sm text-muted-foreground">Recibe alertas antes de tus clases reservadas</div>
                </div>
                <Button variant="outline" size="sm">Configurar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}