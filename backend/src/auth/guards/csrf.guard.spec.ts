import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { CsrfGuard } from './csrf.guard';

function contextFor(method: string, cookie?: string, csrfHeader?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
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
});
