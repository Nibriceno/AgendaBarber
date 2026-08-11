import { api } from '../api/axios';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type Appointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  totalPrice: string;

  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  };

  barber: {
    id: number;
    displayName: string;
  };

  services: {
    id: number;
    serviceName: string;
  }[];
};

export async function getAppointments() {
  const response =
    await api.get<Appointment[]>(
      '/appointments',
    );

  return response.data;
}

export type UpdateAppointmentPayload = {
  status?: AppointmentStatus;
  internalNotes?: string;
};

export async function updateAppointment(
  id: number,
  payload: UpdateAppointmentPayload,
) {
  const response =
    await api.patch<Appointment>(
      `/appointments/${id}`,
      payload,
    );

  return response.data;
}

export async function cancelAppointment(
  id: number,
) {
  const response =
    await api.delete<Appointment>(
      `/appointments/${id}`,
    );

  return response.data;
}
export type RescheduleAppointmentPayload = {
  startAt: string;
};

export async function rescheduleAppointment(
  id: number,
  payload: RescheduleAppointmentPayload,
) {
  const response = await api.patch<Appointment>(
    `/appointments/${id}/reschedule`,
    payload,
  );

  return response.data;
}

