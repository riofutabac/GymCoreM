'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Member } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import ActivateMembershipModal from './ActivateMembershipModal';

// Componente separado para el botón de acciones
function ActionButton({ member, onEdit }: { member: Member; onEdit: (member: Member) => void }) {
  const [isActivateModalOpen, setIsActivateModalOpen] = React.useState(false);
  
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
          <DropdownMenuItem onClick={() => setIsActivateModalOpen(true)}>
            Activar/Renovar Membresía
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
    accessorKey: 'name', 
    header: 'Nombre' 
  },
  { 
    accessorKey: 'email', 
    header: 'Email' 
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
