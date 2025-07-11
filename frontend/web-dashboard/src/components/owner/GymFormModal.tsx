"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

// Esquema de validación con Zod
const gymSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  isActive: z.boolean().default(true),
});

type GymFormData = z.infer<typeof gymSchema>;

interface GymFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: GymFormData) => Promise<void>;
  gym?: { id: string; name: string; isActive: boolean } | null;
  isLoading?: boolean;
}

export function GymFormModal({ open, onClose, onSave, gym, isLoading }: GymFormModalProps) {
  const form = useForm<GymFormData>({
    resolver: zodResolver(gymSchema),
    defaultValues: {
      name: '',
      isActive: true,
    },
  });

  // Pre-llenar el formulario cuando se edita un gimnasio
  useEffect(() => {
    if (gym) {
      form.reset({
        name: gym.name,
        isActive: gym.isActive,
      });
    } else {
      form.reset({
        name: '',
        isActive: true,
      });
    }
  }, [gym, open, form]);

  const handleFormSubmit = async (data: GymFormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{gym ? 'Editar Gimnasio' : 'Crear Nuevo Gimnasio'}</DialogTitle>
          <DialogDescription>
            {gym ? 'Actualiza los detalles de la sucursal.' : 'Añade una nueva sucursal a la plataforma.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Gimnasio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: GymCore Sede Norte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {gym && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Activo</FormLabel>
                      <p className="text-[0.8rem] text-muted-foreground">
                        Permite que el gimnasio esté operativo en la plataforma.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
