import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string;
    let token: string | undefined;

    // Prioridad 1: Header Authorization
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      token = authHeader.split(' ')[1];
    }

    // Prioridad 2: Cookie HTTP-Only (fallback seguro)
    if (!token && request.cookies?.jwt_token) {
      token = request.cookies.jwt_token as string;
    }

    if (!token) {
      throw new UnauthorizedException('JWT not provided.');
    }

    try {
      const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
      if (!secret) {
        throw new UnauthorizedException('JWT secret not configured.');
      }

      const decoded = verify(token, secret);
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}