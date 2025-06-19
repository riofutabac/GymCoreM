import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt_token');
  const { pathname } = request.nextUrl;

  // Rutas públicas que cualquiera puede visitar
  const publicRoutes = ['/login', '/register', '/'];

  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Si no hay token y el usuario intenta acceder a una ruta protegida
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay un token y el usuario intenta acceder a /login o /register
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
