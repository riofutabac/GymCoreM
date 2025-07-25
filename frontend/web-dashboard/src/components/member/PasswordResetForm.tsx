'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { forgotPassword } from '@/lib/api/auth';


export default function PasswordResetForm() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResetPassword = async () => {
    if (!user?.email) {
      setError('No se pudo obtener tu email. Por favor, contacta a soporte.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Usar la función forgotPassword de auth.ts que apunta al endpoint correcto
      await forgotPassword(user.email);
      
      setSuccess('Se ha enviado un correo con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      setError(err.message || 'Error al solicitar el restablecimiento de contraseña');
      console.error('Password reset request failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription className="text-green-800 text-sm md:text-base">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="p-4 md:p-6 border rounded-md bg-muted/50">
        <p className="font-medium text-sm md:text-base">Email asociado a tu cuenta:</p>
        <p className="text-base md:text-lg mt-1 break-all">{user?.email || 'Cargando...'}</p>
        <p className="text-xs md:text-sm text-muted-foreground mt-2">
          Se enviará un enlace para restablecer tu contraseña a este correo.
        </p>
      </div>
      
      <Button
        onClick={handleResetPassword}
        disabled={isLoading || !user?.email}
        className="w-full text-sm md:text-base h-10 md:h-11"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm md:text-base">Enviando...</span>
          </>
        ) : (
          <span className="text-sm md:text-base">Enviar correo de recuperación</span>
        )}
      </Button>
    </div>
  );
}
