import platformClient from "@/lib/api/platform-client";

import type {
  PlatformLoginInput,
  PlatformLoginResponse,
  PlatformUser,
} from "../types/platform-auth.types";

export async function platformLoginRequest(
  input: PlatformLoginInput,
): Promise<PlatformLoginResponse> {
  const response = await platformClient.post<PlatformLoginResponse>(
    "/platform/auth/login",
    input,
  );
  return response.data;
}

export async function getCurrentPlatformUser(): Promise<PlatformUser> {
  const response = await platformClient.get<PlatformUser>("/platform/auth/me");
  return response.data;
}

export async function platformLogoutRequest(): Promise<void> {
  await platformClient.post("/platform/auth/logout");
}
