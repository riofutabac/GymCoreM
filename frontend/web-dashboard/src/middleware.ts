import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Función para decodificar JWT en el middleware
function decodeJWT(token: string): any | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Use Buffer for Node.js environment (middleware runs server-side)
    const decodedPayload = Buffer.from(paddedPayload, 'base64').toString('utf-8');
    const parsedPayload = JSON.parse(decodedPayload);
    
    return parsedPayload;
  } catch (error) {
    console.error('Error decoding JWT in middleware:', error);
    return null;
  }
}

// Función para extraer el rol del JWT
function getRoleFromJWT(token: string): string | null {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return null;
  }
  
  // Extract role from app_metadata or user_metadata or direct property
  const role = payload.app_metadata?.role || 
               payload.user_metadata?.role || 
               payload.role || 
               'member';
  
  return role.toLowerCase();
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt_token')?.value;
  const { pathname } = request.nextUrl;

  // Extract role from JWT token instead of separate cookie
  const role = token ? getRoleFromJWT(token) : null;

  // 🔒 MEJORA 1: Validar que el rol sea uno de los permitidos
  const validRoles = ['owner', 'manager', 'receptionist', 'member'];
  const isValidRole = role && validRoles.includes(role);

  // Rutas públicas que cualquiera puede visitar
  const publicRoutes = ['/login', '/register', '/', '/forgot-password'];
  // También permitir rutas de autenticación como confirmación y reset
  const isPublicRoute = publicRoutes.includes(pathname) || 
                       pathname.startsWith('/confirm') || 
                       pathname.startsWith('/reset-password');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  
  // Routes that should be handled by React components (don't redirect immediately)
  const isDashboardRoute = pathname.startsWith('/owner') || 
                          pathname.startsWith('/manager') || 
                          pathname.startsWith('/member') || 
                          pathname.startsWith('/receptionist') || 
                          pathname === '/profile';
  
  // 1) Permitir siempre la ruta genérica de perfil para usuarios autenticados
  const isProfileRoute = pathname === '/profile';

  // Si no hay token y el usuario intenta acceder a una ruta protegida
  // Pero permitir que las rutas de dashboard sean manejadas por React para mejor UX
  if (!token && !isPublicRoute && !isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For dashboard routes without token, let React handle the authentication
  if (!token && isDashboardRoute) {
    return NextResponse.next();
  }

  // 🔒 MEJORA 2: Si hay token pero el rol no es válido, redirigir al login
  if (token && !isValidRole && !isPublicRoute) {
    // Eliminar cookie JWT inválida
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('jwt_token');
    return response;
  }

  // Si hay token y rol válido...
  if (token && isValidRole) {
    // Permitir acceso a la ruta /profile para todos los roles autenticados
    if (isProfileRoute) {
      return NextResponse.next();
    }
    // Y el usuario intenta ir a /login o /register -> a su dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    // Y el usuario intenta ir al /dashboard genérico -> a su dashboard
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    
    // 🔒 PROTECCIÓN ESTRICTA DE RUTAS POR ROL
    
    // Verificar acceso a rutas de otros roles (bloqueo directo)
    if (pathname.startsWith('/owner') && role !== 'owner') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/manager') && role !== 'manager') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/receptionist') && role !== 'receptionist') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/member') && role !== 'member') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    
    // OWNER: Solo puede acceder a rutas /owner y /profile
    if (role === 'owner') {
      if (!pathname.startsWith('/owner') && pathname !== '/' && !isPublicRoute && pathname !== '/profile') {
        return NextResponse.redirect(new URL('/owner', request.url));
      }
    }
    
    // MANAGER: Solo puede acceder a rutas /manager, /pos y /profile
    if (role === 'manager') {
      if (!pathname.startsWith('/manager') && pathname !== '/pos' && pathname !== '/' && !isPublicRoute && pathname !== '/profile') {
        return NextResponse.redirect(new URL('/manager', request.url));
      }
    }
    
    // RECEPTIONIST: Solo puede acceder a rutas /receptionist, /pos y /profile
    if (role === 'receptionist') {
      if (!pathname.startsWith('/receptionist') && pathname !== '/pos' && pathname !== '/' && !isPublicRoute && pathname !== '/profile') {
        return NextResponse.redirect(new URL('/receptionist', request.url));
      }
    }
    
    // MEMBER: Solo puede acceder a rutas /member y /profile
    if (role === 'member') {
      if (!pathname.startsWith('/member') && pathname !== '/' && !isPublicRoute && pathname !== '/profile') {
        return NextResponse.redirect(new URL('/member', request.url));
      }
    }
    
    // 🔒 PROTEGER RUTA /pos - solo para managers, receptionists y owners
    if (pathname === '/pos' && role !== 'manager' && role !== 'receptionist' && role !== 'owner') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
  }

  return NextResponse.next();
}

// Configuración del matcher para aplicar el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
