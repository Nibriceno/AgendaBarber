export type ScheduleException = {
  id: number;
  barberId: number;

  date: string;

  isDayOff: boolean;

  startMinute:
    | number
    | null;

  endMinute:
    | number
    | null;

  reason:
    | string
    | null;

  barber?: {
    id: number;
    displayName: string;
  };
};

export type CreateScheduleExceptionInput = {
  barberId: number;

  date: string;

  isDayOff: boolean;

  startMinute?: number;
  endMinute?: number;

  reason?: string;
};

export type UpdateScheduleExceptionInput =
  Partial<CreateScheduleExceptionInput>;