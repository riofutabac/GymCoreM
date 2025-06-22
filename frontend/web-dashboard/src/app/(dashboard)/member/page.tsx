import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Activity, CreditCard, Calendar, Clock } from "lucide-react";

export default function MemberDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Portal de Miembro</h1>
        <p className="text-muted-foreground">
          Bienvenido a tu espacio personal
        </p>
      </div>

      {/* Member Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas este Mes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">
              +3 vs mes anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Membresía</CardTitle>
            <Badge variant="default" className="text-xs">Activa</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">Activa</div>
            <p className="text-xs text-muted-foreground">
              Vence: 15/12/2024
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Pago</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">€29.99</div>
            <p className="text-xs text-muted-foreground">
              15 de Diciembre
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Services */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mi Información</CardTitle>
            <CardDescription>
              Gestiona tus datos personales y configuraciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Actualizar Datos Personales</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Email, teléfono, dirección
                </div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Historial de Pagos</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Ver facturas y recibos
                </div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Historial de Visitas</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Check-ins anteriores
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicios</CardTitle>
            <CardDescription>
              Accede a todas las funcionalidades disponibles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Reservar Clase</div>
                <div className="text-sm text-primary-foreground/80 mt-1">
                  Yoga, Spinning, Zumba...
                </div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Congelar Membresía</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Pausar temporalmente
                </div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Invitar Amigo</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Pase de prueba gratuito
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Horarios del Gimnasio</AlertTitle>
        <AlertDescription>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
            <div>
              <div className="font-medium">Lun - Vie</div>
              <div className="text-muted-foreground">6:00 - 23:00</div>
            </div>
            <div>
              <div className="font-medium">Sábado</div>
              <div className="text-muted-foreground">8:00 - 22:00</div>
            </div>
            <div>
              <div className="font-medium">Domingo</div>
              <div className="text-muted-foreground">9:00 - 20:00</div>
            </div>
            <div>
              <div className="font-medium">Ocupación Actual</div>
              <div className="text-muted-foreground">Moderada (65%)</div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}