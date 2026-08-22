import apiClient from "@/lib/api/client";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
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