import platformClient from "@/lib/api/platform-client";

import type {
  BusinessStatus,
  CreatePlatformBusinessInput,
  CreatePlatformBusinessResponse,
  PlatformBusinessDetail,
  PlatformBusinessesResponse,
  PlatformBusinessSummary,
  UpdatePlatformBusinessInput,
} from "../types/platform-business.types";

export async function getPlatformBusinessSummary() {
  const response = await platformClient.get<PlatformBusinessSummary>(
    "/platform/businesses/summary",
  );
  return response.data;
}

export async function getPlatformBusinesses(input: {
  page: number;
  pageSize?: number;
  search?: string;
  status?: BusinessStatus | "";
}) {
  const response = await platformClient.get<PlatformBusinessesResponse>(
    "/platform/businesses",
    { params: input },
  );
  return response.data;
}

export async function getPlatformBusiness(id: number) {
  const response = await platformClient.get<PlatformBusinessDetail>(
    `/platform/businesses/${id}`,
  );
  return response.data;
}

export async function createPlatformBusiness(
  input: CreatePlatformBusinessInput,
) {
  const response = await platformClient.post<CreatePlatformBusinessResponse>(
    "/platform/businesses",
    input,
  );
  return response.data;
}

export async function updatePlatformBusiness(
  id: number,
  input: UpdatePlatformBusinessInput,
) {
  const response = await platformClient.patch<PlatformBusinessDetail>(
    `/platform/businesses/${id}`,
    input,
  );
  return response.data;
}

export async function changePlatformBusinessStatus(
  id: number,
  input: { status: BusinessStatus; reason?: string },
) {
  const response = await platformClient.patch<PlatformBusinessDetail>(
    `/platform/businesses/${id}/status`,
    input,
  );
  return response.data;
}

export async function resendPlatformBusinessInvitation(id: number) {
  const response = await platformClient.post<{
    emailSent: boolean;
    invitationExpiresAt: string;
  }>(`/platform/businesses/${id}/invitation/resend`);
  return response.data;
}
