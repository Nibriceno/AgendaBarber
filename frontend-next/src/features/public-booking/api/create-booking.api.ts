import apiClient from "@/lib/api/client";

import type {
  BookingConfirmation,
  CreateClientBookingInput,
  CreateGuestBookingInput,
} from "../types/public-booking.types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL;

function getApiUrl(
  path: string,
): string {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL no está configurado.",
    );
  }

  return `${API_URL}${path}`;
}

export async function createGuestBooking(
  businessSlug: string,
  input: CreateGuestBookingInput,
): Promise<BookingConfirmation> {
  const response = await fetch(
    getApiUrl(
      `/public/${encodeURIComponent(
        businessSlug,
      )}/appointments`,
    ),
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        input,
      ),
    },
  );

  if (!response.ok) {
    const data:
      | {
          message?:
            | string
            | string[];
        }
      | undefined =
      await response
        .json()
        .catch(() => undefined);

    const message =
      Array.isArray(
        data?.message,
      )
        ? data?.message.join(
            " ",
          )
        : data?.message;

    throw new Error(
      message ??
        "No fue posible crear la reserva.",
    );
  }

  return response.json() as Promise<BookingConfirmation>;
}

export async function createClientBooking(
  input: CreateClientBookingInput,
): Promise<BookingConfirmation> {
  const response =
    await apiClient.post<BookingConfirmation>(
      "/appointments",
      input,
    );

  return response.data;
}