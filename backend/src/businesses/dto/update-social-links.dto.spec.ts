import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateSocialLinksDto } from './update-social-links.dto';

describe('UpdateSocialLinksDto', () => {
  it('acepta enlaces http/https y convierte campos vacíos en null', async () => {
    const dto = plainToInstance(UpdateSocialLinksDto, {
      instagramUrl: '  https://instagram.com/agenda-barber  ',
      twitterUrl: '',
      facebookUrl: null,
      whatsappUrl: 'https://wa.me/56912345678',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.instagramUrl).toBe('https://instagram.com/agenda-barber');
    expect(dto.twitterUrl).toBeNull();
    expect(dto.facebookUrl).toBeNull();
  });

  it('rechaza protocolos que podrían ejecutar código en el navegador', async () => {
    const dto = plainToInstance(UpdateSocialLinksDto, {
      instagramUrl: 'javascript:alert(1)',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'instagramUrl')).toBe(true);
  });
});
