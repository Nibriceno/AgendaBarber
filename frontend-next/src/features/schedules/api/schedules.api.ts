import apiClient from "@/lib/api/client";

import type {
  CreateScheduleInput,
  Schedule,
  UpdateScheduleInput,
} from "../types/schedule.types";

export async function getBarberSchedules(
  barberId: number,
): Promise<Schedule[]> {
  const response =
    await apiClient.get<Schedule[]>(
      `/schedules/barber/${barberId}`,
    );

  return response.data;
}

export async function createSchedule(
  input: CreateScheduleInput,
): Promise<Schedule> {
  const response =
    await apiClient.post<Schedule>(
      "/schedules",
      input,
    );

  return response.data;
}

export async function updateSchedule(
  id: number,
  input: UpdateScheduleInput,
): Promise<Schedule> {
  const response =
    await apiClient.patch<Schedule>(
      `/schedules/${id}`,
      input,
    );

  return response.data;
}

export async function deactivateSchedule(
  id: number,
): Promise<Schedule> {
  return updateSchedule(
    id,
    {
      isActive: false,
    },
  );
}