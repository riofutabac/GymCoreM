"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, AlertCircle } from "lucide-react";
import { joinGym } from "@/lib/api/member";

export function JoinGym() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e?: React.FormEvent) => {
    // Prevent default if called from form submit
    if (e) e.preventDefault();
    
    if (!code.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await joinGym(code);
      // Refresh the page to show the member dashboard
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al unirse al gimnasio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-primary" />
          <CardTitle className="text-2xl">Únete a tu Gimnasio</CardTitle>
          <CardDescription>
            Ingresa el código proporcionado por tu gimnasio para acceder a tu cuenta de miembro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Código de Gimnasio</Label>
                <Input 
                  id="code" 
                  placeholder="Ingresa el código" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Contacta con tu gimnasio si no tienes un código
                </p>
              </div>
              <Button 
                type="submit"
                className="w-full" 
                disabled={isLoading || !code.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Procesando...</span>
                    <span className="animate-spin">⏳</span>
                  </>
                ) : (
                  "Unirse al Gimnasio"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        {/* El botón ahora está dentro del formulario para mejor accesibilidad */}
      </Card>
    </div>
  );
}
