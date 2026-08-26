import {
  redirect,
} from "next/navigation";

import {
  getPublicBarbers,
  getPublicBusiness,
  getPublicServices,
} from "@/features/public-booking/api/public-booking.api";

import BookingDetailsForm from "@/features/public-booking/components/BookingDetailsForm";

type BookingDetailsPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;

  searchParams: Promise<{
    barberId?:
      | string
      | string[];

    serviceIds?:
      | string
      | string[];

    startAt?:
      | string
      | string[];
  }>;
};

function getSingleValue(
  value:
    | string
    | string[]
    | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(
    value,
  )
    ? value[0] ??
        null
    : value;
}

function parseId(
  value:
    | string
    | string[]
    | undefined,
): number | null {
  const raw =
    getSingleValue(
      value,
    );

  if (!raw) {
    return null;
  }

  const id =
    Number(raw);

  return Number.isInteger(
    id,
  ) && id > 0
    ? id
    : null;
}

function parseServiceIds(
  value:
    | string
    | string[]
    | undefined,
): number[] {
  if (!value) {
    return [];
  }

  const values =
    (
      Array.isArray(value)
        ? value
        : [value]
    ).flatMap(
      (item) =>
        item.split(","),
    );

  return [
    ...new Set(
      values
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(
              id,
            ) &&
            id > 0,
        ),
    ),
  ];
}

export default async function BookingDetailsPage({
  params,
  searchParams,
}: BookingDetailsPageProps) {
  const {
    businessSlug,
  } = await params;

  const query =
    await searchParams;

  const barberId =
    parseId(
      query.barberId,
    );

  const serviceIds =
    parseServiceIds(
      query.serviceIds,
    );

  const startAt =
    getSingleValue(
      query.startAt,
    );

  if (
    !barberId ||
    serviceIds.length === 0 ||
    !startAt
  ) {
    redirect(
      `/${businessSlug}`,
    );
  }

  const date =
    new Date(
      startAt,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    redirect(
      `/${businessSlug}`,
    );
  }

  const [
    barbers,
    allServices,
    business,
  ] = await Promise.all([
    getPublicBarbers(
      businessSlug,
    ),

    getPublicServices(
      businessSlug,
    ),

    getPublicBusiness(
      businessSlug,
    ),
  ]);

  const barber =
    barbers.find(
      (item) =>
        item.id ===
        barberId,
    );

  if (!barber) {
    redirect(
      `/${businessSlug}`,
    );
  }

  const assignedIds =
    new Set(
      barber.services.map(
        (assignment) =>
          assignment.serviceId,
      ),
    );

  const services =
    serviceIds
      .map((serviceId) =>
        allServices.find(
          (service) =>
            service.id ===
            serviceId,
        ),
      )
      .filter(
        (
          service,
        ): service is NonNullable<
          typeof service
        > =>
          Boolean(
            service &&
              assignedIds.has(
                service.id,
              ),
          ),
      );

  if (
    services.length !==
    serviceIds.length
  ) {
    redirect(
      `/${businessSlug}`,
    );
  }

  return (
    <BookingDetailsForm
      businessSlug={
        businessSlug
      }
      barber={
        barber
      }
      services={
        services
      }
      startAt={
        startAt
      }
      business={business}
    />
  );
}
