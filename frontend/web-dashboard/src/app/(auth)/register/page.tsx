import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-lg mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crear una Cuenta</CardTitle>
        <CardDescription>Bienvenido a Gymcore. ¡Únete a nuestra comunidad!</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <div className="mt-4 text-center text-sm">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Inicia Sesión aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}