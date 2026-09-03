import platformClient from "@/lib/api/platform-client";

import type { PlanRequestStatus, PlatformPlanRequest, PlatformPlanRequestsResponse } from "../types/platform-plan-request.types";

export async function getPlatformPlanRequests(input: { page: number; pageSize?: number; search?: string; status?: PlanRequestStatus | "" }) {
  const response = await platformClient.get<PlatformPlanRequestsResponse>("/platform/plan-requests", { params: input });
  return response.data;
}

export async function updatePlatformPlanRequestStatus(id: number, status: PlanRequestStatus) {
  const response = await platformClient.patch<PlatformPlanRequest>(`/platform/plan-requests/${id}/status`, { status });
  return response.data;
}
