export function minutesToTime(
  minutes: number,
): string {
  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  return `${String(
    hours,
  ).padStart(
    2,
    "0",
  )}:${String(
    remainingMinutes,
  ).padStart(
    2,
    "0",
  )}`;
}

export function timeToMinutes(
  time: string,
): number | null {
  const match =
    /^(\d{2}):(\d{2})$/.exec(
      time,
    );

  if (!match) {
    return null;
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
}