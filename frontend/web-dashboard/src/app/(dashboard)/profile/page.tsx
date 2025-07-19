'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getMyMembership } from '@/lib/api/member';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { User, Mail, Edit3 } from 'lucide-react';
import EditProfileForm from '@/components/member/EditProfileForm';
import PasswordResetForm from '@/components/member/PasswordResetForm';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [memberData, setMemberData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setIsLoading(true);
        // Si el usuario es miembro, obtenemos datos adicionales del servicio de gimnasio
        if (user?.role === 'member' || user?.role === 'MEMBER') {
          const data = await getMyMembership();
          setMemberData({...user, ...data});
        } else {
          // Para otros roles, usamos solo los datos de autenticación
          setMemberData(user);
        }
        setError(null);
      } catch (err) {
        setError('Error al cargar la información del perfil');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchMemberData();
    }
  }, [user]);

  const handleEditSuccess = async () => {
    setIsEditing(false);
    setSuccessMessage('Perfil actualizado correctamente');
    // Recargar datos del miembro
    try {
      if (user?.role === 'member' || user?.role === 'MEMBER') {
        const data = await getMyMembership();
        setMemberData({...user, ...data});
      } else {
        // Recargar datos de usuario para otros roles
        // Esto se actualizará automáticamente con el hook useAuth en la siguiente renderización
      }
    } catch (err) {
      console.error('Error recargando datos:', err);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y configuración
          </p>
        </div>
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y configuración
        </p>
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Información Personal</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
          </TabsList>
          
          {/* Tab: Información Personal */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {!isEditing ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Datos Personales</CardTitle>
                    <CardDescription>
                      Tu información personal y de contacto
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Nombre completo</span>
                      </div>
                      <p className="font-medium">
                        {memberData?.firstName || memberData?.name?.split(' ')[0] || ''} {memberData?.lastName || memberData?.name?.split(' ').slice(1).join(' ') || ''}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                      <p className="font-medium">{memberData?.email}</p>
                    </div>
                    
                    {/* Mostrar información del gimnasio solo para miembros */}
                    {(memberData?.role === 'member' || memberData?.role === 'MEMBER') && memberData?.hasGym && (
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Gimnasio</span>
                        </div>
                        <p className="font-medium">{memberData?.gym?.name}</p>
                        <p className="text-sm text-gray-500">{memberData?.gym?.address}</p>
                      </div>
                    )}

                    {/* Mostrar rol para todos los usuarios */}
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Rol en el sistema</span>
                      </div>
                      <p className="font-medium">
                        {memberData?.role === 'owner' || memberData?.role === 'OWNER' ? 'Propietario' : 
                         memberData?.role === 'manager' || memberData?.role === 'MANAGER' ? 'Gerente' :
                         memberData?.role === 'receptionist' || memberData?.role === 'RECEPTIONIST' ? 'Recepcionista' :
                         'Miembro'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EditProfileForm
                initialData={{
                  firstName: memberData?.firstName || memberData?.name?.split(' ')[0] || '',
                  lastName: memberData?.lastName || memberData?.name?.split(' ').slice(1).join(' ') || '',
                  email: memberData?.email || '',
                }}
                onSuccess={handleEditSuccess}
                onCancel={handleEditCancel}
              />
            )}
          </TabsContent>
          
          {/* Tab: Seguridad */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recuperación de Contraseña</CardTitle>
                <CardDescription>
                  Solicita un correo para restablecer tu contraseña
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordResetForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
