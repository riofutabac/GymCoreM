// frontend/web-dashboard/src/app/(auth)/forgot-password/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { forgotPassword } from '@/actions/auth.actions';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await forgotPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al solicitar recuperación de contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Restablecer Contraseña"
      description="Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu cuenta."
    >
      {/* Mensajes de estado */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar enlace'
          )}
        </Button>
      </form>

      {/* Enlace de retorno */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline underline-offset-4">
          &larr; Volver a iniciar sesión
        </Link>
      </div>
    </AuthCard>
  );
}
