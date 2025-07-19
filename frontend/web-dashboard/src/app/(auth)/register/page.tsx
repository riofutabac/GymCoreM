import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <AuthCard 
      title="Crear una Cuenta" 
      description="Bienvenido a Gymcore. ¡Únete a nuestra comunidad!"
      className="max-w-lg"
    >
      <RegisterForm />
      <div className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Inicia Sesión aquí
        </Link>
      </div>
    </AuthCard>
  );
}