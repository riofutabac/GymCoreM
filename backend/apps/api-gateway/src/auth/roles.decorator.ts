import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  TRAINER = 'TRAINER',
  MEMBER = 'MEMBER',
}

export const Roles = (...roles: (Role | string)[]) => SetMetadata(ROLES_KEY, roles);
