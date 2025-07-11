'use client';

import { ColumnDef } from '@tanstack/react-table';
import { StaffMember } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<StaffMember>[] = [
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
      const variant = role === 'MANAGER' ? 'default' : 'secondary';
      return <Badge variant={variant}>{role}</Badge>;
    }
  },
];
