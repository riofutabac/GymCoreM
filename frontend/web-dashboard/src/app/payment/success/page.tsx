'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const token = searchParams.get('token');
  const payerId = searchParams.get('PayerID');

  useEffect(() => {
    // Simular procesamiento del pago
    const timer = setTimeout(() => {
      setPaymentDetails({
        token,
        payerId,
        status: 'completed'
      });
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [token, payerId]);

  const handleContinue = () => {
    // Redirigir al dashboard según el rol del usuario
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-sm text-gray-600">Procesando tu pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            ¡Pago Exitoso!
          </CardTitle>
          <CardDescription>
            Tu pago ha sido procesado correctamente
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {paymentDetails && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID de Transacción:</span> {paymentDetails.token}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Estado:</span> Completado
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Tu membresía ha sido activada exitosamente. Recibirás una confirmación por email.
            </p>
          </div>
          
          <Button 
            onClick={handleContinue}
            className="w-full"
          >
            Continuar al Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-sm text-gray-600">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}