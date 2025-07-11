'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Calendar, CreditCard } from 'lucide-react';
import { useState } from 'react';
import ActivateMembershipModal from './activate-membership-modal';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  membershipStartDate?: string;
  membershipEndDate?: string;
  createdAt: string;
}

export const columns = (
  onEdit: (member: Member) => void,
  onRefresh: () => void
): ColumnDef<Member>[] => [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const member = row.original;
      return `${member.firstName} ${member.lastName}`;
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) => row.original.phone || 'N/A',
  },
  {
    accessorKey: 'membershipStatus',
    header: 'Estado Membresía',
    cell: ({ row }) => {
      const status = row.original.membershipStatus;
      const variants = {
        ACTIVE: 'default' as const,
        EXPIRED: 'destructive' as const,
        PENDING: 'secondary' as const,
      };
      const labels = {
        ACTIVE: 'Activa',
        EXPIRED: 'Vencida',
        PENDING: 'Pendiente',
      };
      return (
        <Badge variant={variants[status] || 'secondary'}>
          {labels[status] || status}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'membershipEndDate',
    header: 'Vencimiento',
    cell: ({ row }) => {
      const endDate = row.original.membershipEndDate;
      if (!endDate) return 'N/A';
      return new Date(endDate).toLocaleDateString('es-ES');
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha Registro',
    cell: ({ row }) => {
      return new Date(row.original.createdAt).toLocaleDateString('es-ES');
    }
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      const member = row.original;
      const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

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
                <Edit className="mr-2 h-4 w-4" />
                Editar Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsActivateModalOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Activar/Renovar Membresía
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isActivateModalOpen && (
            <ActivateMembershipModal 
              isOpen={isActivateModalOpen}
              onClose={() => {
                setIsActivateModalOpen(false);
                onRefresh();
              }}
              member={member}
            />
          )}
        </>
      );
    },
  },
];
