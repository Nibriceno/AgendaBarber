import axios from "axios";

type ApiErrorResponse = {
  message?: string | string[];
};

export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string") {
    return message;
  }

  return fallback;
}

export function getApiErrorStatus(
  error: unknown,
): number | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  return error.response?.status ?? null;
}
