"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const roleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'RECEPTIONIST'], {
    required_error: "Por favor selecciona un rol.",
  }),
  gymId: z.string().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface Gym {
  id: string;
  name: string;
  isActive: boolean;
}

interface StaffRoleFormModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  onSave: (data: { role: string; gymId?: string }) => Promise<void>;
  staff?: { 
    id: string; 
    role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST'; 
    firstName: string; 
    lastName: string;
    gymId?: string;
  } | null;
  gyms?: Gym[];
  isSubmitting?: boolean;
}

export function StaffRoleFormModal({ 
  open, 
  onClose, 
  onOpenChange, 
  onSave, 
  staff, 
  gyms = [], 
  isSubmitting = false 
}: StaffRoleFormModalProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { role: 'RECEPTIONIST', gymId: undefined },
  });

  const selectedRole = form.watch('role');
  const requiresGym = selectedRole === 'MANAGER' || selectedRole === 'RECEPTIONIST';
  const activeGyms = gyms.filter(gym => gym.isActive);

  useEffect(() => {
    if (staff && open) {
      form.reset({ 
        role: staff.role,
        gymId: staff.gymId || undefined
      });
    } else if (open) {
      form.reset({ role: 'RECEPTIONIST', gymId: undefined });
    }
  }, [staff, open, form]);

  const handleClose = () => {
    form.reset();
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (data: RoleFormData) => {
    const submitData: { role: string; gymId?: string } = {
      role: data.role
    };
    
    if (requiresGym && data.gymId) {
      submitData.gymId = data.gymId;
    }
    
    await onSave(submitData);
    handleClose();
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'Acceso completo a toda la plataforma';
      case 'MANAGER':
        return 'Gestión completa de un gimnasio específico';
      case 'RECEPTIONIST':
        return 'Acceso limitado a funciones de recepción';
      default:
        return '';
    }
  };

  const isFormValid = !requiresGym || (requiresGym && form.watch('gymId'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange || (() => {})}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Cambiar Rol</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Cambiar el rol de {staff?.firstName} {staff?.lastName}
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Cambiar el rol afectará los permisos y accesos del usuario inmediatamente.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="RECEPTIONIST">
                        <div className="flex flex-col">
                          <span>Recepcionista</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleDescription('RECEPTIONIST')}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="MANAGER">
                        <div className="flex flex-col">
                          <span>Manager</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleDescription('MANAGER')}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="OWNER">
                        <div className="flex flex-col">
                          <span>Owner</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleDescription('OWNER')}
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresGym && (
              <FormField
                control={form.control}
                name="gymId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gimnasio Asignado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un gimnasio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeGyms.length > 0 ? (
                          activeGyms.map((gym) => (
                            <SelectItem key={gym.id} value={gym.id}>
                              {gym.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            No hay gimnasios activos disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {requiresGym && (
                      <p className="text-xs text-muted-foreground">
                        Los roles Manager y Recepcionista requieren asignación a un gimnasio
                      </p>
                    )}
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !isFormValid || activeGyms.length === 0 && requiresGym}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Rol
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
