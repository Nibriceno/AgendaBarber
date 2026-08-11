import { api } from '../api/axios';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type Schedule = {
  id: number;
  businessId: number;
  barberId: number;
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
  isActive: boolean;

  barber?: {
    id: number;
    displayName: string;
  };
};

export type CreateSchedulePayload = {
  barberId: number;
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
  isActive?: boolean;
};

export type UpdateSchedulePayload =
  Partial<CreateSchedulePayload>;

export async function getSchedules() {
  const response =
    await api.get<Schedule[]>(
      '/schedules',
    );

  return response.data;
}

export async function createSchedule(
  payload: CreateSchedulePayload,
) {
  const response =
    await api.post<Schedule>(
      '/schedules',
      payload,
    );

  return response.data;
}

export async function updateSchedule(
  id: number,
  payload: UpdateSchedulePayload,
) {
  const response =
    await api.patch<Schedule>(
      `/schedules/${id}`,
      payload,
    );

  return response.data;
}

export async function deleteSchedule(
  id: number,
) {
  const response =
    await api.delete<Schedule>(
      `/schedules/${id}`,
    );

  return response.data;
}