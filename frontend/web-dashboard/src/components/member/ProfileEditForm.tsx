'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { updateProfile } from '@/lib/api/auth';


interface ProfileEditFormProps {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function ProfileEditForm({ user }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      setSuccess('Perfil actualizado exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil');
      console.error('Update failed:', err);
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
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription className="text-green-800 text-sm md:text-base">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm md:text-base">Nombre</Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            disabled={isLoading}
            className="text-sm md:text-base h-10 md:h-11"
            placeholder="Ingresa tu nombre"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm md:text-base">Apellido</Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            disabled={isLoading}
            className="text-sm md:text-base h-10 md:h-11"
            placeholder="Ingresa tu apellido"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm md:text-base">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
        disabled={isLoading}
        className="w-full text-sm md:text-base h-10 md:h-11"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm md:text-base">Guardando...</span>
          </>
        ) : (
          <span className="text-sm md:text-base">Guardar Cambios</span>
        )}
      </Button>
    </form>
  );
}
