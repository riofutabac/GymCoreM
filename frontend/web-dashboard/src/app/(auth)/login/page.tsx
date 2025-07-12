import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthCard 
      title="¡Bienvenido de Nuevo!" 
      description="Ingresa tus credenciales para acceder a tu panel."
    >
      <LoginForm />
      <div className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes una cuenta?{" "}
        <Link href="/register" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Regístrate aquí
        </Link>
      </div>
    </AuthCard>
  );
}