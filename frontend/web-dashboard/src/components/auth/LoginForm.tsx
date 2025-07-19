"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginFormSchema } from "@/lib/validations";
import { loginAction } from "@/actions/auth.actions";

// Componente para el botón, que muestra el estado de carga
function SubmitButton() {
  const { pending: formPending } = useFormStatus();
  const [navPending] = useTransition();
  const pending = formPending || navPending;
  
  return (
    <Button type="submit" className="w-full h-11 font-medium" disabled={pending}>
      {pending ? "Iniciando Sesión..." : "Iniciar Sesión"}
    </Button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(loginAction, {
    success: false,
    message: "",
  });

  // Handle client-side navigation when login is successful
  useEffect(() => {
    if (state.success && state.redirectUrl) {
      startTransition(() => {
        router.push(state.redirectUrl);
      });
    }
  }, [state, router]);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });
  
  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
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
                  name="email"
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
                  name="password"
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <SubmitButton />
      </form>
    </Form>
  );
}