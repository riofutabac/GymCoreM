"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface RoleChangeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, role: string) => void;
  staff: Staff | null;
  isLoading?: boolean;
}

const roles = [
  { value: 'MANAGER', label: 'Manager', description: 'Gestiona un gimnasio específico' },
  { value: 'RECEPTIONIST', label: 'Recepcionista', description: 'Atiende en recepción y punto de venta' },
  { value: 'ADMIN', label: 'Administrador', description: 'Acceso completo al sistema' },
];

const roleColors = {
  MANAGER: "default",
  RECEPTIONIST: "secondary", 
  ADMIN: "destructive",
} as const;

export function RoleChangeModal({ open, onClose, onSave, staff, isLoading = false }: Readonly<RoleChangeModalProps>) {
  const [selectedRole, setSelectedRole] = useState(staff?.role || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staff || !selectedRole) {
      return;
    }

    onSave(staff.id, selectedRole);
  };

  const handleClose = () => {
    setSelectedRole(staff?.role || '');
    onClose();
  };

  // Actualizar role cuando cambia el staff
  React.useEffect(() => {
    if (staff) {
      setSelectedRole(staff.role);
    }
  }, [staff]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Usuario</Label>
            <div className="p-3 border rounded-md bg-muted">
              <p className="font-medium">{staff?.firstName} {staff?.lastName}</p>
              <p className="text-sm text-muted-foreground">{staff?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Seleccionar Nuevo Rol</Label>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  className={`w-full p-3 border rounded-md cursor-pointer transition-colors text-left ${
                    selectedRole === role.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Badge variant={roleColors[role.value as keyof typeof roleColors]}>
                      {role.label}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || selectedRole === staff?.role}
            >
              {isLoading ? "Cambiando..." : "Cambiar Rol"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
