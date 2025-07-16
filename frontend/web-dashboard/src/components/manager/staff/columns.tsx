'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { StaffMember } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserMinus, Lock } from 'lucide-react';
import { changeUserRole } from '@/lib/api/manager';
import { useToast } from '@/hooks/use-toast';

// Componente separado para los botones de acciones
function ActionButton({ staff, onRefresh }: Readonly<{ staff: StaffMember; onRefresh: () => void }>) {
  const { toast } = useToast();

  const handleRevokeRole = async () => {
    try {
      await changeUserRole(staff.id, 'MEMBER');

      toast({
        title: 'Éxito',
        description: 'Rol de recepcionista revocado exitosamente',
      });

      onRefresh();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `Error al revocar rol: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  // Solo se puede modificar el rol RECEPTIONIST
  const canModifyRole = staff.role === 'RECEPTIONIST';

  return (
    <div className="flex items-center gap-2">
      {canModifyRole ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeRole}
          className="h-8 px-2 w-32"
        >
          <UserMinus className="h-4 w-4 mr-1" />
          Quitar Rol
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-8 px-2 w-32"
        >
          <Lock className="h-4 w-4 mr-1" />
          Rol Protegido
        </Button>
      )}
    </div>
  );
}

export const columns = (onRefresh: () => void): ColumnDef<StaffMember>[] => [
  { 
    accessorKey: 'name', 
    header: 'Nombre' 
  },
  { 
    accessorKey: 'email', 
    header: 'Email' 
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    cell: ({ row }) => {
      const role = row.original.role;
      let variant: 'default' | 'destructive' | 'secondary' = 'secondary';
      
      if (role === 'MANAGER') {
        variant = 'default';
      } else if (role === 'OWNER') {
        variant = 'destructive';
      }
      
      return <Badge variant={variant}>{role}</Badge>;
    }
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      const staff = row.original;
      return <ActionButton staff={staff} onRefresh={onRefresh} />;
    },
  },
];
