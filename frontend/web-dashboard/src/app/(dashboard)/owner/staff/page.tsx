"use client";

import { useState, useMemo } from "react";
import { useOwnerData } from '@/hooks/useOwnerData';
import { ownerApi } from '@/lib/api/owner';
import { LoadingSkeleton } from '@/components/owner/LoadingSkeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search, Filter, Users } from "lucide-react";
import { StaffTable } from '@/components/owner/StaffTable';
import { StaffProfileFormModal } from '@/components/owner/StaffProfileFormModal';
import { StaffRoleFormModal } from '@/components/owner/StaffRoleFormModal';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  // Obtener datos del staff y de los gimnasios por separado
  const { data: staffList, isLoading: isLoadingStaff, error: errorStaff, refresh: refreshStaff } = useOwnerData(ownerApi.getStaff);
  const { data: gymsList, isLoading: isLoadingGyms, error: errorGyms } = useOwnerData(ownerApi.getGyms);
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [gymFilter, setGymFilter] = useState<string>("ALL");

  // Enriquecer los datos del staff con el nombre del gimnasio
  const enrichedStaff = useMemo(() => {
    if (!staffList || !gymsList) return [];

    // Crear un mapa para búsqueda rápida: { gymId: gymName }
    const gymMap = new Map(gymsList.map(gym => [gym.id, gym.name]));

    return staffList.map(staffMember => ({
      ...staffMember,
      gymName: staffMember.gymId ? gymMap.get(staffMember.gymId) || 'Gimnasio Desconocido' : 'Ninguno',
    }));
  }, [staffList, gymsList]);

  // Filtrar el staff
  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter(staffMember => {
      const matchesSearch = 
        staffMember.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "ALL" || staffMember.role === roleFilter;
      const matchesGym = gymFilter === "ALL" || staffMember.gymId === gymFilter || (!staffMember.gymId && gymFilter === "NONE");

      return matchesSearch && matchesRole && matchesGym;
    });
  }, [enrichedStaff, searchTerm, roleFilter, gymFilter]);

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
      await refreshStaff();
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
      await refreshStaff();
    } catch (err) {
      console.error("Error actualizando rol:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al actualizar rol: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingStaff || isLoadingGyms;
  const error = errorStaff || errorGyms;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-muted-foreground">
            Administra los perfiles y roles del equipo administrativo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-medium">{filteredStaff.length} miembros del equipo</span>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los roles</SelectItem>
                <SelectItem value="OWNER">Propietario</SelectItem>
                <SelectItem value="MANAGER">Gerente</SelectItem>
                <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
              </SelectContent>
            </Select>

            <Select value={gymFilter} onValueChange={setGymFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por gimnasio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los gimnasios</SelectItem>
                <SelectItem value="NONE">Sin asignar</SelectItem>
                {gymsList?.map(gym => (
                  <SelectItem key={gym.id} value={gym.id}>{gym.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <StaffTable
        staff={filteredStaff || []}
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
