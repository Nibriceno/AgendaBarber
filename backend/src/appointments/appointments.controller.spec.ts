import { UserRole } from '@prisma/client';

import { AppointmentsController } from './appointments.controller';
import type { AppointmentsService } from './appointments.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('AppointmentsController client routes', () => {
  new AppointmentsController({} as AppointmentsService);

  const getRoles = (
    methodName: keyof AppointmentsController,
  ): UserRole[] | undefined => {
    const method: unknown = Object.getOwnPropertyDescriptor(
      AppointmentsController.prototype,
      methodName,
    )?.value;

    if (typeof method !== 'function') {
      throw new Error(`Método ${methodName} no encontrado.`);
    }

    return Reflect.getMetadata(ROLES_KEY, method) as UserRole[] | undefined;
  };

  it('restricts the personal list to clients', () => {
    expect(getRoles('findMyAppointments')).toEqual([UserRole.CLIENT]);
  });

  it('restricts client cancellation to clients', () => {
    expect(getRoles('clientCancel')).toEqual([UserRole.CLIENT]);
  });
});
