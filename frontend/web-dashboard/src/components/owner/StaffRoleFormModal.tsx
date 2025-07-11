"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const roleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'RECEPTIONIST'], {
    required_error: "Por favor selecciona un rol.",
  }),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface StaffRoleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RoleFormData) => Promise<void>;
  staffMember?: { id: string; role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST'; firstName: string; lastName: string; } | null;
  isLoading?: boolean;
}

export function StaffRoleFormModal({ open, onClose, onSave, staffMember, isLoading }: StaffRoleFormModalProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { role: 'RECEPTIONIST' },
  });

  useEffect(() => {
    if (staffMember && open) {
      form.reset({ role: staffMember.role });
    }
  }, [staffMember, open, form]);

  const handleSubmit = async (data: RoleFormData) => {
    await onSave(data);
    onClose();
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar Rol</DialogTitle>
          <DialogDescription>
            Cambiar el rol de {staffMember?.firstName} {staffMember?.lastName}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Rol
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
