'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentCancelledPage() {
  const router = useRouter();

  const handleRetry = () => {
    // Redirigir de vuelta a la página de membresías para intentar de nuevo
    router.push('/member/membership');
  };

  const handleGoBack = () => {
    // Regresar al dashboard
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Pago Cancelado
          </CardTitle>
          <CardDescription>
            El pago fue cancelado y no se procesó
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              No se realizó ningún cargo a tu cuenta. Puedes intentar realizar el pago nuevamente o elegir otro método de pago.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleRetry}
              className="w-full"
            >
              Intentar de Nuevo
            </Button>
            
            <Button 
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              Volver al Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}