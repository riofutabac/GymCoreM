'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductDto } from '@/lib/api/types';
import { Pencil, Trash2, Package } from 'lucide-react';

interface ProductTableProps {
  products: ProductDto[];
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No hay productos registrados
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Comienza agregando tu primer producto
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Código
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Precio
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Stock
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {product.barcode}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      ${product.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{product.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant={product.stock > 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {product.stock > 0 ? "Disponible" : "Sin stock"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(product)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(product)}
                        className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
