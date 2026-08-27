import apiClient from "@/lib/api/client";

import type {
  AdminAgendaQuery,
  AdminAgendaResponse,
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
