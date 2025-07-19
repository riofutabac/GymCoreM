'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Product } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

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
    header: 'Acciones',
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex justify-start space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(product.id)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      );
    },
    enableSorting: false,
    size: 200, // Ancho fijo para la columna
  },
];
