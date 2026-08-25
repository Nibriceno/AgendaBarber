import apiClient from "@/lib/api/client";

import type {
  AdminDashboardSummary,
} from "../types/admin-dashboard.types";

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response =
    await apiClient.get<AdminDashboardSummary>(
      "/dashboard/summary",
    );

  return response.data;
}
