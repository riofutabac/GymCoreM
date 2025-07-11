'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignStaffFormSchema } from '@/lib/validations/manager-validations';
import { Member } from '@/lib/api/types';
import { assignStaff } from '@/lib/api/manager';

interface AssignStaffModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  members: Member[]; 
}

type AssignStaffFormValues = z.infer<typeof assignStaffFormSchema>;

export default function AssignStaffModal({ isOpen, onClose, members }: AssignStaffModalProps) {
  const form = useForm<AssignStaffFormValues>({ 
    resolver: zodResolver(assignStaffFormSchema) 
  });

  const onSubmit = async (values: AssignStaffFormValues) => {
    try { 
      await assignStaff({ userId: values.userId }); 
      alert('Rol de recepcionista asignado correctamente.'); 
      onClose();
    } catch (error) { 
      console.error('Failed to assign staff', error); 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error al asignar el rol: ${errorMessage}`); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignar Recepcionista</DialogTitle>
          <DialogDescription>
            Selecciona un miembro para promoverlo al rol de recepcionista.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField 
              control={form.control} 
              name="userId" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miembro</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un miembro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.email})
                            </SelectItem>
                          ))}
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
                {form.formState.isSubmitting ? 'Asignando...' : 'Asignar Rol'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
