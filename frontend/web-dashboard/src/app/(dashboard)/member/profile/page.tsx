"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, User, Mail, Phone, MapPin, Building, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UpdateProfileForm } from "@/components/member/UpdateProfileForm";
import { getMemberProfile } from "@/lib/api/member";
import { MemberProfile } from "@/lib/api/types";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<MemberProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await getMemberProfile();
        setMemberData(profile);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos del perfil');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando información del perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y configuraciones
        </p>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateProfileForm 
              initialData={memberData}
              onSuccess={() => {
                setIsEditing(false);
                // Recargar los datos del perfil después de actualizar
                getMemberProfile().then(data => setMemberData(data));
              }}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Tus datos personales y de contacto
              </CardDescription>
            </div>
            <Button onClick={() => setIsEditing(true)}>
              Editar Perfil
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium leading-none">Nombre Completo</p>
                    <p className="text-sm text-muted-foreground">
                      {memberData?.firstName} {memberData?.lastName}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium leading-none">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {memberData?.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium leading-none">Teléfono</p>
                    <p className="text-sm text-muted-foreground">
                      {memberData?.phone || "No especificado"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium leading-none">Dirección</p>
                    <p className="text-sm text-muted-foreground">
                      {memberData?.address || "No especificada"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium leading-none">Gimnasio</p>
                    <p className="text-sm text-muted-foreground">
                      {memberData?.gymName || "No asignado"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium leading-none">Fecha de Registro</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(memberData?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium">Preferencias de Notificación</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Configura cómo quieres recibir notificaciones
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificaciones por Email</p>
                        <p className="text-sm text-muted-foreground">
                          Recibe actualizaciones en tu correo
                        </p>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        Activado
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificaciones Push</p>
                        <p className="text-sm text-muted-foreground">
                          Recibe alertas en tu dispositivo
                        </p>
                      </div>
                      <div className="text-sm font-medium text-red-600">
                        Desactivado
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Seguridad de la Cuenta</CardTitle>
          <CardDescription>
            Gestiona la seguridad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cambiar Contraseña</p>
              <p className="text-sm text-muted-foreground">
                Actualiza tu contraseña de acceso
              </p>
            </div>
            <Button variant="outline">
              Cambiar
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autenticación de Dos Factores</p>
              <p className="text-sm text-muted-foreground">
                Añade una capa extra de seguridad
              </p>
            </div>
            <Button variant="outline">
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
