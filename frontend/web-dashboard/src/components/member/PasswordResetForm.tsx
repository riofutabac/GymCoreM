'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api/profile';


export default function PasswordResetForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await requestPasswordReset(email);
      setSuccess('Se ha enviado un correo con instrucciones para restablecer tu contraseña');
      setEmail(''); // Limpiar el campo después del éxito
    } catch (err: any) {
      setError(err.message || 'Error al solicitar el restablecimiento de contraseña');
      console.error('Password reset request failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          disabled={isLoading}
          required
        />
        <p className="text-sm text-muted-foreground">
          Ingresa el email asociado a tu cuenta para recibir instrucciones de restablecimiento.
        </p>
      </div>
      
      <Button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar correo de recuperación'
        )}
      </Button>
    </form>
  );
}
