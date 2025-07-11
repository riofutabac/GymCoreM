"use client";

import { useState, useMemo } from "react";
import { useOwnerData } from '@/hooks/useOwnerData';
import { ownerApi } from '@/lib/api/owner';
import { LoadingSkeleton } from '@/components/owner/LoadingSkeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Users, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaffProfileFormModal } from '@/components/owner/StaffProfileFormModal';
import { StaffRoleFormModal } from '@/components/owner/StaffRoleFormModal';
import { toast } from 'sonner';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'MEMBER';
  gymName?: string;
  gymId?: string;
  createdAt: string;
}

export default function UsersManagementPage() {
  // Obtener datos de usuarios y gimnasios
  const { data: usersList, isLoading: isLoadingUsers, error: errorUsers, refresh: refreshUsers } = useOwnerData(ownerApi.getAllUsers);
  const { data: gymsList, isLoading: isLoadingGyms, error: errorGyms } = useOwnerData(ownerApi.getGyms);
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [gymFilter, setGymFilter] = useState<string>("ALL");

  // Enriquecer los datos de usuarios con el nombre del gimnasio
  const enrichedUsers = useMemo(() => {
    if (!usersList || !gymsList) return [];

    const gymMap = new Map(gymsList.map(gym => [gym.id, gym.name]));

    return usersList.map(user => ({
      ...user,
      gymName: user.gymId ? gymMap.get(user.gymId) || 'Gimnasio Desconocido' : 'Sin asignar',
    }));
  }, [usersList, gymsList]);

  // Filtrar usuarios
  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter(user => {
      const matchesSearch = 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesGym = gymFilter === "ALL" || user.gymId === gymFilter || (!user.gymId && gymFilter === "NONE");

      return matchesSearch && matchesRole && matchesGym;
    });
  }, [enrichedUsers, searchTerm, roleFilter, gymFilter]);

  const handleEditProfile = (user: User) => {
    setSelectedUser(user);
    setProfileModalOpen(true);
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
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
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      await ownerApi.updateUserProfile(selectedUser.id, data);
      toast.success('Información actualizada exitosamente');
      await refreshUsers();
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al actualizar: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setProfileModalOpen(false);
      setSelectedUser(null);
    }
  };

  const handleSaveRole = async (data: { role: string; gymId?: string }) => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      await ownerApi.updateUserRole(selectedUser.id, data);
      toast.success('Rol actualizado exitosamente');
      await refreshUsers();
    } catch (err) {
      console.error("Error actualizando rol:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al actualizar rol: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setRoleModalOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'destructive';
      case 'MANAGER': return 'default';
      case 'RECEPTIONIST': return 'secondary';
      case 'MEMBER': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Propietario';
      case 'MANAGER': return 'Gerente';
      case 'RECEPTIONIST': return 'Recepcionista';
      case 'MEMBER': return 'Miembro';
      default: return role;
    }
  };

  const isLoading = isLoadingUsers || isLoadingGyms;
  const error = errorUsers || errorGyms;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error de Carga</AlertTitle>
        <AlertDescription>
          No se pudieron cargar los datos de usuarios. Por favor, intenta de nuevo más tarde.
          <p className="text-xs mt-2 font-mono">{error}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra todos los usuarios de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-medium">{filteredUsers.length} usuarios</span>
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
                <SelectItem value="OWNER">Propietarios</SelectItem>
                <SelectItem value="MANAGER">Gerentes</SelectItem>
                <SelectItem value="RECEPTIONIST">Recepcionistas</SelectItem>
                <SelectItem value="MEMBER">Miembros</SelectItem>
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
                {gymsList?.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    {gym.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Usuario</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Rol</th>
                  <th className="text-left p-4 font-medium">Gimnasio</th>
                  <th className="text-left p-4 font-medium">Registro</th>
                  <th className="text-left p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{user.gymName}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProfile(user)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeRole(user)}
                        >
                          Rol
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.email)}
                        >
                          Resetear
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron usuarios con los filtros aplicados.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modales */}
      <StaffProfileFormModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        staff={selectedUser}
        onSave={handleSaveProfile}
        isSubmitting={isSubmitting}
      />

      <StaffRoleFormModal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        staff={selectedUser}
        gyms={gymsList || []}
        onSave={handleSaveRole}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
