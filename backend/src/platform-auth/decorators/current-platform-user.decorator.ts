import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { PlatformAuthUser } from '../interfaces/platform-auth-user.interface';

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{
      user?: PlatformAuthUser;
    }>();

    return request.user;
  },
);
