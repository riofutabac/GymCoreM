import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserPlus, CreditCard, Users } from "lucide-react";

export default function ReceptionistDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard de Recepción
        </h1>
        <p className="text-muted-foreground">
          Atención al cliente y gestión de membresías
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Hoy</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevas Inscripciones</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">15</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Miembros</CardTitle>
            <CardDescription>
              Acciones para altas, bajas y modificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Registrar Nuevo Miembro</div>
                <div className="text-sm text-primary-foreground/80 mt-1">
                  Crear nueva membresía
                </div>
              </div>
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              Buscar Miembro
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Renovar Membresía
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Procesar Pagos
              <Badge variant="destructive" className="ml-auto">
                15
              </Badge>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Control de Acceso</CardTitle>
            <CardDescription>
              Herramientas para gestionar el acceso al gimnasio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Check-in Manual</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Registrar entrada de miembro
                </div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Registrar Visitante
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Ver Miembros Presentes
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Gestionar Pases de Día
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}