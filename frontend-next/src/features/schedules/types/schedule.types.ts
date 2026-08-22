export const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type DayOfWeek =
  (typeof DAY_ORDER)[number];

export const DAY_LABELS: Record<
  DayOfWeek,
  string
> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export type Schedule = {
  id: number;
  barberId: number;
  dayOfWeek: DayOfWeek;

  startMinute: number;
  endMinute: number;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type CreateScheduleInput = {
  barberId: number;
  dayOfWeek: DayOfWeek;

  startMinute: number;
  endMinute: number;

  isActive?: boolean;
};

export type UpdateScheduleInput = Partial<CreateScheduleInput>;

export type ScheduleRangeDraft = {
  key: string;

  scheduleId:
    | number
    | null;

  startTime: string;
  endTime: string;
};

export type ScheduleDayDraft = {
  dayOfWeek: DayOfWeek;

  enabled: boolean;

  ranges: ScheduleRangeDraft[];
};