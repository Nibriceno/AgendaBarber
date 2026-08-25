import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

import { BarbersController } from './barbers.controller';
import { BarbersService } from './barbers.service';

describe('BarbersController', () => {
  let controller: BarbersController;

  const barbersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const currentUser: AuthUser = {
    id: 8,
    businessId: 27,
    businessSlug: 'barber-booking',
    role: UserRole.ADMIN,
    firstName: 'Admin',
    lastName: 'Test',
    phone: '+56911111111',
    email: 'admin@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new BarbersController(
      barbersService as unknown as BarbersService,
    );
  });

  const getHandlerRoles = (methodName: 'findAll' | 'findOne') => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BarbersController.prototype,
      methodName,
    );
    const handler = descriptor?.value as unknown;

    if (typeof handler !== 'function') {
      throw new Error(`Missing ${methodName} handler.`);
    }

    const roles = Reflect.getMetadata(ROLES_KEY, handler) as
      UserRole[] | undefined;

    return roles;
  };

  it('protects every endpoint with JWT and role guards', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      BarbersController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('allows only admin and receptionist on private GET endpoints', () => {
    expect(getHandlerRoles('findAll')).toEqual([
      UserRole.ADMIN,
      UserRole.RECEPTIONIST,
    ]);

    expect(getHandlerRoles('findOne')).toEqual([
      UserRole.ADMIN,
      UserRole.RECEPTIONIST,
    ]);
  });

  it('uses the authenticated tenant when listing barbers', async () => {
    barbersService.findAll.mockResolvedValue([]);

    await controller.findAll(currentUser);

    expect(barbersService.findAll).toHaveBeenCalledWith(currentUser.businessId);
  });

  it('uses the authenticated tenant when reading one barber', async () => {
    barbersService.findOne.mockResolvedValue({
      id: 41,
    });

    await controller.findOne(currentUser, 41);

    expect(barbersService.findOne).toHaveBeenCalledWith(
      currentUser.businessId,
      41,
    );
  });
});
