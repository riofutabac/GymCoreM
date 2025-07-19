// frontend/web-dashboard/src/app/(auth)/reset-password/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessingToken, setIsProcessingToken] = useState(true);

  // 1) Procesar el hash de Supabase y setear sesión
  useEffect(() => {
    const handleToken = async () => {
      setIsProcessingToken(true);
      try {
        const hash = window.location.hash; // "#access_token=...&refresh_token=...&type=recovery"
        if (!hash.includes('access_token')) {
          throw new Error('No se encontró token de recuperación en la URL');
        }

        // Convertir el fragmento en parámetros
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const errDesc = params.get('error_description');

        if (errDesc) {
          throw new Error(errDesc);
        }
        if (!access_token || !refresh_token) {
          throw new Error('Tokens incompletos');
        }

        // Guardar la sesión en Supabase JS
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          throw sessionError;
        }

        // Ya hay sesión, mostramos el formulario
        setIsProcessingToken(false);
      } catch (err: any) {
        console.error('Error al procesar sesión desde URL:', err);
        setError(err.message || 'Error al procesar el enlace de recuperación');
        setIsProcessingToken(false);
      }
    };

    handleToken();
  }, [searchParams, supabase.auth]);

  // 2) Envío del nuevo password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      // Como ya tenemos sesión, actualizamos directamente
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess('Contraseña actualizada correctamente. Redirigiendo…');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setError(err.message || 'No se pudo actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (isProcessingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-base">Procesando solicitud de recuperación…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      title="Restablecer Contraseña"
      description="Ingresa tu nueva contraseña para continuar"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleResetPassword} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading || !!success}
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">
            Al menos 8 caracteres
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar Contraseña</Label>
          <Input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading || !!success}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !password || !confirmPassword || !!success}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Actualizando…
            </>
          ) : (
            'Guardar contraseña'
          )}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline underline-offset-4">
          &larr; Volver a Iniciar Sesión
        </Link>
      </div>
    </AuthCard>
  );
}
