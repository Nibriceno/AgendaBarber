"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  bookingConfirmationStorage,
} from "../lib/booking-confirmation-storage";

import type {
  BookingConfirmation,
} from "../types/public-booking.types";

import PublicHeader from "./PublicHeader";

type BookingConfirmationViewProps = {
  businessSlug: string;
  confirmationCode: string;
};

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "es-CL",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "es-CL",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(
    new Date(value),
  );
}

function formatPrice(
  value:
    | string
    | number,
) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style:
        "currency",
      currency:
        "CLP",
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value),
  );
}

export default function BookingConfirmationView({
  businessSlug,
  confirmationCode,
}: BookingConfirmationViewProps) {
  const [
    booking,
    setBooking,
  ] =
    useState<BookingConfirmation | null>(
      null,
    );

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored =
        bookingConfirmationStorage.get();

      if (
        stored?.confirmationCode ===
          confirmationCode &&
        stored.business
      ) {
        setBooking(
          stored,
        );
      }

      setLoaded(true);
    });
  }, [
    confirmationCode,
  ]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-50" />
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <PublicHeader
          businessSlug={
            businessSlug
          }
        />

        <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-semibold text-zinc-950">
            Reserva no disponible
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            No encontramos los datos
            de esta confirmación en
            esta sesión.
          </p>

          <Link
            href={`/${businessSlug}`}
            className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white"
          >
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  const managementHref = booking.managementToken
    ? `/${businessSlug}/booking/manage/${encodeURIComponent(
        booking.confirmationCode,
      )}#token=${encodeURIComponent(booking.managementToken)}`
    : "/mi-cuenta/reservas";

  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessSlug={
          businessSlug
        }
      />

      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
            ✓
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950">
            Hora reservada
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Tu reserva fue creada
            correctamente.
          </p>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profesional
            </p>

            <p className="mt-1 font-semibold text-zinc-950">
              {
                booking.barber
                  .displayName
              }
            </p>
          </div>

          <div className="border-t border-zinc-100 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fecha
            </p>

            <p className="mt-1 capitalize font-semibold text-zinc-950">
              {formatDate(
                booking.startAt,
              )}
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              {formatTime(
                booking.startAt,
              )}
            </p>
          </div>

          <div className="border-t border-zinc-100 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Servicios
            </p>

            <div className="mt-3 space-y-2">
              {booking.services.map(
                (service) => (
                  <div
                    key={
                      service.id
                    }
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-zinc-700">
                      {
                        service.name
                      }
                    </span>

                    <span className="font-medium text-zinc-950">
                      {formatPrice(
                        service.price,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 p-5">
            <span className="text-sm text-zinc-500">
              Total
            </span>

            <span className="text-lg font-semibold text-zinc-950">
              {formatPrice(
                booking.totalPrice,
              )}
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-zinc-100 p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Código de reserva
          </p>

          <p className="mt-2 font-mono text-xl font-semibold tracking-wider text-zinc-950">
            {
              booking.confirmationCode
            }
          </p>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={managementHref}
            className="flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Gestionar mi reserva
          </Link>
          <Link
            href={`/${businessSlug}`}
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Volver al inicio
          </Link>
        </div>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Cambios y cancelaciones
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {booking.business.bookingPolicy.allowRescheduling
              ? `Puedes reprogramar hasta ${booking.business.bookingPolicy.rescheduleMinimumMinutes} minutos antes. `
              : "La reprogramación en línea está desactivada. "}
            {booking.business.bookingPolicy.allowCancellation
              ? `Puedes cancelar hasta ${booking.business.bookingPolicy.cancellationMinimumMinutes} minutos antes.`
              : "La cancelación en línea está desactivada."}
          </p>
          {booking.business.bookingPolicy.policyText && (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-sm leading-6 text-zinc-600">
              {booking.business.bookingPolicy.policyText}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
