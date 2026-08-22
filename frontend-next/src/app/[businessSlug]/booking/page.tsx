import {
  redirect,
} from "next/navigation";

import {
  getPublicBarbers,
  getPublicServices,
} from "@/features/public-booking/api/public-booking.api";

import BookingSchedule from "@/features/public-booking/components/BookingSchedule";

type BookingPageProps = {
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
  }>;
};

function parseBarberId(
  value:
    | string
    | string[]
    | undefined,
): number | null {
  const raw =
    Array.isArray(value)
      ? value[0]
      : value;

  if (!raw) {
    return null;
  }

  const id =
    Number(raw);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    return null;
  }

  return id;
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

  const rawValues =
    Array.isArray(value)
      ? value
      : [value];

  /*
   * También soportamos el formato
   * anterior "1,2,3" que usaba la
   * portada inicialmente.
   */
  const values =
    rawValues.flatMap(
      (item) =>
        item.split(","),
    );

  const ids =
    values
      .map((value) =>
        Number(value),
      )
      .filter(
        (id) =>
          Number.isInteger(
            id,
          ) &&
          id > 0,
      );

  return [
    ...new Set(ids),
  ];
}

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const {
    businessSlug,
  } = await params;

  const query =
    await searchParams;

  const barberId =
    parseBarberId(
      query.barberId,
    );

  const serviceIds =
    parseServiceIds(
      query.serviceIds,
    );

  if (
    !barberId ||
    serviceIds.length === 0
  ) {
    redirect(
      `/${businessSlug}`,
    );
  }

  const [
    barbers,
    allServices,
  ] = await Promise.all([
    getPublicBarbers(
      businessSlug,
    ),

    getPublicServices(
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

  const assignedServiceIds =
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
          service !==
            undefined &&
          assignedServiceIds.has(
            service.id,
          ),
      );

  /*
   * Si falta siquiera uno,
   * alguien manipuló la URL
   * o la configuración cambió.
   */
  if (
    services.length !==
    serviceIds.length
  ) {
    redirect(
      `/${businessSlug}`,
    );
  }

  return (
    <BookingSchedule
      businessSlug={
        businessSlug
      }
      barber={
        barber
      }
      services={
        services
      }
    />
  );
}