'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Check if we have a signup token in the URL
      const hash = window.location.hash;
      
      if (hash && hash.includes('type=signup')) {
        try {
          setIsProcessing(true);
          
          // Extract the access token from the URL
          const accessToken = hash.split('&')[0].replace('#access_token=', '');
          
          if (!accessToken) {
            throw new Error('Token de confirmación no válido');
          }
          
          // Exchange the signup token for a session
          const { error } = await supabase.auth.exchangeCodeForSession(accessToken);
          
          if (error) {
            throw new Error(`Error al procesar el token: ${error.message}`);
          }
          
          setSuccess('¡Tu correo electrónico ha sido verificado exitosamente!');
          setIsProcessing(false);
          
          // Redirigir al dashboard después de 3 segundos
          setTimeout(() => {
            router.push('/member');
          }, 3000);
        } catch (err: any) {
          setError(err.message || 'Error al confirmar el correo electrónico');
          setIsProcessing(false);
        }
      } else {
        setError('No se encontró un token de confirmación válido en la URL');
        setIsProcessing(false);
      }
    };

    handleEmailConfirmation();
  }, [router, supabase.auth]);

  if (isProcessing) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Verificando tu correo electrónico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirmación de correo electrónico</CardTitle>
          <CardDescription>
            Verificación de tu cuenta de GymCore
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center py-4">
            {success ? (
              <>
                <div className="text-5xl mb-4">✅</div>
                <p className="text-lg">Tu cuenta ha sido verificada exitosamente.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Serás redirigido al dashboard en unos segundos...
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">❌</div>
                <p className="text-lg">No se pudo verificar tu cuenta.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Por favor, contacta a soporte o intenta nuevamente.
                </p>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => router.push(success ? '/member' : '/login')}
            className="w-full"
          >
            {success ? 'Ir al dashboard' : 'Volver al inicio de sesión'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
