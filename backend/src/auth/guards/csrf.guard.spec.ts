import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { CsrfGuard } from './csrf.guard';

function contextFor(
  method: string,
  cookie?: string,
  csrfHeader?: string,
  path = '/appointments',
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(csrfHeader ? { 'x-csrf-token': csrfHeader } : {}),
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('permite métodos de solo lectura', () => {
    expect(
      guard.canActivate(contextFor('GET', 'ab_access=token')),
    ).toBe(true);
  });

  it('permite peticiones públicas sin cookies de autenticación', () => {
    expect(guard.canActivate(contextFor('POST'))).toBe(true);
  });

  it('exige coincidencia entre cookie y cabecera para mutaciones autenticadas', () => {
    expect(
      guard.canActivate(
        contextFor(
          'PATCH',
          'ab_access=jwt; ab_csrf=csrf-secreto',
          'csrf-secreto',
        ),
      ),
    ).toBe(true);

    expect(() =>
      guard.canActivate(
        contextFor('PATCH', 'ab_access=jwt; ab_csrf=csrf-secreto', 'otro'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('usa el CSRF de plataforma aunque también exista una sesión tenant', () => {
    const cookies = [
      'ab_access=tenant-jwt',
      'ab_csrf=tenant-csrf',
      'ab_platform_access=platform-jwt',
      'ab_platform_csrf=platform-csrf',
    ].join('; ');

    expect(
      guard.canActivate(
        contextFor(
          'POST',
          cookies,
          'platform-csrf',
          '/platform/businesses',
        ),
      ),
    ).toBe(true);

    expect(() =>
      guard.canActivate(
        contextFor(
          'POST',
          cookies,
          'tenant-csrf',
          '/platform/businesses',
        ),
      ),
    ).toThrow(ForbiddenException);
  });
});
