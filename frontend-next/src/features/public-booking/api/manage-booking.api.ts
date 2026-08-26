import type { BookingConfirmation } from "../types/public-booking.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl(path: string): string {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL no está configurado.");
  return `${API_URL}${path}`;
}

async function managementRequest(
  businessSlug: string,
  confirmationCode: string,
  managementToken: string,
  options?: {
    method: "PATCH";
    action: "cancel" | "reschedule";
    body: Record<string, string>;
  },
): Promise<BookingConfirmation> {
  const basePath = `/public/${encodeURIComponent(
    businessSlug,
  )}/appointments/${encodeURIComponent(confirmationCode)}`;
  const response = await fetch(
    getApiUrl(`${basePath}${options ? `/${options.action}` : ""}`),
    {
      method: options?.method ?? "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Booking-Token": managementToken,
        ...(options ? { "Content-Type": "application/json" } : {}),
      },
      ...(options ? { body: JSON.stringify(options.body) } : {}),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => undefined)) as
      | { message?: string | string[] }
      | undefined;
    const message = Array.isArray(data?.message)
      ? data.message.join(" ")
      : data?.message;
    throw new Error(message ?? "No pudimos gestionar la reserva.");
  }

  return response.json() as Promise<BookingConfirmation>;
}

export function getGuestManagedAppointment(
  businessSlug: string,
  confirmationCode: string,
  managementToken: string,
) {
  return managementRequest(businessSlug, confirmationCode, managementToken);
}

export function rescheduleGuestManagedAppointment(
  businessSlug: string,
  confirmationCode: string,
  managementToken: string,
  startAt: string,
) {
  return managementRequest(businessSlug, confirmationCode, managementToken, {
    method: "PATCH",
    action: "reschedule",
    body: { startAt },
  });
}

export function cancelGuestManagedAppointment(
  businessSlug: string,
  confirmationCode: string,
  managementToken: string,
  reason: string,
) {
  return managementRequest(businessSlug, confirmationCode, managementToken, {
    method: "PATCH",
    action: "cancel",
    body: { reason },
  });
}
