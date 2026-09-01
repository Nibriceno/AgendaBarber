import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AcceptBusinessInvitationDto } from './accept-business-invitation.dto';
import { CreatePlatformBusinessDto } from './create-platform-business.dto';
import { ListPlatformBusinessesQueryDto } from './list-platform-businesses-query.dto';

describe('Platform businesses DTOs', () => {
  it('validates and normalizes the initial admin invitation', async () => {
    const dto = plainToInstance(CreatePlatformBusinessDto, {
      business: { name: 'Barber Pro', slug: 'barber-pro' },
      admin: {
        firstName: ' Ana ',
        lastName: ' Díaz ',
        phone: '+56911112222',
        email: ' ADMIN@EXAMPLE.COM ',
      },
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.admin.email).toBe('admin@example.com');
    expect(dto.admin.firstName).toBe('Ana');
  });

  it('caps page size and rejects weak invitation passwords', async () => {
    const query = plainToInstance(ListPlatformBusinessesQueryDto, {
      page: '1',
      pageSize: '101',
    });
    const invite = plainToInstance(AcceptBusinessInvitationDto, {
      token: 'token',
      password: 'password',
    });

    await expect(validate(query)).resolves.not.toHaveLength(0);
    await expect(validate(invite)).resolves.not.toHaveLength(0);
  });
});
