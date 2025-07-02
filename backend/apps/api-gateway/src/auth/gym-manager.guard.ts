import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class GymManagerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as any;
    const user = req.user as any;
    
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const role = user.app_metadata?.role;
    
    // Los OWNER tienen acceso completo
    if (role === 'OWNER') {
      return true;
    }
    
    // Los MANAGER solo pueden acceder a datos de su gimnasio
    if (role === 'MANAGER' && user.app_metadata?.gymId) {
      req.gymId = user.app_metadata.gymId;
      return true;
    }
    
    throw new ForbiddenException(
      'Acceso denegado: se requiere rol MANAGER o OWNER con gymId válido'
    );
  }
}
