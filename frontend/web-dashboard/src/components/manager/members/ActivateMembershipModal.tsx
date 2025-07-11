'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { activateMembership } from '@/lib/api/manager';

interface ActivateMembershipModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  memberId: string; 
}

export default function ActivateMembershipModal({ isOpen, onClose, memberId }: ActivateMembershipModalProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!startDate || !endDate) { 
          alert('Por favor, selecciona ambas fechas.'); 
          return; 
        }
        
        setIsSubmitting(true);
        try { 
          await activateMembership({ 
            memberId, 
            startsAt: new Date(startDate).toISOString(), 
            endsAt: new Date(endDate).toISOString(), 
            paymentType: 'CASH' 
          }); 
          alert('Membresía activada con éxito'); 
          onClose();
        } catch (error) { 
          console.error(error); 
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Error al activar la membresía: ${errorMessage}`);
        } finally { 
          setIsSubmitting(false); 
        }
    }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activar/Renovar Membresía (Efectivo)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input 
                id="startDate" 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha de Fin</Label>
              <Input 
                id="endDate" 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Activando...' : 'Activar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
