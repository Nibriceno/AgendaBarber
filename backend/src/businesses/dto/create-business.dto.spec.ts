import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateBusinessDto } from './create-business.dto';

describe('CreateBusinessDto booking policies', () => {
  const baseBusiness = {
    name: 'AgendaBarber',
    slug: 'agenda-barber',
  };

  it('acepta ventanas de hasta catorce días y limpia el texto', async () => {
    const dto = plainToInstance(CreateBusinessDto, {
      ...baseBusiness,
      cancellationMinimumMinutes: 20_160,
      rescheduleMinimumMinutes: 120,
      allowClientCancellation: true,
      allowClientRescheduling: false,
      cancellationPolicy: '  Contáctanos para casos especiales.  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.cancellationPolicy).toBe('Contáctanos para casos especiales.');
  });

  it('rechaza ventanas mayores a catorce días', async () => {
    const dto = plainToInstance(CreateBusinessDto, {
      ...baseBusiness,
      cancellationMinimumMinutes: 20_161,
    });

    const errors = await validate(dto);
    expect(
      errors.some((error) => error.property === 'cancellationMinimumMinutes'),
    ).toBe(true);
  });
});
