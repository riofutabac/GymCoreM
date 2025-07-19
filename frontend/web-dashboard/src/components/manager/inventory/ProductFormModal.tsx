'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Product, ProductPayload } from '@/lib/api/types';
import { createProduct, updateProduct } from '@/lib/api/manager';
import { productSchema } from '@/lib/validations/manager-validations';

interface ProductFormModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  product: Product | null; 
}

export default function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  const isEditMode = !!product;
  
  const form = useForm<ProductPayload>({ 
    resolver: zodResolver(productSchema), 
    defaultValues: { 
      name: product?.name || '', 
      price: product?.price || 0, 
      stock: product?.stock || 0, 
      description: product?.description || '', 
      barcode: product?.barcode || '' 
    } 
  });

  const onSubmit = async (values: ProductPayload) => {
    try {
      if (isEditMode) { 
        await updateProduct(product.id, values); 
      } else { 
        await createProduct(values); 
      }
      onClose();
    } catch (error) { 
      console.error('Failed to save product', error); 
      alert('Error al guardar el producto.'); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField 
              control={form.control} 
              name="name" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="price" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="stock" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="description" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <FormField 
              control={form.control} 
              name="barcode" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Código de Barras</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )} 
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
