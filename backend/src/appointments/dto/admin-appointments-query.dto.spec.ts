import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

import { AdminAppointmentsQueryDto } from './admin-appointments-query.dto';

describe('AdminAppointmentsQueryDto', () => {
  it('transforma y acepta filtros administrativos válidos', async () => {
    const dto = plainToInstance(AdminAppointmentsQueryDto, {
      page: '2',
      pageSize: '20',
      date: '2026-08-26',
      status: AppointmentStatus.CONFIRMED,
      barberId: '7',
      search: '  Ana Pérez  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(20);
    expect(dto.barberId).toBe(7);
    expect(dto.search).toBe('Ana Pérez');
  });

  it('rechaza tamaños de página abusivos y estados desconocidos', async () => {
    const dto = plainToInstance(AdminAppointmentsQueryDto, {
      pageSize: '500',
      status: 'UNKNOWN',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'pageSize')).toBe(true);
    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });
});
