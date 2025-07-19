"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { registerFormSchema } from "@/lib/validations";
import { registerUser } from "@/lib/api/auth";

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await registerUser(data);
      setSuccess("Cuenta creada exitosamente. Revisa tu email y confirma tu cuenta para poder iniciar sesión.");
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ha ocurrido un error inesperado.");
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
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Santiago" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Apellido</FormLabel>
                <FormControl>
                  <Input placeholder="Bejarano" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@email.com" {...field} className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
    </Form>
  );
}