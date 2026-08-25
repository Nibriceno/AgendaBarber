import {
  DAY_ORDER,
} from "../types/schedule.types";

import type {
  DayOfWeek,
} from "../types/schedule.types";

const DEFAULT_TIME_ZONE =
  "America/Santiago";

const MONTH_FORMATTER =
  new Intl.DateTimeFormat(
    "es-CL",
    {
      month: "long",
      timeZone: "UTC",
    },
  );

const DAY_MONTH_FORMATTER =
  new Intl.DateTimeFormat(
    "es-CL",
    {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    },
  );

type WeekReference = {
  rangeLabel: string;
  dateLabels: Record<
    DayOfWeek,
    string
  >;
  todayDayOfWeek: DayOfWeek;
};

function getLocalCalendarDate(
  timeZone: string,
): Date {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone,
      },
    ).formatToParts(
      new Date(),
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    );

  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) -
        1,
      Number(values.day),
    ),
  );
}

function addDays(
  date: Date,
  days: number,
): Date {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() +
      days,
  );

  return result;
}

function formatWeekRange(
  start: Date,
  end: Date,
): string {
  const startDay =
    start.getUTCDate();

  const endDay =
    end.getUTCDate();

  const startMonth =
    start.getUTCMonth();

  const endMonth =
    end.getUTCMonth();

  const startYear =
    start.getUTCFullYear();

  const endYear =
    end.getUTCFullYear();

  if (
    startYear === endYear &&
    startMonth === endMonth
  ) {
    return `${startDay}–${endDay} de ${MONTH_FORMATTER.format(
      start,
    )} de ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startDay} de ${MONTH_FORMATTER.format(
      start,
    )} – ${endDay} de ${MONTH_FORMATTER.format(
      end,
    )} de ${startYear}`;
  }

  return `${DAY_MONTH_FORMATTER.format(
    start,
  )} de ${startYear} – ${DAY_MONTH_FORMATTER.format(
    end,
  )} de ${endYear}`;
}

export function buildCurrentWeekReference(
  timeZone =
    DEFAULT_TIME_ZONE,
): WeekReference {
  const today =
    getLocalCalendarDate(
      timeZone,
    );

  const mondayOffset =
    (today.getUTCDay() +
      6) %
    7;

  const monday = addDays(
    today,
    -mondayOffset,
  );

  const dates = DAY_ORDER.map(
    (_, index) =>
      addDays(
        monday,
        index,
      ),
  );

  const dateLabels =
    Object.fromEntries(
      DAY_ORDER.map(
        (
          dayOfWeek,
          index,
        ) => [
          dayOfWeek,
          DAY_MONTH_FORMATTER.format(
            dates[index],
          ),
        ],
      ),
    ) as Record<
      DayOfWeek,
      string
    >;

  return {
    rangeLabel:
      formatWeekRange(
        dates[0],
        dates[
          dates.length - 1
        ],
      ),
    dateLabels,
    todayDayOfWeek:
      DAY_ORDER[
        mondayOffset
      ],
  };
}
