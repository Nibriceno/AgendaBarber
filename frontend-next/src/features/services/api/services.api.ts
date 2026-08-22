import apiClient from "@/lib/api/client";

import type {
  CreateServiceInput,
  Service,
  UpdateServiceInput,
} from "../types/service.types";

export async function getServices(): Promise<Service[]> {
  const response =
    await apiClient.get<Service[]>("/services");

  return response.data;
}

export async function createService(
  data: CreateServiceInput,
): Promise<Service> {
  const response =
    await apiClient.post<Service>(
      "/services",
      data,
    );

  return response.data;
}

export async function updateService(
  serviceId: number,
  data: UpdateServiceInput,
): Promise<Service> {
  const response =
    await apiClient.patch<Service>(
      `/services/${serviceId}`,
      data,
    );

  return response.data;
}

export async function deleteService(
  serviceId: number,
): Promise<void> {
  await apiClient.delete(
    `/services/${serviceId}`,
  );
}