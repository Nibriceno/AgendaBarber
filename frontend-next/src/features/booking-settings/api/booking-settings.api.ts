import apiClient from "@/lib/api/client";

import type {
  BusinessBookingSettings,
  UpdateBusinessBookingSettings,
} from "../types/booking-settings.types";

export async function getBookingSettings(): Promise<BusinessBookingSettings> {
  const response = await apiClient.get<BusinessBookingSettings>(
    "/businesses/me",
  );

  return response.data;
}

export async function updateBookingSettings(
  businessId: number,
  input: UpdateBusinessBookingSettings,
): Promise<BusinessBookingSettings> {
  const response = await apiClient.patch<BusinessBookingSettings>(
    `/businesses/${businessId}`,
    input,
  );

  return response.data;
}
