import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';

import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';
import type { PlatformAuthUser } from '../interfaces/platform-auth-user.interface';

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<{
      user?: PlatformAuthUser;
    }>();

    return Boolean(request.user && requiredRoles.includes(request.user.role));
  }
}
