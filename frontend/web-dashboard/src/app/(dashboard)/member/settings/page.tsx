'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validaciones básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      // Aquí iría la llamada a la API para cambiar la contraseña
      // Por ahora simulamos un delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulamos éxito
      setSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Error al cambiar la contraseña. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Gestiona la seguridad y configuración de tu cuenta
        </p>
      </div>

      <div className="space-y-6">
        {/* Cambio de Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <div className="relative">
                  <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    className="pl-8 pr-10" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-2.5 text-muted-foreground"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    className="pl-8 pr-10" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-2.5 text-muted-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 8 caracteres</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className="pl-8 pr-10" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu nueva contraseña"
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-2.5 text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Preferencias de Cuenta */}
        <Card>
          <CardHeader>
            <CardTitle>Preferencias de Cuenta</CardTitle>
            <CardDescription>
              Configura las opciones generales de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Idioma</h4>
                  <p className="text-sm text-muted-foreground">Selecciona el idioma de la interfaz</p>
                </div>
                <select className="border rounded p-1">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="darkMode" className="h-4 w-4" />
                <div>
                  <Label htmlFor="darkMode">Modo oscuro</Label>
                  <p className="text-xs text-muted-foreground">Cambiar entre tema claro y oscuro</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="twoFactorAuth" className="h-4 w-4" />
                <div>
                  <Label htmlFor="twoFactorAuth">Autenticación de dos factores</Label>
                  <p className="text-xs text-muted-foreground">Aumenta la seguridad de tu cuenta</p>
                </div>
              </div>
              
              <Button className="w-full">
                Guardar Preferencias
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Eliminar Cuenta */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
            <CardDescription>
              Acciones irreversibles para tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-600">Eliminar Cuenta</h4>
                <p className="text-sm text-muted-foreground">
                  Esta acción es permanente y no se puede deshacer. Se eliminarán todos tus datos.
                </p>
              </div>
              
              <Button variant="destructive" className="w-full">
                Solicitar Eliminación de Cuenta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
