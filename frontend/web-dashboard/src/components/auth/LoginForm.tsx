"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginFormSchema } from "@/lib/validations";

// Componente para el botón, que muestra el estado de carga
function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" className="w-full h-11 font-medium" disabled={isPending}>
      {isPending ? "Iniciando Sesión..." : "Iniciar Sesión"}
    </Button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState({
    success: false,
    message: "",
    redirectUrl: "",
  });

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginFormSchema>) => {
    startTransition(async () => {
      try {
        // Simple login simulation - replace with actual API call
        if (values.email && values.password) {
          setState({
            success: true,
            message: "Login successful",
            redirectUrl: "/dashboard",
          });
          router.push("/dashboard");
        } else {
          setState({
            success: false,
            message: "Email y contraseña son requeridos",
            redirectUrl: "",
          });
        }
      } catch (error) {
        setState({
          success: false,
          message: "Error al iniciar sesión",
          redirectUrl: "",
        });
      }
    });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {state?.message && !state.success && (
          <div className="text-red-600 text-sm text-center p-3 bg-red-50 border border-red-200 rounded-md">
            {state.message}
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
        <SubmitButton isPending={isPending} />
      </form>
    </Form>
  );
}