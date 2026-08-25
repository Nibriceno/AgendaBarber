import apiClient from "@/lib/api/client";
import type {
  AuthUser,
  AuthMessageResponse,
  LoginCredentials,
  LoginResponse,
  RegisterClientInput,
  RegisterClientResponse,
  ResendVerificationInput,
  VerifyEmailInput,
} from "../types/auth.types";

export async function loginRequest(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    "/auth/login",
    credentials,
  );

  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>("/auth/me");

  return response.data;
}

export async function registerClientRequest(
  input: RegisterClientInput,
): Promise<RegisterClientResponse> {
  const response =
    await apiClient.post<RegisterClientResponse>(
      "/auth/register",
      input,
    );

  return response.data;
}

export async function verifyEmailRequest(
  input: VerifyEmailInput,
): Promise<AuthMessageResponse> {
  const response =
    await apiClient.post<AuthMessageResponse>(
      "/auth/verify-email",
      input,
    );

  return response.data;
}

export async function resendVerificationRequest(
  input: ResendVerificationInput,
): Promise<AuthMessageResponse> {
  const response =
    await apiClient.post<AuthMessageResponse>(
      "/auth/resend-verification",
      input,
    );

  return response.data;
}
