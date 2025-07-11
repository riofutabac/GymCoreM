"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { useOwnerData } from '@/hooks/useOwnerData';
import { ownerApi } from '@/lib/api/owner';
import { LoadingSkeleton } from '@/components/owner/LoadingSkeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GymsTable } from '@/components/owner/GymsTable';
import { GymFormModal } from '@/components/owner/GymFormModal';
import { toast } from 'sonner';

interface Gym {
  id: string;
  name: string;
  isActive: boolean;
  memberCount?: number;
  location?: string;
  createdAt?: string;
}

export default function GymsManagementPage() {
  const { data: gyms, isLoading, error, refresh } = useOwnerData(ownerApi.getGyms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (gym: Gym | null = null) => {
    setSelectedGym(gym);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedGym(null);
    setIsModalOpen(false);
  };

  const handleSave = async (data: { name: string; isActive?: boolean; location?: string }) => {
    setIsSubmitting(true);
    try {
      if (selectedGym) {
        await ownerApi.updateGym(selectedGym.id, data);
        toast.success('Gimnasio actualizado exitosamente');
      } else {
        await ownerApi.createGym(data);
        toast.success('Gimnasio creado exitosamente');
      }
      await refresh(); // Refrescar la lista de gimnasios
      handleCloseModal();
    } catch (err) {
      console.error("Error guardando gimnasio:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar el gimnasio: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres desactivar este gimnasio?")) {
        return;
    }
    try {
        await ownerApi.deleteGym(id);
        toast.success('Gimnasio desactivado exitosamente');
        await refresh();
    } catch (err) {
        console.error("Error desactivando gimnasio:", err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(`Error al desactivar el gimnasio: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de Carga</AlertTitle>
            <AlertDescription>
                No se pudo cargar la lista de gimnasios.
                <p className="text-xs mt-2 font-mono">{error}</p>
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Gimnasios</h1>
          <p className="text-muted-foreground">Crea, edita y administra todas tus sucursales.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gimnasio
        </Button>
      </div>
      
      <GymsTable gyms={gyms || []} onEdit={handleOpenModal} onDelete={handleDelete} />

      <GymFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        gym={selectedGym}
        isLoading={isSubmitting}
      />
    </div>
  );
}
