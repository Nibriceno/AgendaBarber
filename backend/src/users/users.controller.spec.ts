import { UserRole } from '@prisma/client';

import { UsersController } from './users.controller';
import type { UsersService } from './users.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('UsersController client self-service routes', () => {
  new UsersController({} as UsersService);

  const getRoles = (
    methodName: keyof UsersController,
  ): UserRole[] | undefined => {
    const method: unknown = Object.getOwnPropertyDescriptor(
      UsersController.prototype,
      methodName,
    )?.value;

    if (typeof method !== 'function') {
      throw new Error(`Método ${methodName} no encontrado.`);
    }

    return Reflect.getMetadata(ROLES_KEY, method) as UserRole[] | undefined;
  };

  it.each(['getMyProfile', 'updateMyProfile', 'changeMyPassword'] as const)(
    'restricts %s to clients',
    (methodName) => {
      expect(getRoles(methodName)).toEqual([UserRole.CLIENT]);
    },
  );
});
