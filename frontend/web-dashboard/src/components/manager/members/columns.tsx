'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Member } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ActivateMembershipModal from './ActivateMembershipModal';
import { resetMemberPassword } from '@/lib/api/manager';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, KeyRound, CreditCard, UserCog } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDays } from 'date-fns';

// Componente separado para el botón de acciones
function ActionButtons({ member, onEdit }: Readonly<{ member: Member; onEdit: (member: Member) => void }>) {
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
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `Error al enviar el correo: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const isMembershipActive = member.membershipStatus === 'ACTIVE';

  return (
    <>
      <TooltipProvider delayDuration={100}>
        <div className="flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
                <UserCog className="h-4 w-4" />
                <span className="sr-only">Editar Perfil</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar Perfil</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetPassword}>
                <KeyRound className="h-4 w-4" />
                <span className="sr-only">Resetear Contraseña</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Resetear Contraseña</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsActivateModalOpen(true)}
              >
                <CreditCard className="h-4 w-4" />
                <span className="sr-only">{isMembershipActive ? 'Renovar Membresía' : 'Activar Membresía'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMembershipActive ? 'Renovar Membresía' : 'Activar Membresía'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      {isActivateModalOpen && (
        <ActivateMembershipModal
          isOpen={isActivateModalOpen}
          onClose={() => setIsActivateModalOpen(false)}
          memberId={member.id}
          membershipStatus={member.membershipStatus}
          membershipEndDate={member.membershipEndDate}
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
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      const member = row.original;
      return <ActionButtons member={member} onEdit={onEdit} />;
    },
  },
];
