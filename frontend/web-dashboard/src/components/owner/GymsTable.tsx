"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Trash2, RotateCcw } from "lucide-react";

// Definimos el tipo para los datos de un gimnasio
interface Gym {
  id: string;
  name: string;
  uniqueCode?: string;
  isActive: boolean;
  createdAt?: string;
  deletedAt?: string | null;
  memberCount?: number;
  location?: string;
}

interface GymsTableProps {
  gyms: Gym[];
  onEdit: (gym: Gym) => void;
  onDelete: (id: string) => void;
  onReactivate: (id: string) => void;
}

export function GymsTable({ gyms, onEdit, onDelete, onReactivate }: GymsTableProps) {
  // Estado para cuando no hay gimnasios
  if (!gyms || gyms.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardHeader>
          <div className="mx-auto bg-secondary rounded-full p-3 w-fit">
            <Building2 className="h-8 w-8 text-secondary-foreground" />
          </div>
          <CardTitle className="mt-4">No hay gimnasios registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Comienza creando tu primera sucursal para administrarla.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nombre del Gimnasio</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gyms.map((gym) => (
              <TableRow key={gym.id}>
                <TableCell className="font-medium">{gym.name}</TableCell>
                <TableCell>
                  {gym.uniqueCode ? (
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {gym.uniqueCode}
                    </code>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={gym.isActive && !gym.deletedAt ? "default" : "destructive"}>
                    {gym.isActive && !gym.deletedAt ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {gym.createdAt ? (
                    <span className="text-sm">
                      {new Date(gym.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {gym.isActive && !gym.deletedAt ? (
                    // Gimnasio activo: mostrar editar y eliminar
                    <>
                      <Button variant="outline" size="sm" onClick={() => onEdit(gym)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(gym.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </>
                  ) : (
                    // Gimnasio inactivo: solo mostrar reactivar
                    <Button variant="default" size="sm" onClick={() => onReactivate(gym.id)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reactivar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
