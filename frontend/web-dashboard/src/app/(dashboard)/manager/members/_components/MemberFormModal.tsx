'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
      name: member?.name || '', 
      email: member?.email || '', 
      phone: member?.phone || '', 
      address: member?.address || '' 
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
              name="name" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="phone" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Teléfono (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="address" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Dirección (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City" {...field} />
                  </FormControl>
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
