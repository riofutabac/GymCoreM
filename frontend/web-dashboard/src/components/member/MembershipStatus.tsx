'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, CreditCard, AlertCircle } from 'lucide-react';

interface MembershipStatusProps {
  membership: any;
  onDataChange?: () => void;
}

export default function MembershipStatus({ membership, onDataChange }: MembershipStatusProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  
  // Función para iniciar el proceso de pago
  const handlePaymentClick = async () => {
    setIsLoading(true);
    try {
      // Simulamos la obtención de la URL de PayPal sandbox
      // En producción, esto debería ser una llamada a tu API
      setTimeout(() => {
        // URL de sandbox de PayPal (esto es un ejemplo, deberías obtenerla de tu backend)
        const sandboxUrl = 'https://www.sandbox.paypal.com/checkoutnow';
        setPaymentUrl(sandboxUrl);
        
        // Abrimos en una nueva ventana
        window.open(sandboxUrl, '_blank');
        setIsLoading(false);
        
        // Simulamos que el pago se completó después de 3 segundos
        setTimeout(() => {
          // Notificar al componente padre para actualizar los datos
          if (onDataChange) {
            onDataChange();
          }
        }, 3000);
      }, 1500);
    } catch (error) {
      console.error('Error al iniciar el pago:', error);
      setIsLoading(false);
    }
  };
  
  // Verificamos si el usuario tiene una membresía activa
  const hasMembership = membership?.status === 'ACTIVE' || membership?.status === 'PENDING_PAYMENT' || membership?.status === 'EXPIRED';
  
  if (!membership || !hasMembership) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tienes una membresía activa</h3>
          <p className="text-muted-foreground mb-4">
            Necesitas activar una membresía para acceder a todos los servicios del gimnasio
          </p>
          <Button 
            className="w-full"
            onClick={handlePaymentClick}
            disabled={isLoading}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isLoading ? 'Procesando...' : 'Activar membresía'}
          </Button>
          
          {paymentUrl && (
            <p className="text-sm text-muted-foreground mt-4">
              Si la página de pago no se abrió automáticamente, 
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                haz clic aquí
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Determinar el estado y color de la membresía
  let statusDisplay = '';
  let statusColor = '';
  
  switch (membership.status) {
    case 'ACTIVE':
      statusDisplay = 'Activa';
      statusColor = 'bg-green-100 text-green-800 hover:bg-green-200';
      break;
    case 'PENDING_PAYMENT':
      statusDisplay = 'Pendiente de pago';
      statusColor = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      break;
    case 'EXPIRED':
      statusDisplay = 'Expirada';
      statusColor = 'bg-red-100 text-red-800 hover:bg-red-200';
      break;
    case 'BANNED':
      statusDisplay = 'Suspendida';
      statusColor = 'bg-red-100 text-red-800 hover:bg-red-200';
      break;
    default:
      statusDisplay = membership.status;
      statusColor = 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }

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

  // Verificar si necesita renovación
  const needsRenewal = membership.status === 'EXPIRED' || 
    (membership.status === 'ACTIVE' && new Date(membership.endDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Badge className={statusColor}>{statusDisplay}</Badge>
        </div>
        {membership.status === 'PENDING_PAYMENT' && (
          <Button 
            size="sm"
            onClick={handlePaymentClick}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Completar pago'}
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Fecha de inicio</p>
          <p className="font-medium flex items-center">
            <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
            {formatDate(membership.startDate)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fecha de vencimiento</p>
          <p className="font-medium flex items-center">
            <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
            {formatDate(membership.endDate)}
          </p>
        </div>
      </div>
      
      {needsRenewal && (
        <Alert className="bg-amber-50 border-amber-200 mt-4">
          <AlertDescription className="text-amber-800">
            Tu membresía está por vencer o ha expirado. Renuévala para seguir disfrutando de todos los beneficios.
          </AlertDescription>
          <Button 
            className="w-full mt-2 bg-amber-600 hover:bg-amber-700"
            onClick={handlePaymentClick}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Renovar membresía'}
          </Button>
          
          {paymentUrl && (
            <p className="text-sm text-center mt-2">
              Si la página de pago no se abrió automáticamente, 
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                haz clic aquí
              </a>
            </p>
          )}
        </Alert>
      )}
      
      {membership.status === 'BANNED' && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Tu membresía ha sido suspendida. Por favor, contacta con el personal del gimnasio para más información.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
