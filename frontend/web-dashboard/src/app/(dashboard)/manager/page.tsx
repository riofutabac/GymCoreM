import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, UserCheck } from "lucide-react";

export default function ManagerDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard del Manager</h1>
        <p className="text-muted-foreground">
          Gestión operativa de tu gimnasio
        </p>
      </div>

      {/* Gym Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">287</div>
            <p className="text-xs text-muted-foreground">
              +12 este mes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">65%</div>
            <p className="text-xs text-muted-foreground">
              47 personas dentro
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff en Turno</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              De 12 total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tools */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Personal</CardTitle>
            <CardDescription>
              Herramientas para administrar el equipo de trabajo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Ver Horarios del Staff
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Gestionar Turnos
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Evaluaciones de Desempeño
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operaciones Diarias</CardTitle>
            <CardDescription>
              Control y seguimiento de las actividades del gimnasio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Control de Acceso
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Mantenimiento de Equipos
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Reportes Diarios
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}