export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date: LocalDateParts): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(
    date.day,
  ).padStart(2, '0')}`;
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function getLocalDateParts(
  date: Date,
  timezone: string,
): LocalDateParts {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function getLocalDateKey(date: Date, timezone: string): string {
  return toDateKey(getLocalDateParts(date, timezone));
}

export function addDaysToDateKey(date: string, days: number): string {
  if (!isValidDateKey(date)) {
    throw new RangeError('La fecha local tiene un formato inválido.');
  }

  const [year, month, day] = date.split('-').map(Number);

  const result = new Date(Date.UTC(year, month - 1, day + days));

  return toDateKey({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  });
}

export function localDateMinuteToUtc(
  date: string,
  minuteOfDay: number,
  timezone: string,
): Date {
  if (!isValidDateKey(date)) {
    throw new RangeError('La fecha local tiene un formato inválido.');
  }

  const [year, month, day] = date.split('-').map(Number);

  const normalizedDate = new Date(
    Date.UTC(year, month - 1, day, 0, minuteOfDay),
  );

  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(normalizedDate)
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  const offset = asUtc - normalizedDate.getTime();

  return new Date(normalizedDate.getTime() - offset);
}
