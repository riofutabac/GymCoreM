"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface StaffEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: { firstName: string; lastName: string }) => void;
  staff: Staff | null;
  isLoading?: boolean;
}

export function StaffEditModal({ open, onClose, onSave, staff, isLoading = false }: StaffEditModalProps) {
  const [formData, setFormData] = useState({
    firstName: staff?.firstName || "",
    lastName: staff?.lastName || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !staff) {
      return;
    }

    onSave(staff.id, {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
    });
  };

  const handleClose = () => {
    setFormData({
      firstName: staff?.firstName || "",
      lastName: staff?.lastName || "",
    });
    setErrors({});
    onClose();
  };

  // Actualizar formData cuando cambia el staff
  React.useEffect(() => {
    if (staff) {
      setFormData({
        firstName: staff.firstName,
        lastName: staff.lastName,
      });
    }
  }, [staff]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Información de Staff</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Nombre"
              className={errors.firstName ? "border-destructive" : ""}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Apellido"
              className={errors.lastName ? "border-destructive" : ""}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email (No editable)</Label>
            <Input
              value={staff?.email || ""}
              disabled
              className="bg-muted"
            />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
