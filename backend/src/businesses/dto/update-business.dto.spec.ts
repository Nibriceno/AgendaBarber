import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateBusinessDto } from './update-business.dto';

describe('UpdateBusinessDto tenant-owned fields', () => {
  const validationOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
  };

  it('accepts tenant-editable booking settings', async () => {
    const dto = plainToInstance(UpdateBusinessDto, {
      name: 'Agenda Barber',
      minimumAdvanceTime: 90,
      allowClientCancellation: false,
    });

    await expect(validate(dto, validationOptions)).resolves.toHaveLength(0);
  });

  it.each([
    ['slug', 'another-tenant'],
    ['status', 'SUSPENDED'],
  ])('rejects the platform-owned field %s', async (field, value) => {
    const dto = plainToInstance(UpdateBusinessDto, {
      [field]: value,
    });

    const errors = await validate(dto, validationOptions);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: field,
        }),
      ]),
    );
  });
});
