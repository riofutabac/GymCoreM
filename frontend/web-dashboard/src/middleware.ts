import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt_token')?.value;
  const role = request.cookies.get('user_role')?.value;
  const { pathname } = request.nextUrl;

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
  
  // 1) Permitir siempre la ruta genérica de perfil para usuarios autenticados
  const isProfileRoute = pathname === '/profile';

  // Si no hay token y el usuario intenta acceder a una ruta protegida
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 🔒 MEJORA 2: Si hay token pero el rol no es válido, redirigir al login
  if (token && !isValidRole && !isPublicRoute) {
    // Eliminar cookies inválidas
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('jwt_token');
    response.cookies.delete('user_role');
    response.cookies.delete('user_name');
    response.cookies.delete('user_email');
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
