import apiClient from "@/lib/api/client";

import type {
  ChangeStaffPasswordInput,
  CreateStaffInput,
  StaffMember,
  UpdateStaffInput,
  UpdateStaffStatusInput,
} from "../types/staff.types";

export async function getStaff(): Promise<
  StaffMember[]
> {
  const response =
    await apiClient.get<StaffMember[]>(
      "/staff",
    );

  return response.data;
}

export async function createBarberStaff(
  input: CreateStaffInput,
): Promise<StaffMember> {
  const response =
    await apiClient.post<StaffMember>(
      "/staff/barbers",
      input,
    );

  return response.data;
}

export async function createReceptionistStaff(
  input: CreateStaffInput,
): Promise<StaffMember> {
  const response =
    await apiClient.post<StaffMember>(
      "/staff/receptionists",
      input,
    );

  return response.data;
}

export async function updateStaff(
  id: number,
  input: UpdateStaffInput,
): Promise<StaffMember> {
  const response =
    await apiClient.patch<StaffMember>(
      `/staff/${id}`,
      input,
    );

  return response.data;
}

export async function updateStaffStatus(
  id: number,
  input: UpdateStaffStatusInput,
): Promise<StaffMember> {
  const response =
    await apiClient.patch<StaffMember>(
      `/staff/${id}/status`,
      input,
    );

  return response.data;
}

export async function changeStaffPassword(
  id: number,
  input: ChangeStaffPasswordInput,
): Promise<StaffMember> {
  const response =
    await apiClient.patch<StaffMember>(
      `/staff/${id}/password`,
      input,
    );

  return response.data;
}

export async function deleteStaff(
  id: number,
): Promise<StaffMember> {
  const response =
    await apiClient.delete<StaffMember>(
      `/staff/${id}`,
    );

  return response.data;
}