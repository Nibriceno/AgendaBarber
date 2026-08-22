import apiClient from "@/lib/api/client";

import type {
  Barber,
  CreateBarberInput,
  UpdateBarberInput,
} from "../types/barber.types";

export async function getBarbers(): Promise<Barber[]> {
  const response =
    await apiClient.get<Barber[]>("/barbers");

  return response.data;
}

export async function getBarber(
  barberId: number,
): Promise<Barber> {
  const response =
    await apiClient.get<Barber>(
      `/barbers/${barberId}`,
    );

  return response.data;
}

export async function createBarber(
  data: CreateBarberInput,
): Promise<Barber> {
  const response =
    await apiClient.post<Barber>(
      "/barbers",
      data,
    );

  return response.data;
}

export async function updateBarber(
  barberId: number,
  data: UpdateBarberInput,
): Promise<Barber> {
  const response =
    await apiClient.patch<Barber>(
      `/barbers/${barberId}`,
      data,
    );

  return response.data;
}

export async function deleteBarber(
  barberId: number,
): Promise<void> {
  await apiClient.delete(
    `/barbers/${barberId}`,
  );
}