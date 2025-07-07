'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProductTable } from '@/components/inventory/ProductTable';
import { ProductFormModal } from '@/components/inventory/ProductFormModal';
import { inventoryApi } from '@/lib/api/inventory';
import { ProductDto } from '@/lib/api/types';
import { toast } from 'sonner';
import { Plus, Package } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await inventoryApi.list();
      setProducts(data);
    } catch (error) {
      toast.error('Error al cargar productos');
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSave = async (data: any) => {
    try {
      setIsFormLoading(true);
      if (selectedProduct) {
        // Update existing product
        await inventoryApi.update(selectedProduct.id, data);
        toast.success('Producto actualizado correctamente');
      } else {
        // Create new product
        await inventoryApi.create(data);
        toast.success('Producto creado correctamente');
      }
      setModalOpen(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el producto');
      console.error('Error saving product:', error);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDelete = async (product: ProductDto) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`)) {
      return;
    }

    try {
      await inventoryApi.remove(product.id);
      toast.success('Producto eliminado correctamente');
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el producto');
      console.error('Error deleting product:', error);
    }
  };

  const handleEdit = (product: ProductDto) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleNew = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Inventario</h1>
            <p className="text-muted-foreground">
              Gestiona los productos de tu gimnasio
            </p>
          </div>
        </div>
        <Button onClick={handleNew} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <div className="bg-background rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ProductTable
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        product={selectedProduct}
        isLoading={isFormLoading}
      />
    </div>
  );
}
