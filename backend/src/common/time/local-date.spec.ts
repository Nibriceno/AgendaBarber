import {
  addDaysToDateKey,
  getLocalDateKey,
  isValidDateKey,
  localDateMinuteToUtc,
} from './local-date';

describe('local date utilities', () => {
  it('calcula la fecha local en la zona horaria del negocio', () => {
    expect(
      getLocalDateKey(new Date('2026-08-25T02:00:00.000Z'), 'America/Santiago'),
    ).toBe('2026-08-24');
  });

  it('convierte la medianoche local a UTC', () => {
    expect(
      localDateMinuteToUtc('2026-08-25', 0, 'America/Santiago').toISOString(),
    ).toBe('2026-08-25T04:00:00.000Z');
  });

  it('suma días sin depender de la zona horaria del servidor', () => {
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('rechaza fechas inexistentes', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
  });
});
