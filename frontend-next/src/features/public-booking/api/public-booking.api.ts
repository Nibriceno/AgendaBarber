import type {
  PublicAvailability,
  PublicBarber,
  PublicBusiness,
  PublicService,
} from "../types/public-booking.types";

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiBaseUrl(): string | undefined {
  if (typeof window === "undefined" && process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }

  return PUBLIC_API_URL;
}

function getApiUrl(
  path: string,
): string {
  const apiUrl = getApiBaseUrl();

  if (!apiUrl) {
    throw new Error(
      "La URL de la API no está configurada.",
    );
  }

  return `${apiUrl}${path}`;
}

async function getPublicResource<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(
    getApiUrl(path),
    {
      cache: "no-store",

      headers: {
        Accept: "application/json",
      },

      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Public API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getPublicBusiness(
  businessSlug: string,
  signal?: AbortSignal,
): Promise<PublicBusiness> {
  return getPublicResource<PublicBusiness>(
    `/public/${encodeURIComponent(
      businessSlug,
    )}/business`,
    signal,
  );
}

export async function getPublicBarbers(
  businessSlug: string,
): Promise<PublicBarber[]> {
  return getPublicResource<PublicBarber[]>(
    `/public/${encodeURIComponent(
      businessSlug,
    )}/barbers`,
  );
}

export async function getPublicServices(
  businessSlug: string,
): Promise<PublicService[]> {
  return getPublicResource<PublicService[]>(
    `/public/${encodeURIComponent(
      businessSlug,
    )}/services`,
  );
}

export async function getPublicAvailability(
  businessSlug: string,
  barberId: number,
  serviceIds: number[],
  date: string,
  signal?: AbortSignal,
): Promise<PublicAvailability> {
  const params =
    new URLSearchParams();

  params.set(
    "barberId",
    String(barberId),
  );

  for (const serviceId of serviceIds) {
    params.append(
      "serviceIds",
      String(serviceId),
    );
  }

  params.set(
    "date",
    date,
  );

  return getPublicResource<PublicAvailability>(
    `/public/${encodeURIComponent(
      businessSlug,
    )}/availability?${params.toString()}`,
    signal,
  );
}
