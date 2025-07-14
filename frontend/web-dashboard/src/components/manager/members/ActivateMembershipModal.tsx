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
import { addMonths, addDays } from 'date-fns';
import { Member } from '@/lib/api/types';

interface ActivateMembershipModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly memberId: string;
  readonly membershipStatus: Member['membershipStatus'];
  readonly membershipEndDate: string | null;
}

export default function ActivateMembershipModal({
  isOpen,
  onClose,
  memberId,
  membershipStatus,
  membershipEndDate,
}: ActivateMembershipModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRenewal = membershipStatus === 'ACTIVE';

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

  // Log para saber cuál es la endDate que está llegando
  useEffect(() => {
    const endDate = form.getValues('endDate');
    console.log('log matias - endDate actual:', endDate);
  }, [form.watch('endDate')]);

  useEffect(() => {
    if (isOpen) {
      let startDate = new Date();
      if (isRenewal && membershipEndDate) {
        const currentEndDate = new Date(membershipEndDate);
        if (currentEndDate > startDate) {
          startDate = addDays(currentEndDate, 1);
        }
      }
      form.reset({
        userId: memberId,
        startDate: startDate,
        endDate: addMonths(startDate, 1),
        amount: 0,
        reason: isRenewal ? 'Renovación manual (pago en efectivo)' : 'Activación manual (pago en efectivo)',
      });
    }
  }, [isOpen, memberId, membershipStatus, membershipEndDate, form, isRenewal]);

  const handleDurationSelect = (months: number) => {
    const startDate = form.getValues('startDate');
    const endDate = addMonths(startDate, months);
    form.setValue('endDate', endDate);
  };

  const onSubmit = async (data: ActivateMembershipFormData) => {
    setIsSubmitting(true);
    
    // 🐛 LOGS DE DEPURACIÓN - Fechas de membresía
    console.log('🔄 ACTIVANDO MEMBRESÍA - Datos del formulario:');
    console.log('   • Usuario ID:', data.userId);
    console.log('   • Fecha de Inicio (raw):', data.startDate);
    console.log('   • Fecha de Inicio (ISO):', data.startDate.toISOString());
    console.log('   • Fecha de Fin (raw):', data.endDate);
    console.log('   • Fecha de Fin (ISO):', data.endDate.toISOString());
    console.log('   • Duración:', Math.round((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)), 'días');
    console.log('   • Monto:', data.amount);
    console.log('   • Razón:', data.reason);
    
    try {
      await activateMembership({
        memberId: data.userId,
        startsAt: data.startDate.toISOString(),
        endsAt: data.endDate.toISOString(),
        amount: data.amount,
        paymentType: 'CASH', // ← Campo requerido para activación manual
        reason: data.reason,
      });

      console.log('✅ Membresía enviada exitosamente al backend');

      toast({
        title: 'Éxito',
        description: 'Membresía activada correctamente',
      });

      onClose();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // --- Manejo de error específico para membresía pendiente no encontrada ---
      const pendingMembershipErrorMsg = "Acción denegada. No se encontró una membresía pendiente para este usuario en tu gimnasio.";
      
      if (errorMessage.includes(pendingMembershipErrorMsg)) {
        toast({
          title: 'Error de Activación',
          description: 'No se encontró una membresía pendiente para este socio. Asegúrate de que se haya unido al gimnasio primero.',
          variant: 'destructive',
        });
      } else {
        // --- Manejo de otros errores ---
        toast({
          title: 'Error',
          description: `Error al activar la membresía: ${errorMessage}`,
          variant: 'destructive',
        });
      }
      // --- Fin del manejo de error específico ---

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
                      disabled={isRenewal} // no mover la fecha si es renovación
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
                  variant="ghost" 
                  onClick={() => handleDurationSelect(1)}
                  className="flex-1 border border-black text-black bg-white hover:bg-neutral-100"
                >
                  1 Mes
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleDurationSelect(3)}
                  className="flex-1 border border-black text-black bg-white hover:bg-neutral-100"
                >
                  3 Meses
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleDurationSelect(6)}
                  className="flex-1 border border-black text-black bg-white hover:bg-neutral-100"
                >
                  6 Meses
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleDurationSelect(12)}
                  className="flex-1 border border-black text-black bg-white hover:bg-neutral-100"
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
