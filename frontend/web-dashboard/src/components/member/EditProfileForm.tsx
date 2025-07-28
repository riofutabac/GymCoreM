'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateMemberProfile } from '@/lib/api/member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { sanitizeName } from '@/lib/utils/sanitization';

const editProfileSchema = z.object({
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

type EditProfileFormData = z.infer<typeof editProfileSchema>;

interface EditProfileFormProps {
  initialData: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditProfileForm({ initialData, onSuccess, onCancel }: EditProfileFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
    },
  });

  const handleSubmit = async (data: EditProfileFormData) => {
    setError(null);

    try {
      // Solo enviar campos que han cambiado
      const changedFields: any = {};
      if (data.firstName !== initialData.firstName) {
        changedFields.firstName = data.firstName;
      }
      if (data.lastName !== initialData.lastName) {
        changedFields.lastName = data.lastName;
      }

      if (Object.keys(changedFields).length === 0) {
        setError('No se han realizado cambios');
        return;
      }

      await updateMemberProfile(changedFields);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error actualizando perfil');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center sm:text-left">
        <CardTitle className="text-xl md:text-2xl">Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 md:space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
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
                        className="text-sm md:text-base"
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
                        className="text-sm md:text-base"
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
              <Label htmlFor="email" className="text-sm md:text-base">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={initialData.email}
                disabled={true}
                required
                className="bg-muted text-muted-foreground text-sm md:text-base"
                placeholder="Ingresa tu email"
              />
              <p className="text-xs md:text-sm text-muted-foreground">
                El email no se puede modificar por razones de seguridad.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:flex-1 text-sm md:text-base h-10 md:h-11"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={form.formState.isSubmitting}
                className="w-full sm:flex-1 text-sm md:text-base h-10 md:h-11"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
