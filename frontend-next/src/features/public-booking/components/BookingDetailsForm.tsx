"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createGuestBooking,
} from "../api/create-booking.api";

import {
  bookingConfirmationStorage,
} from "../lib/booking-confirmation-storage";

import type {
  PublicBarber,
  PublicService,
} from "../types/public-booking.types";

import PublicHeader from "./PublicHeader";
import BookingSummary from "./BookingSummary";

type BookingDetailsFormProps = {
  businessSlug: string;

  barber: PublicBarber;
  services: PublicService[];

  startAt: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  customerNotes: string;
};

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  customerNotes: "",
};

function validateForm(
  form: FormState,
): string | null {
  if (
    !form.firstName.trim()
  ) {
    return "Ingresa tu nombre.";
  }

  if (
    !form.lastName.trim()
  ) {
    return "Ingresa tu apellido.";
  }

  const phone =
    form.phone
      .replace(/\s/g, "")
      .trim();

  if (
    !/^\+?[0-9]{8,15}$/.test(
      phone,
    )
  ) {
    return "Ingresa un teléfono válido.";
  }

  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      form.email.trim(),
    )
  ) {
    return "Ingresa un correo válido.";
  }

  return null;
}

function formatBookingDate(
  startAt: string,
): string {
  return new Intl.DateTimeFormat(
    "es-CL",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  ).format(
    new Date(startAt),
  );
}

function formatBookingTime(
  startAt: string,
): string {
  return new Intl.DateTimeFormat(
    "es-CL",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(
    new Date(startAt),
  );
}

export default function BookingDetailsForm({
  businessSlug,
  barber,
  services,
  startAt,
}: BookingDetailsFormProps) {
  const router =
    useRouter();

  const [form, setForm] =
    useState<FormState>(
      INITIAL_FORM,
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const assignments =
    new Map(
      barber.services.map(
        (assignment) => [
          assignment.serviceId,
          assignment,
        ],
      ),
    );

  const totalPrice =
    services.reduce(
      (
        total,
        service,
      ) => {
        const assignment =
          assignments.get(
            service.id,
          );

        return (
          total +
          Number(
            assignment
              ?.customPrice ??
              service.price,
          )
        );
      },
      0,
    );

  const totalDuration =
    services.reduce(
      (
        total,
        service,
      ) => {
        const assignment =
          assignments.get(
            service.id,
          );

        return (
          total +
          (
            assignment
              ?.customDurationMinutes ??
            service.durationMinutes
          )
        );
      },
      0,
    );

  const updateField = (
    field:
      keyof FormState,
    value: string,
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    );
  };

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      const validationError =
        validateForm(
          form,
        );

      if (
        validationError
      ) {
        setError(
          validationError,
        );

        return;
      }

      setSubmitting(
        true,
      );

      setError(null);

      try {
        const booking =
          await createGuestBooking(
            businessSlug,
            {
              firstName:
                form.firstName.trim(),

              lastName:
                form.lastName.trim(),

              phone:
                form.phone
                  .replace(
                    /\s/g,
                    "",
                  )
                  .trim(),

              ...(form.email.trim() && {
                email:
                  form.email
                    .trim()
                    .toLowerCase(),
              }),

              barberId:
                barber.id,

              serviceIds:
                services.map(
                  (service) =>
                    service.id,
                ),

              startAt,

              ...(form.customerNotes.trim() && {
                customerNotes:
                  form.customerNotes.trim(),
              }),
            },
          );

        bookingConfirmationStorage.save(
          booking,
        );

        router.replace(
          `/${businessSlug}/booking/confirmation?code=${encodeURIComponent(
            booking.confirmationCode,
          )}`,
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible crear la reserva.",
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessSlug={
          businessSlug
        }
      />

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mb-7 inline-flex h-10 items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span aria-hidden>
            ←
          </span>

          Volver
        </button>

        <div className="space-y-6">
          <section>
            <p className="text-sm font-medium text-zinc-500">
              Paso 4
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Confirma tu reserva
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Solo necesitamos
              algunos datos para
              identificar tu hora.
            </p>
          </section>

          <BookingSummary
            barber={
              barber
            }
            services={
              services
            }
            totalPrice={
              totalPrice
            }
            totalDuration={
              totalDuration
            }
          />

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fecha y hora
            </p>

            <div className="mt-2">
              <p className="capitalize font-semibold text-zinc-950">
                {formatBookingDate(
                  startAt,
                )}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {formatBookingTime(
                  startAt,
                )}
              </p>
            </div>
          </section>

          <form
            onSubmit={
              handleSubmit
            }
            className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  Nombre
                </span>

                <input
                  type="text"
                  autoComplete="given-name"
                  value={
                    form.firstName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "firstName",
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  placeholder="Nicolás"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  Apellido
                </span>

                <input
                  type="text"
                  autoComplete="family-name"
                  value={
                    form.lastName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "lastName",
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  placeholder="Briceño"
                />
              </label>
            </div>

            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  Teléfono
                </span>

                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={
                    form.phone
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "phone",
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  placeholder="+56 9 1234 5678"
                />

                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Lo utilizaremos para
                  identificar tu
                  reserva.
                </p>
              </label>
            </div>

            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  Correo electrónico
                </span>

                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "email",
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  placeholder="correo@ejemplo.cl"
                />

                <p className="mt-2 text-xs text-zinc-400">
                  Opcional
                </p>
              </label>
            </div>

            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  ¿Quieres agregar una nota?
                </span>

                <textarea
                  rows={3}
                  value={
                    form.customerNotes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "customerNotes",
                      event.target
                        .value,
                    )
                  }
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  placeholder="Ej: prefiero corte con tijera"
                />

                <p className="mt-2 text-xs text-zinc-400">
                  Opcional
                </p>
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting
              }
              className="mt-6 flex h-13 min-h-[52px] w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {submitting
                ? "Reservando..."
                : "Confirmar reserva"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-400">
              La disponibilidad se
              volverá a validar al
              confirmar.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}