'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Product } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

type ProductColumnsProps = { 
  onEdit: (product: Product) => void; 
  onDelete: (productId: string) => Promise<void> | void; 
};

export const columns = ({ onEdit, onDelete }: ProductColumnsProps): ColumnDef<Product>[] => [
  { 
    accessorKey: 'name', 
    header: 'Nombre' 
  },
  { 
    accessorKey: 'price', 
    header: 'Precio', 
    cell: ({ row }) => `$${row.original.price.toFixed(2)}` 
  },
  { 
    accessorKey: 'stock', 
    header: 'Stock' 
  },
  { 
    accessorKey: 'barcode', 
    header: 'Código de Barras' 
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(product)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-600">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
