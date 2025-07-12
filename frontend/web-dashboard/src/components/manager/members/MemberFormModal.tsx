'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { memberFormSchema } from '@/lib/validations/manager-validations';
import { Member } from '@/lib/api/types';
import { createMember, updateMember } from '@/lib/api/manager';

interface MemberFormModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  member: Member | null; 
}

type MemberFormValues = z.infer<typeof memberFormSchema>;

export default function MemberFormModal({ isOpen, onClose, member }: MemberFormModalProps) {
  const isEditMode = member !== null;
  const title = isEditMode ? 'Editar Miembro' : 'Crear Nuevo Miembro';
  const description = isEditMode ? 'Actualiza los detalles del miembro.' : 'Añade un nuevo miembro a tu gimnasio.';
  
  const form = useForm<MemberFormValues>({ 
    resolver: zodResolver(memberFormSchema), 
    defaultValues: { 
      firstName: member?.firstName || '', 
      lastName: member?.lastName || '', 
      email: member?.email || '', 
      role: member?.role || 'MEMBER' 
    } 
  });

  const onSubmit = async (values: MemberFormValues) => {
    try {
      if (isEditMode) { 
        await updateMember({ id: member.id, ...values }); 
      } else { 
        await createMember(values); 
      }
      onClose();
    } catch (error) { 
      console.error('Failed to save member', error); 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${errorMessage}`); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField 
              control={form.control} 
              name="firstName" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" {...field} />
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
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="email" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="juan.perez@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="role" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEMBER">Miembro</SelectItem>
                      <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
