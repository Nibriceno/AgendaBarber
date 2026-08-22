import apiClient from "@/lib/api/client";

import type {
  BarberService,
  CreateBarberServiceInput,
  UpdateBarberServiceInput,
} from "../types/barber-service.types";

export async function getBarberServices(
  barberId: number,
): Promise<BarberService[]> {
  const response =
    await apiClient.get<BarberService[]>(
      `/barber-services/barber/${barberId}`,
    );

  return response.data;
}

export async function createBarberService(
  data: CreateBarberServiceInput,
): Promise<BarberService> {
  const response =
    await apiClient.post<BarberService>(
      "/barber-services",
      data,
    );

  return response.data;
}

export async function updateBarberService(
  barberServiceId: number,
  data: UpdateBarberServiceInput,
): Promise<BarberService> {
  const response =
    await apiClient.patch<BarberService>(
      `/barber-services/${barberServiceId}`,
      data,
    );

  return response.data;
}

export async function deleteBarberService(
  barberServiceId: number,
): Promise<void> {
  await apiClient.delete(
    `/barber-services/${barberServiceId}`,
  );
}