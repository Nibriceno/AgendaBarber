import apiClient from "@/lib/api/client";

import type {
  BookingConfirmation,
  ClientBookingResponse,
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
    await apiClient.post<ClientBookingResponse>(
      "/appointments",
      input,
    );

  const appointment = response.data;

  return {
    id: appointment.id,
    status: appointment.status,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    totalDurationMinutes: appointment.totalDurationMinutes,
    totalPrice: appointment.totalPrice,
    confirmationCode: appointment.confirmationCode,
    business: {
      name: appointment.business.name,
      timezone: appointment.business.timezone,
      currency: appointment.business.currency,
      bookingPolicy: {
        allowCancellation: appointment.business.allowClientCancellation,
        allowRescheduling: appointment.business.allowClientRescheduling,
        cancellationMinimumMinutes:
          appointment.business.cancellationMinimumMinutes,
        rescheduleMinimumMinutes:
          appointment.business.rescheduleMinimumMinutes,
        policyText: appointment.business.cancellationPolicy,
      },
    },
    barber: appointment.barber,
    services: appointment.services.map((service) => ({
      id: service.serviceId,
      name: service.serviceName,
      durationMinutes: service.durationMinutes,
      price: service.finalPrice,
    })),
  };
}
