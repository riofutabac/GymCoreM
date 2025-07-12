'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { activateMembershipSchema, type ActivateMembershipFormData } from '@/lib/validations/manager-validations';
import { activateMembership } from '@/lib/api/manager';
import { useToast } from '@/hooks/use-toast';
import { addMonths } from 'date-fns';

interface ActivateMembershipModalProps { 
  readonly isOpen: boolean; 
  readonly onClose: () => void; 
  readonly memberId: string; 
}

export default function ActivateMembershipModal({ isOpen, onClose, memberId }: ActivateMembershipModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ActivateMembershipFormData>({
    resolver: zodResolver(activateMembershipSchema),
    defaultValues: {
      userId: memberId,
      startDate: new Date(),
      endDate: addMonths(new Date(), 1),
      amount: 0,
      reason: 'Activación manual (pago en efectivo)',
    },
  });

  // Setear la fecha de inicio al día actual cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      form.setValue('startDate', today);
      form.setValue('userId', memberId);
    }
  }, [isOpen, memberId, form]);

  const handleDurationSelect = (months: number) => {
    const startDate = form.getValues('startDate');
    const endDate = addMonths(startDate, months);
    form.setValue('endDate', endDate);
  };

  const onSubmit = async (data: ActivateMembershipFormData) => {
    setIsSubmitting(true);
    try {
      await activateMembership({
        memberId: data.userId,
        startsAt: data.startDate.toISOString(),
        endsAt: data.endDate.toISOString(),
        amount: data.amount,
        paymentType: 'CASH',
      });
      
      toast({
        title: 'Éxito',
        description: 'Membresía activada correctamente',
      });
      
      onClose();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `Error al activar la membresía: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Activar/Renovar Membresía (Efectivo)</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Inicio</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label>Seleccionar Duración</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDurationSelect(1)}
                  className="flex-1"
                >
                  1 Mes
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDurationSelect(3)}
                  className="flex-1"
                >
                  3 Meses
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDurationSelect(6)}
                  className="flex-1"
                >
                  6 Meses
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDurationSelect(12)}
                  className="flex-1"
                >
                  1 Año
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Fin</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Activando...' : 'Activar Membresía'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
