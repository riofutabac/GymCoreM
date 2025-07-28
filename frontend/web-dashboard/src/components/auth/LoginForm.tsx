"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginFormSchema } from "@/lib/validations";
import { loginUser } from "@/lib/api/auth";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: z.infer<typeof loginFormSchema>) {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await loginUser(data);
      
      if (response && response.access_token) {
        // Extract user information from JWT token for immediate redirect
        const { getUserInfoFromJWT } = await import('@/lib/utils/jwt');
        const userInfo = getUserInfoFromJWT(response.access_token);
        
        if (userInfo && userInfo.role) {
          const userRole = userInfo.role.toLowerCase();
          
          setSuccess("Inicio de sesión exitoso. Redirigiendo...");
          
          // Wait for the cookie to be set by the browser
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh user data in auth context
          try {
            await refreshUser();
            // Additional wait to ensure the context is updated
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error('Error refreshing user:', error);
            // Continue with redirect even if refreshUser fails
          }
          
          // Determinar la URL de redirección basada en el rol
          let dashboardUrl = '/';
          switch (userRole) {
            case 'owner':
              dashboardUrl = '/owner';
              break;
            case 'manager':
              dashboardUrl = '/manager';
              break;
            case 'member':
              dashboardUrl = '/member';
              break;
            case 'receptionist':
              dashboardUrl = '/receptionist';
              break;
          }
          
          // Use Next.js router for better navigation handling
          router.push(dashboardUrl);
        } else {
          setError("Error al procesar la información de usuario. Por favor intenta de nuevo.");
        }
      } else {
        setError("Respuesta inválida del servidor. Por favor intenta de nuevo.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ha ocurrido un error inesperado al iniciar sesión.");
      }
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="text-red-600 text-sm text-center p-3 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-600 text-sm text-center p-3 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}
        <div className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="tu@email.com" 
                  {...field} 
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  {...field} 
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
          {isLoading ? "Iniciando Sesión..." : "Iniciar Sesión"}
        </Button>
      </form>
    </Form>
  );
}