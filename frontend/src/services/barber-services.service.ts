import { api } from '../api/axios';

export type BarberService = {
  id: number;
  barberId: number;
  serviceId: number;

  customPrice: string | null;
  customDuration: number | null;

  isActive: boolean;

  service?: {
    id: number;
    name: string;
    price: string;
    durationMinutes: number;
  };
};

export type CreateBarberServicePayload = {
  barberId: number;
  serviceId: number;
  customPrice?: number;
  customDuration?: number;
  isActive?: boolean;
};

export type UpdateBarberServicePayload = {
  customPrice?: number;
  customDuration?: number;
  isActive?: boolean;
};

export async function getBarberServices() {
  const response =
    await api.get<BarberService[]>(
      '/barber-services',
    );

  return response.data;
}

export async function createBarberService(
  payload: CreateBarberServicePayload,
) {
  const response =
    await api.post<BarberService>(
      '/barber-services',
      payload,
    );

  return response.data;
}

export async function updateBarberService(
  id: number,
  payload: UpdateBarberServicePayload,
) {
  const response =
    await api.patch<BarberService>(
      `/barber-services/${id}`,
      payload,
    );

  return response.data;
}

export async function deleteBarberService(
  id: number,
) {
  const response =
    await api.delete(
      `/barber-services/${id}`,
    );

  return response.data;
}