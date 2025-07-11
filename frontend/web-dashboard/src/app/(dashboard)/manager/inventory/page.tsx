'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Product } from '@/lib/api/types';
import { DataTable } from '@/components/shared/DataTable';
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton';
import { columns as inventoryColumns } from './_components/columns';
import ProductFormModal from './_components/ProductFormModal';
import { getProducts, deleteProduct as apiDeleteProduct } from '@/lib/api/manager';

export default function ManagerInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenModal = (product: Product | null = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setLoading(true);
    fetchProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await apiDeleteProduct(productId);
        fetchProducts();
      } catch (error) {
        console.error("Failed to delete product", error);
        alert('Error al eliminar el producto.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Inventario</CardTitle>
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Producto
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <DataTableSkeleton columnCount={5} />
          ) : (
            <DataTable 
              columns={inventoryColumns({ onEdit: handleOpenModal, onDelete: handleDeleteProduct })} 
              data={products} 
              filterColumn="name" 
              filterPlaceholder="Filtrar por nombre..."
            />
          )}
        </CardContent>
      </Card>
      
      {isModalOpen && (
        <ProductFormModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          product={selectedProduct}
        />
      )}
    </div>
  );
}
