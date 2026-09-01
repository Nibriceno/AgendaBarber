import apiClient from "@/lib/api/client";

import type {
  AdminAppointmentDetail,
  AdminAgendaQuery,
  AdminAgendaResponse,
  CreateManualAppointmentInput,
} from "../types/admin-agenda.types";

export async function getAdminAgenda(
  query: AdminAgendaQuery,
  signal?: AbortSignal,
): Promise<AdminAgendaResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize ?? 20),
    date: query.date,
  });

  if (query.status) params.set("status", query.status);
  if (query.barberId) params.set("barberId", String(query.barberId));
  if (query.search) params.set("search", query.search);

  const response = await apiClient.get<AdminAgendaResponse>(
    `/appointments/admin-page?${params.toString()}`,
    { signal },
  );

  return response.data;
}

export async function getAdminAppointment(
  appointmentId: number,
  signal?: AbortSignal,
): Promise<AdminAppointmentDetail> {
  const response = await apiClient.get<AdminAppointmentDetail>(
    `/appointments/${appointmentId}`,
    { signal },
  );

  return response.data;
}

export async function createManualAppointment(
  input: CreateManualAppointmentInput,
): Promise<AdminAppointmentDetail> {
  const response = await apiClient.post<AdminAppointmentDetail>(
    "/appointments/manual",
    input,
  );

  return response.data;
}

export async function updateAdminAppointmentStatus(
  appointmentId: number,
  status: AdminAppointmentDetail["status"],
): Promise<AdminAppointmentDetail> {
  const response = await apiClient.patch<AdminAppointmentDetail>(
    `/appointments/${appointmentId}`,
    { status },
  );

  return response.data;
}

export async function rescheduleAdminAppointment(
  appointmentId: number,
  startAt: string,
): Promise<AdminAppointmentDetail> {
  const response = await apiClient.patch<AdminAppointmentDetail>(
    `/appointments/${appointmentId}/reschedule`,
    { startAt },
  );

  return response.data;
}

export async function cancelAdminAppointment(
  appointmentId: number,
  reason: string,
): Promise<AdminAppointmentDetail> {
  const response = await apiClient.patch<AdminAppointmentDetail>(
    `/appointments/${appointmentId}/cancel`,
    { reason },
  );

  return response.data;
}
