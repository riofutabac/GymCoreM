'use client';

import React, { useState } from 'react';
import { updateMemberProfile } from '@/lib/api/member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    email: initialData.email || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Solo enviar campos que han cambiado
      const changedFields: any = {};
      if (formData.firstName !== initialData.firstName) {
        changedFields.firstName = formData.firstName;
      }
      if (formData.lastName !== initialData.lastName) {
        changedFields.lastName = formData.lastName;
      }
      // El email ya no se puede modificar
      // if (formData.email !== initialData.email) {
      //   changedFields.email = formData.email;
      // }

      if (Object.keys(changedFields).length === 0) {
        setError('No se han realizado cambios');
        return;
      }

      await updateMemberProfile(changedFields);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error actualizando perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center sm:text-left">
        <CardTitle className="text-xl md:text-2xl">Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm md:text-base">
                Nombre
              </Label>
              <Input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Ingresa tu nombre"
                className="text-sm md:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm md:text-base">
                Apellido
              </Label>
              <Input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Ingresa tu apellido"
                className="text-sm md:text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm md:text-base">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
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
              disabled={isLoading}
              className="w-full sm:flex-1 text-sm md:text-base h-10 md:h-11"
            >
              {isLoading ? (
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
              disabled={isLoading}
              className="w-full sm:flex-1 text-sm md:text-base h-10 md:h-11"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
