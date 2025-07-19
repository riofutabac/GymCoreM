"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Componente para manejar redirecciones de tokens de recuperación
function RecoveryTokenHandler() {
  const router = useRouter();
  
  useEffect(() => {
    // Verificar si hay un token de recuperación en la URL
    const hash = window.location.hash;
    
    if (hash && hash.includes('type=recovery')) {
      console.log('Token de recuperación detectado, redirigiendo...');
      // Preservar el hash completo para la página de restablecimiento
      router.push(`/reset-password${window.location.hash}`);
    }
  }, [router]);
  
  return null; // Este componente no renderiza nada
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Componente para detectar y redirigir tokens de recuperación */}
      <RecoveryTokenHandler />
      <header className="container mx-auto flex justify-between items-center p-6">
        <div className="text-2xl font-bold text-slate-800">GymCore</div>
        <nav className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Registrarse</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow flex items-center">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Gestión de Gimnasios, <br />
            <span className="text-primary">Simple e Inteligente</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Controla tus gimnasios, miembros, pagos y acceso biométrico con nuestra plataforma todo en uno.  Diseñada para optimizar la administración de gimnasios pequeños y medianos. 
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button size="lg" asChild>
              <Link href="/register">Comenzar Ahora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Ver Características</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="container mx-auto py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} Gymcore. Todos los derechos reservados.
      </footer>
    </div>
  );
}