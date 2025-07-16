'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCurrentUser } from '@/lib/api/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userData = await getCurrentUser();
        setUser(userData);
        setError(null);
      } catch (err) {
        setError('Error al cargar la información del perfil');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    
    try {
      // Aquí iría la llamada a la API para actualizar el perfil
      // Por ahora simulamos un delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Perfil actualizado correctamente');
    } catch (err) {
      setError('Error al actualizar el perfil');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y preferencias
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Información Personal</TabsTrigger>
              <TabsTrigger value="preferences">Preferencias</TabsTrigger>
            </TabsList>
            
            {/* Tab: Información Personal */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Datos Personales</CardTitle>
                  <CardDescription>
                    Actualiza tu información de contacto y datos personales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {successMessage && (
                    <Alert className="mb-4 bg-green-50 border-green-200">
                      <AlertDescription className="text-green-800">
                        {successMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <div className="relative">
                          <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="firstName"
                            className="pl-8" 
                            defaultValue={user?.firstName || ''}
                            placeholder="Tu nombre"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Apellidos</Label>
                        <div className="relative">
                          <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="lastName"
                            className="pl-8" 
                            defaultValue={user?.lastName || ''}
                            placeholder="Tus apellidos"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <div className="relative">
                          <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="email"
                            type="email"
                            className="pl-8" 
                            defaultValue={user?.email || ''}
                            placeholder="tu@email.com"
                            disabled
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <div className="relative">
                          <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="phone"
                            className="pl-8" 
                            defaultValue={user?.phone || ''}
                            placeholder="Tu número de teléfono"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <div className="relative">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="address"
                            className="pl-8" 
                            defaultValue={user?.address || ''}
                            placeholder="Tu dirección"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="birthdate">Fecha de Nacimiento</Label>
                        <div className="relative">
                          <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="birthdate"
                            type="date"
                            className="pl-8" 
                            defaultValue={user?.birthdate || ''}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSaving}>
                      {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tab: Preferencias */}
            <TabsContent value="preferences" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Preferencias de Notificaciones</CardTitle>
                  <CardDescription>
                    Configura cómo quieres recibir notificaciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="emailNotifications" className="h-4 w-4" defaultChecked />
                        <Label htmlFor="emailNotifications">Notificaciones por correo electrónico</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="smsNotifications" className="h-4 w-4" />
                        <Label htmlFor="smsNotifications">Notificaciones por SMS</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="marketingEmails" className="h-4 w-4" />
                        <Label htmlFor="marketingEmails">Recibir ofertas y promociones</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="classReminders" className="h-4 w-4" defaultChecked />
                        <Label htmlFor="classReminders">Recordatorios de clases</Label>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full">
                      Guardar Preferencias
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
