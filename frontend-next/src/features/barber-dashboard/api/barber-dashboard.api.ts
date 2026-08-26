import apiClient from "@/lib/api/client";

import type {
  BarberAppointment,
  BarberDashboardData,
  BarberManageableStatus,
} from "../types/barber-dashboard.types";

export async function getBarberDashboard(
  date?: string,
): Promise<BarberDashboardData> {
  const response =
    await apiClient.get<BarberDashboardData>(
      "/appointments/barber/my",
      {
        params:
          date
            ? {
                date,
              }
            : undefined,
      },
    );

  return response.data;
}

export async function updateBarberAppointmentStatus(
  appointmentId: number,
  status: BarberManageableStatus,
): Promise<BarberAppointment> {
  const response =
    await apiClient.patch<BarberAppointment>(
      `/appointments/${appointmentId}/barber-status`,
      {
        status,
      },
    );

  return response.data;
}
