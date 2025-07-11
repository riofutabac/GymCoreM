'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'MANAGER' | 'RECEPTIONIST' | 'OWNER';
  createdAt: string;
}

export const staffColumns: ColumnDef<StaffMember>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }: { row: any }) => {
      const member = row.original;
      return `${member.firstName} ${member.lastName}`;
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    cell: ({ row }: { row: any }) => {
      const role = row.original.role;
      const variants = {
        OWNER: 'default' as const,
        MANAGER: 'secondary' as const,
        RECEPTIONIST: 'outline' as const,
      };
      const labels = {
        OWNER: 'Propietario',
        MANAGER: 'Manager',
        RECEPTIONIST: 'Recepcionista',
      };
      return (
        <Badge variant={variants[role as keyof typeof variants] || 'outline'}>
          {labels[role as keyof typeof labels] || role}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha de Ingreso',
    cell: ({ row }: { row: any }) => {
      return new Date(row.original.createdAt).toLocaleDateString('es-ES');
    }
  },
];
