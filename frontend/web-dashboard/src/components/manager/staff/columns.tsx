'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { StaffMember } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { changeUserRole } from '@/lib/api/manager';
import { useToast } from '@/hooks/use-toast';

// Componente separado para el botón de acciones
function ActionButton({ staff, onRefresh }: Readonly<{ staff: StaffMember; onRefresh: () => void }>) {
  const { toast } = useToast();

  const handleRevokeRole = async () => {
    try {
      // Solo podemos revocar el rol de RECEPTIONIST, no MANAGER u OWNER
      if (staff.role !== 'RECEPTIONIST') {
        toast({
          title: 'Error',
          description: 'Solo se puede revocar el rol de Recepcionista',
          variant: 'destructive',
        });
        return;
      }

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        {staff.role === 'RECEPTIONIST' && (
          <DropdownMenuItem onClick={handleRevokeRole}>
            Quitar Rol de Recepcionista
          </DropdownMenuItem>
        )}
        {staff.role !== 'RECEPTIONIST' && (
          <DropdownMenuItem disabled>
            No se puede modificar este rol
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
