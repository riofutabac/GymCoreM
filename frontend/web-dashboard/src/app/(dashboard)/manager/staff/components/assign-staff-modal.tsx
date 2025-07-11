'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignStaffModal({ 
  isOpen, 
  onClose 
}: AssignStaffModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen]);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      // Obtener miembros que pueden ser asignados como recepcionistas
      const response = await fetch('/api/v1/members', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching members');
      }

      const data = await response.json();
      // Filtrar solo miembros que no son staff
      const availableMembers = data.filter((member: Member) => 
        !member.role || member.role === 'MEMBER'
      );
      setMembers(availableMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los miembros",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMemberId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un miembro",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/v1/staff/assign', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedMemberId,
          role: 'RECEPTIONIST',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al asignar el rol');
      }

      toast({
        title: "Éxito",
        description: "Recepcionista asignado correctamente",
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error assigning staff:', error);
      toast({
        title: "Error",
        description: error.message || "Error al asignar el rol",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignar Recepcionista</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="member">Seleccionar Miembro</Label>
            {loadingMembers ? (
              <div className="text-sm text-muted-foreground">
                Cargando miembros...
              </div>
            ) : (
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un miembro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} - {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            El miembro seleccionado será asignado como recepcionista y podrá acceder 
            al sistema de punto de venta y gestión básica.
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingMembers || !selectedMemberId}>
              {loading ? 'Asignando...' : 'Asignar Recepcionista'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
