import apiClient from "@/lib/api/client";

import type {
  ChangeClientPasswordInput,
  ClientAppointment,
  ClientProfile,
  MessageResponse,
  UpdateClientProfileInput,
} from "../types/client-account.types";

export async function getMyAppointments(): Promise<ClientAppointment[]> {
  const response = await apiClient.get<ClientAppointment[]>("/appointments/my");

  return response.data;
}

export async function cancelMyAppointment(
  appointmentId: number,
  reason: string,
): Promise<ClientAppointment> {
  const response = await apiClient.patch<ClientAppointment>(
    `/appointments/${appointmentId}/client-cancel`,
    { reason },
  );

  return response.data;
}

export async function getMyProfile(): Promise<ClientProfile> {
  const response = await apiClient.get<ClientProfile>("/users/me/profile");

  return response.data;
}

export async function updateMyProfile(
  input: UpdateClientProfileInput,
): Promise<ClientProfile> {
  const response = await apiClient.patch<ClientProfile>(
    "/users/me/profile",
    input,
  );

  return response.data;
}

export async function changeMyPassword(
  input: ChangeClientPasswordInput,
): Promise<MessageResponse> {
  const response = await apiClient.patch<MessageResponse>(
    "/users/me/password",
    input,
  );

  return response.data;
}
