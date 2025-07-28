'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { updateProfile } from '@/lib/api/auth';
import { sanitizeName } from '@/lib/utils/sanitization';

const profileEditSchema = z.object({
  firstName: z.string()
    .transform(sanitizeName)
    .pipe(z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
    .max(50, { message: 'El nombre no puede exceder 50 caracteres.' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El nombre solo puede contener letras, espacios, guiones y apostrofes.' })),
  lastName: z.string()
    .transform(sanitizeName)
    .pipe(z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
    .max(50, { message: 'El apellido no puede exceder 50 caracteres.' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El apellido solo puede contener letras, espacios, guiones y apostrofes.' })),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;


interface ProfileEditFormProps {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function ProfileEditForm({ user }: ProfileEditFormProps) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const handleSubmit = async (data: ProfileEditFormData) => {
    setError('');
    setSuccess('');
    
    try {
      await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName
      });
      setSuccess('Perfil actualizado exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil');
      console.error('Update failed:', err);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm md:text-base">Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingresa tu nombre"
                    className="text-sm md:text-base h-10 md:h-11"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm md:text-base">Apellido</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingresa tu apellido"
                    className="text-sm md:text-base h-10 md:h-11"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm md:text-base">Email</Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled={true}
            className="bg-muted text-muted-foreground text-sm md:text-base h-10 md:h-11"
            placeholder="Tu email actual"
          />
          <p className="text-xs md:text-sm text-muted-foreground">
            El email no se puede modificar directamente por razones de seguridad.
          </p>
        </div>
        
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full text-sm md:text-base h-10 md:h-11"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm md:text-base">Guardando...</span>
            </>
          ) : (
            <span className="text-sm md:text-base">Guardar Cambios</span>
          )}
        </Button>
      </form>
    </Form>
  );
}
