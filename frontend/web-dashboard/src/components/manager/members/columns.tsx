'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Member } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import ActivateMembershipModal from './ActivateMembershipModal';
import { resetMemberPassword } from '@/lib/api/manager';
import { useToast } from '@/hooks/use-toast';

// Componente separado para el botón de acciones
function ActionButton({ member, onEdit }: Readonly<{ member: Member; onEdit: (member: Member) => void }>) {
  const [isActivateModalOpen, setIsActivateModalOpen] = React.useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    try {
      await resetMemberPassword(member.email);
      toast({
        title: 'Éxito',
        description: 'Se ha enviado el correo para resetear la contraseña',
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `Error al enviar el correo: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEdit(member)}>
            Editar Perfil
          </DropdownMenuItem>
          {member.membershipStatus !== 'ACTIVE' && (
            <DropdownMenuItem onClick={() => setIsActivateModalOpen(true)}>
              Activar Membresía
            </DropdownMenuItem>
          )}
          {member.membershipStatus === 'ACTIVE' && (
            <DropdownMenuItem onClick={() => setIsActivateModalOpen(true)}>
              Renovar Membresía
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleResetPassword}>
            Resetear Contraseña
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {isActivateModalOpen && (
        <ActivateMembershipModal 
          isOpen={isActivateModalOpen} 
          onClose={() => setIsActivateModalOpen(false)} 
          memberId={member.id}
        />
      )}
    </>
  );
}

export const columns = (onEdit: (member: Member) => void): ColumnDef<Member>[] => [
  { 
    accessorKey: 'firstName', 
    header: 'Nombre' 
  },
  { 
    accessorKey: 'lastName', 
    header: 'Apellido' 
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
      const roleNames = {
        'MEMBER': 'Miembro',
        'RECEPTIONIST': 'Recepcionista',
        'MANAGER': 'Manager'
      };
      return <Badge variant="outline">{roleNames[role] || role}</Badge>;
    }
  },
  {
    accessorKey: 'membershipStatus',
    header: 'Estado Membresía',
    cell: ({ row }) => {
      const status = row.original.membershipStatus;
      const variant = status === 'ACTIVE' ? 'default' : 'destructive';
      return <Badge variant={variant}>{status}</Badge>;
    }
  },
  {
    accessorKey: 'membershipEndDate',
    header: 'Vencimiento',
    cell: ({ row }) => {
        const date = row.original.membershipEndDate;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const member = row.original;
      return <ActionButton member={member} onEdit={onEdit} />;
    },
  },
];
