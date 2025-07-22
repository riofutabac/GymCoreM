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

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: z.infer<typeof loginFormSchema>) {
    console.log('🔍 Login Debug: Starting login process...', data);
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log('🔍 Login Debug: Calling loginUser API...');
      const response = await loginUser(data);
      console.log('🔍 Login Debug: API Response:', response);
      
      if (response && response.access_token && response.user && response.user.role) {
        const user = response.user;
        const userRole = user.role.toLowerCase();
        
        console.log('🔍 Login Debug: Login successful, role:', userRole);
        setSuccess("Inicio de sesión exitoso. Redirigiendo...");
        
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
        
        console.log('🔍 Login Debug: Redirecting to:', dashboardUrl);
        // Redirigir después de un breve delay para mostrar el mensaje de éxito
        setTimeout(() => {
          router.push(dashboardUrl);
        }, 1000);
      } else {
        console.log('🔍 Login Debug: Invalid response structure:', response);
        setError("Respuesta inválida del servidor. Por favor intenta de nuevo.");
      }
    } catch (error) {
      console.error('🔍 Login Debug: Error occurred:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ha ocurrido un error inesperado al iniciar sesión.");
      }
    } finally {
      console.log('🔍 Login Debug: Process completed');
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