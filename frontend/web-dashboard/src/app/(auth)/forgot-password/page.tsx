// frontend/web-dashboard/src/app/(auth)/forgot-password/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { forgotPassword } from '@/actions/auth.actions'; // Usaremos una Server Action

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    const result = await forgotPassword(email);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Restablecer Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu cuenta.
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || !!success}
                required
              />
            </div>
            
            <Button
              type="submit"
              disabled={isLoading || !email || !!success}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Enlace de Recuperación'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button variant="link" onClick={() => router.push('/login')}>
                Volver a Iniciar Sesión
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}