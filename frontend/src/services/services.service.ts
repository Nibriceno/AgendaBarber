import { api } from '../api/axios';

export type Service = {
  id: number;
  businessId: number;
  categoryId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  price: string;
  displayOrder: number;
  isActive: boolean;
};

export type CreateServicePayload = {
  businessId: number;
  categoryId: number;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  price: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateServicePayload =
  Partial<CreateServicePayload>;

export async function getServices() {
  const response =
    await api.get<Service[]>(
      '/services',
    );

  return response.data;
}

export async function createService(
  payload: CreateServicePayload,
) {
  const response =
    await api.post<Service>(
      '/services',
      payload,
    );

  return response.data;
}

export async function updateService(
  id: number,
  payload: UpdateServicePayload,
) {
  const response =
    await api.patch<Service>(
      `/services/${id}`,
      payload,
    );

  return response.data;
}

export async function deleteService(
  id: number,
) {
  const response =
    await api.delete<Service>(
      `/services/${id}`,
    );

  return response.data;
}