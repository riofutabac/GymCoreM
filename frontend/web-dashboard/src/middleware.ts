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
  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

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
    // Y el usuario intenta ir a /login o /register -> a su dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    // Y el usuario intenta ir al /dashboard genérico -> a su dashboard
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    
    // 🔒 MEJORA 3: Proteger ruta /pos - solo para managers y receptionists
    if (pathname === '/pos') {
      if (role !== 'manager' && role !== 'receptionist') {
        return NextResponse.redirect(new URL(`/${role}`, request.url));
      }
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
