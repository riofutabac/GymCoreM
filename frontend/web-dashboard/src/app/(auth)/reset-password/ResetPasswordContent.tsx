'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { sanitizeString } from '@/lib/utils/sanitization';

const resetPasswordSchema = z.object({
  password: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    .max(128, { message: 'La contraseña no puede exceder 128 caracteres.' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'La contraseña debe contener al menos una minúscula, una mayúscula y un número.' })),
  confirmPassword: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, { message: 'Confirma tu contraseña.' })),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessingToken, setIsProcessingToken] = useState(true);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

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
  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setError('');

    try {
      // Como ya tenemos sesión, actualizamos directamente
      const { error: updateError } = await supabase.auth.updateUser({ password: data.password });
      if (updateError) throw updateError;

      setSuccess('Contraseña actualizada correctamente. Redirigiendo…');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setError(err.message || 'No se pudo actualizar la contraseña');
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva Contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    disabled={form.formState.isSubmitting || !!success}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Al menos 8 caracteres con mayúscula, minúscula y número
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    disabled={form.formState.isSubmitting || !!success}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !!success}
            className="w-full"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Actualizando…
              </>
            ) : (
              'Guardar contraseña'
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline underline-offset-4">
          &larr; Volver a Iniciar Sesión
        </Link>
      </div>
    </AuthCard>
  );
}
