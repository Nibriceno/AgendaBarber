import apiClient from "@/lib/api/client";

import type {
  CreateScheduleExceptionInput,
  ScheduleException,
  UpdateScheduleExceptionInput,
} from "../types/schedule-exception.types";

export async function getBarberScheduleExceptions(
  barberId: number,
): Promise<ScheduleException[]> {
  const response =
    await apiClient.get<
      ScheduleException[]
    >(
      `/schedule-exceptions/barber/${barberId}`,
    );

  return response.data;
}

export async function createScheduleException(
  input: CreateScheduleExceptionInput,
): Promise<ScheduleException> {
  const response =
    await apiClient.post<
      ScheduleException
    >(
      "/schedule-exceptions",
      input,
    );

  return response.data;
}

export async function updateScheduleException(
  id: number,
  input: UpdateScheduleExceptionInput,
): Promise<ScheduleException> {
  const response =
    await apiClient.patch<
      ScheduleException
    >(
      `/schedule-exceptions/${id}`,
      input,
    );

  return response.data;
}

export async function deleteScheduleException(
  id: number,
): Promise<void> {
  await apiClient.delete(
    `/schedule-exceptions/${id}`,
  );
}