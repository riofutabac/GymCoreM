"use client";

import { useState } from "react";
import { useOwnerData } from '@/hooks/useOwnerData';
import { ownerApi } from '@/lib/api/owner';
import { LoadingSkeleton } from '@/components/owner/LoadingSkeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { StaffTable } from '@/components/owner/StaffTable';
import { StaffProfileFormModal } from '@/components/owner/StaffProfileFormModal';
import { StaffRoleFormModal } from '@/components/owner/StaffRoleFormModal';
import { toast } from 'sonner';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST';
  gymName?: string;
  gymId?: string;
}

export default function StaffManagementPage() {
  const { data: staff, isLoading, error, refresh } = useOwnerData(ownerApi.getStaff);
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditProfile = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setProfileModalOpen(true);
  };

  const handleChangeRole = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setRoleModalOpen(true);
  };

  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`¿Enviar email de restablecimiento de contraseña a ${email}?`)) {
      return;
    }
    
    try {
      await ownerApi.requestPasswordReset(email);
      toast.success('Email de restablecimiento enviado exitosamente');
    } catch (err) {
      console.error("Error enviando reset password:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al enviar email: ${errorMessage}`);
    }
  };

  const handleSaveProfile = async (data: { firstName: string; lastName: string }) => {
    if (!selectedStaff) return;
    
    setIsSubmitting(true);
    try {
      await ownerApi.updateUserProfile(selectedStaff.id, data);
      toast.success('Información actualizada exitosamente');
      await refresh();
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al actualizar: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRole = async (data: { role: string }) => {
    if (!selectedStaff) return;
    
    setIsSubmitting(true);
    try {
      await ownerApi.updateUserRole(selectedStaff.id, data.role);
      toast.success('Rol actualizado exitosamente');
      await refresh();
    } catch (err) {
      console.error("Error actualizando rol:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al actualizar rol: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
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
          No se pudo cargar la lista de personal. Por favor, intenta de nuevo más tarde.
          <p className="text-xs mt-2 font-mono">{error}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
        <p className="text-muted-foreground">
          Administra los perfiles y roles del equipo administrativo.
        </p>
      </div>
      
      <StaffTable
        staff={staff || []}
        onEditProfile={handleEditProfile}
        onChangeRole={handleChangeRole}
        onResetPassword={handleResetPassword}
      />

      {/* Modales */}
      <StaffProfileFormModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
        staffMember={selectedStaff}
        isLoading={isSubmitting}
      />
      
      <StaffRoleFormModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onSave={handleSaveRole}
        staffMember={selectedStaff}
        isLoading={isSubmitting}
      />
    </div>
  );
}
