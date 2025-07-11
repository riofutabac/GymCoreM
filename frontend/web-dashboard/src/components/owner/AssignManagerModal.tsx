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

interface Gym {
  id: string;
  name: string;
  isActive: boolean;
}

interface AssignManagerModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (gymId: string, userId: string) => void;
  staff: Staff | null;
  gyms: Gym[];
  isLoading?: boolean;
}

export function AssignManagerModal({ open, onClose, onSave, staff, gyms, isLoading = false }: Readonly<AssignManagerModalProps>) {
  const [selectedGym, setSelectedGym] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staff || !selectedGym) {
      return;
    }

    onSave(selectedGym, staff.id);
  };

  const handleClose = () => {
    setSelectedGym('');
    onClose();
  };

  const activeGyms = gyms?.filter(gym => gym.isActive) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Manager a Gimnasio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Manager</Label>
            <div className="p-3 border rounded-md bg-muted">
              <p className="font-medium">{staff?.firstName} {staff?.lastName}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">{staff?.email}</p>
                <Badge variant="default">Manager</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Seleccionar Gimnasio</Label>
            {activeGyms.length === 0 ? (
              <div className="p-3 border rounded-md bg-muted">
                <p className="text-sm text-muted-foreground">No hay gimnasios activos disponibles</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeGyms.map((gym) => (
                  <button
                    key={gym.id}
                    type="button"
                    className={`w-full p-3 border rounded-md cursor-pointer transition-colors text-left ${
                      selectedGym === gym.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedGym(gym.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{gym.name}</p>
                      </div>
                      <Badge variant="default">Activo</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
              disabled={isLoading || !selectedGym || activeGyms.length === 0}
            >
              {isLoading ? "Asignando..." : "Asignar Manager"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
