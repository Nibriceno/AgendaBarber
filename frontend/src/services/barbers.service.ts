import { api } from '../api/axios';

export type Barber = {
  id: number;
  businessId: number;
  userId: number | null;
  displayName: string;
  specialty: string | null;
  biography: string | null;
  photoUrl: string | null;
  calendarColor: string | null;
  commissionPercentage: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type CreateBarberPayload = {
  businessId: number;
  userId?: number;
  displayName: string;
  specialty?: string;
  biography?: string;
  photoUrl?: string;
  calendarColor?: string;
  commissionPercentage?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateBarberPayload =
  Partial<CreateBarberPayload>;

export async function getBarbers() {
  const response =
    await api.get<Barber[]>('/barbers');

  return response.data;
}

export async function createBarber(
  payload: CreateBarberPayload,
) {
  const response =
    await api.post<Barber>(
      '/barbers',
      payload,
    );

  return response.data;
}

export async function updateBarber(
  id: number,
  payload: UpdateBarberPayload,
) {
  const response =
    await api.patch<Barber>(
      `/barbers/${id}`,
      payload,
    );

  return response.data;
}

export async function deleteBarber(
  id: number,
) {
  const response =
    await api.delete<Barber>(
      `/barbers/${id}`,
    );

  return response.data;
}