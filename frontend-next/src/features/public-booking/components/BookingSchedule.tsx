"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  getPublicAvailability,
} from "../api/public-booking.api";

import type {
  PublicAvailability,
  PublicAvailabilitySlot,
  PublicBarber,
  PublicService,
} from "../types/public-booking.types";

import PublicHeader from "./PublicHeader";
import BookingDateSelector from "./BookingDateSelector";
import BookingTimeSelector from "./BookingTimeSelector";
import BookingSummary from "./BookingSummary";

type BookingScheduleProps = {
  businessSlug: string;
  barber: PublicBarber;
  services: PublicService[];
};

function getTodayDateString() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      today.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function BookingSchedule({
  businessSlug,
  barber,
  services,
}: BookingScheduleProps) {
  const router =
    useRouter();

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<string | null>(
    null,
  );

  const [
    availability,
    setAvailability,
  ] =
    useState<PublicAvailability | null>(
      null,
    );

  const [
    selectedSlot,
    setSelectedSlot,
  ] =
    useState<PublicAvailabilitySlot | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Inicializamos la fecha en cliente
   * para evitar diferencias de fecha
   * entre SSR y navegador.
   */
  useEffect(() => {
    setSelectedDate(
      getTodayDateString(),
    );
  }, []);

  const serviceIds =
    useMemo(
      () =>
        services.map(
          (service) =>
            service.id,
        ),
      [services],
    );

  const assignmentByServiceId =
    useMemo(
      () =>
        new Map(
          barber.services.map(
            (assignment) => [
              assignment.serviceId,
              assignment,
            ],
          ),
        ),
      [barber],
    );

  const summary =
    useMemo(() => {
      let totalPrice = 0;
      let totalDuration = 0;

      for (
        const service of
        services
      ) {
        const assignment =
          assignmentByServiceId.get(
            service.id,
          );

        if (!assignment) {
          continue;
        }

        totalPrice +=
          Number(
            assignment.customPrice ??
              service.price,
          );

        totalDuration +=
          assignment.customDurationMinutes ??
          service.durationMinutes;
      }

      return {
        totalPrice,
        totalDuration,
      };
    }, [
      services,
      assignmentByServiceId,
    ]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const controller =
      new AbortController();

    const loadAvailability =
      async () => {
        setLoading(true);
        setError(null);
        setSelectedSlot(null);

        try {
          const result =
            await getPublicAvailability(
              businessSlug,
              barber.id,
              serviceIds,
              selectedDate,
              controller.signal,
            );

          setAvailability(
            result,
          );
        } catch (error) {
          if (
            controller.signal
              .aborted
          ) {
            return;
          }

          console.error(
            "Error loading availability:",
            error,
          );

          setAvailability(
            null,
          );

          setError(
            "No fue posible consultar los horarios. Intenta nuevamente.",
          );
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setLoading(
              false,
            );
          }
        }
      };

    void loadAvailability();

    return () => {
      controller.abort();
    };
  }, [
    businessSlug,
    barber.id,
    serviceIds,
    selectedDate,
  ]);

  const handleContinue = () => {
    if (!selectedSlot) {
      return;
    }

    const params =
      new URLSearchParams();

    params.set(
      "barberId",
      String(barber.id),
    );

    for (
      const serviceId of
      serviceIds
    ) {
      params.append(
        "serviceIds",
        String(serviceId),
      );
    }

    params.set(
      "startAt",
      selectedSlot.startAt,
    );

    router.push(
      `/${businessSlug}/booking/details?${params.toString()}`,
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessSlug={
          businessSlug
        }
      />

      <main className="mx-auto max-w-3xl px-4 pb-40 pt-6 sm:px-6 sm:pt-10">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mb-7 inline-flex h-10 items-center gap-2 rounded-full px-1 text-sm font-medium text-zinc-600 transition hover:text-zinc-950 focus:outline-none"
        >
          <span aria-hidden>
            ←
          </span>

          Volver
        </button>

        <div className="space-y-8">
          <BookingSummary
            barber={
              barber
            }
            services={
              services
            }
            totalPrice={
              summary.totalPrice
            }
            totalDuration={
              summary.totalDuration
            }
          />

          <BookingDateSelector
            selectedDate={
              selectedDate
            }
            onSelect={
              setSelectedDate
            }
          />

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {selectedDate && (
            <BookingTimeSelector
              slots={
                availability
                  ?.availableSlots ??
                []
              }
              selectedStartAt={
                selectedSlot
                  ?.startAt ??
                null
              }
              loading={
                loading
              }
              onSelect={
                setSelectedSlot
              }
            />
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {selectedSlot ? (
              <>
                <p className="text-xs text-zinc-500">
                  Hora seleccionada
                </p>

                <p className="mt-0.5 font-semibold text-zinc-950">
                  {
                    selectedSlot.time
                  }
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Selecciona una hora
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={
              !selectedSlot
            }
            onClick={
              handleContinue
            }
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}