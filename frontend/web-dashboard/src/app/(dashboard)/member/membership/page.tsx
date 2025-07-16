'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getMyMembership } from '@/lib/api/member';
import MembershipStatus from '@/components/member/MembershipStatus';
import { CalendarIcon, Clock, CreditCard } from 'lucide-react';

export default function MembershipPage() {
  const [membership, setMembership] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembership = async () => {
      try {
        setIsLoading(true);
        const data = await getMyMembership();
        setMembership(data);
        setError(null);
      } catch (err) {
        setError('Error al cargar la información de membresía');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembership();
  }, []);

  // Formatear fechas
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcular días restantes
  const calculateRemainingDays = (endDate: string) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Membresía</h1>
        <p className="text-muted-foreground">
          Gestiona tu membresía y revisa su estado actual
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {/* Estado de Membresía */}
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

          {/* Detalles de Membresía */}
          {membership?.status === 'ACTIVE' && (
            <Card>
              <CardHeader>
                <CardTitle>Detalles de Membresía</CardTitle>
                <CardDescription>
                  Información completa sobre tu plan actual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tipo de Plan</p>
                    <p className="font-medium">{membership.plan?.name || 'Plan Estándar'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Gimnasio</p>
                    <p className="font-medium">{membership.gym?.name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                    <p className="font-medium flex items-center">
                      <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                      {formatDate(membership.startDate)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                    <p className="font-medium flex items-center">
                      <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                      {formatDate(membership.endDate)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Días Restantes</p>
                    <p className="font-medium flex items-center">
                      <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                      {calculateRemainingDays(membership.endDate)} días
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Método de Pago</p>
                    <p className="font-medium flex items-center">
                      <CreditCard className="mr-1 h-4 w-4 text-muted-foreground" />
                      {membership.paymentMethod || 'PayPal'}
                    </p>
                  </div>
                </div>

                {/* Beneficios */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Beneficios Incluidos</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Acceso ilimitado al gimnasio en horario regular</li>
                    <li>Uso de todas las instalaciones básicas</li>
                    <li>Acceso a vestuarios y duchas</li>
                    <li>Asesoramiento inicial con entrenador</li>
                    {membership.plan?.features?.map((feature: string, index: number) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
