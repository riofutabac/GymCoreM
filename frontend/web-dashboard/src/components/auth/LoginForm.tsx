"use client";

import { useActionState, useEffect } from "react";
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
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Iniciando Sesión..." : "Iniciar Sesión"}
    </Button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(loginAction, {
    success: false,
    message: "",
  });

  // Handle client-side navigation when login is successful
  useEffect(() => {
    if (state.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });
  
  return (
    <Form {...form}>
      <form action={formAction} className="space-y-4">
        {state?.message && !state.success && (
          <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">
            {state.message}
          </div>
        )}
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" placeholder="tu@email.com" {...field} name="email" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Contraseña</FormLabel>
            <FormControl><Input type="password" placeholder="••••••••" {...field} name="password" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <SubmitButton />
      </form>
    </Form>
  );
}