'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Member } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ActivateMembershipModal from './ActivateMembershipModal';
import { resetMemberPassword, banMembership } from '@/lib/api/manager';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, KeyRound, CreditCard, UserCog, Ban, CircleSlash } from 'lucide-react';
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
  const isMembershipBanned = member.membershipStatus === 'BANNED';

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
          {!isMembershipActive && !isMembershipBanned && ( // ⬅️ solo si NO está activa Y NO está baneada
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setIsActivateModalOpen(true)}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="sr-only">Activar Membresía</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Activar Membresía</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isMembershipBanned && member.activeMembershipId && ( // ⬅️ solo si NO está baneada Y tenemos el ID
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={async () => {
                    if (confirm('¿Seguro que quieres banear a este socio?')) {
                      try {
                         await banMembership(member.activeMembershipId!); // Use the extracted ID
                         toast({ title: 'Socio baneado' });
                         // TODO: Trigger data refetch here (e.g., mutate or refetch)
                      } catch (error) {
                         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                         toast({
                           title: 'Error al banear',
                           description: errorMessage,
                           variant: 'destructive',
                         });
                      }
                    }
                  }}
                >
                  <CircleSlash className="h-4 w-4" /> {/* Changed icon to CircleSlash */}
                  <span className="sr-only">Banear</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Banear socio</p>
              </TooltipContent>
            </Tooltip>
          )}
           {isMembershipBanned && ( // ⬅️ Mostrar botón de desbanear si está baneada
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={async () => {
                    if (confirm('¿Seguro que quieres desbanear a este socio?')) {
                      // TODO: Implement unban logic
                      toast({ title: 'Funcionalidad de desbanear pendiente' });
                    }
                  }}
                >
                  <Ban className="h-4 w-4 rotate-180" /> {/* Keep Ban icon for unban */}
                  <span className="sr-only">Desbanear</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Desbanear socio</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
      {isActivateModalOpen && (
        <ActivateMembershipModal
          isOpen={isActivateModalOpen}
          onClose={() => setIsActivateModalOpen(false)}
          memberId={member.id}
          membershipStatus={member.membershipStatus}
          membershipEndDate={member.membershipEndDate}
          activeMembershipId={member.activeMembershipId}
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
      let variant: 'default' | 'destructive' | 'secondary' | 'outline' = 'outline';
      
      switch (status) {
        case 'ACTIVE':
          variant = 'default'; // Verde para activo
          break;
        case 'BANNED':
          variant = 'destructive'; // Rojo para baneado
          break;
        case 'EXPIRED':
          variant = 'secondary'; // Gris para expirado
          break;
        case 'PENDING_PAYMENT':
          variant = 'outline'; // Outline para pendiente de pago
          break;
        case 'CANCELLED':
          variant = 'secondary'; // Gris para cancelado
          break;
        case 'GRACE_PERIOD':
          variant = 'outline'; // Outline para período de gracia
          break;
        default: // INACTIVE
          variant = 'outline';
      }
      
      // Mapear nombres más amigables para mostrar
      const statusNames = {
        'ACTIVE': 'Activo',
        'PENDING_PAYMENT': 'Pago Pendiente',
        'EXPIRED': 'Expirado',
        'CANCELLED': 'Cancelado',
        'GRACE_PERIOD': 'Período de Gracia',
        'BANNED': 'Baneado',
        'INACTIVE': 'Inactivo'
      };
      
      return <Badge variant={variant}>{statusNames[status] || status}</Badge>;
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
