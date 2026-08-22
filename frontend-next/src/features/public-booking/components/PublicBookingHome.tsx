"use client";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import PublicHeader from "./PublicHeader";
import BarberSelector from "./BarberSelector";
import PublicServiceSelector from "./PublicServiceSelector";

import type {
  PublicBarber,
  PublicService,
} from "../types/public-booking.types";

type PublicBookingHomeProps = {
  businessSlug: string;
  barbers: PublicBarber[];
  services: PublicService[];
};

function formatPrice(
  value: number,
): string {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default function PublicBookingHome({
  businessSlug,
  barbers,
  services,
}: PublicBookingHomeProps) {
  const router =
    useRouter();

  const [
    selectedBarberId,
    setSelectedBarberId,
  ] = useState<number | null>(
    null,
  );

  const [
    selectedServiceIds,
    setSelectedServiceIds,
  ] = useState<number[]>([]);

  const selectedBarber =
    useMemo(
      () =>
        barbers.find(
          (barber) =>
            barber.id ===
            selectedBarberId,
        ) ?? null,
      [
        barbers,
        selectedBarberId,
      ],
    );

  const summary =
    useMemo(() => {
      if (!selectedBarber) {
        return {
          totalPrice: 0,
          totalDuration: 0,
        };
      }

      const assignments =
        new Map(
          selectedBarber.services.map(
            (item) => [
              item.serviceId,
              item,
            ],
          ),
        );

      let totalPrice = 0;
      let totalDuration = 0;

      for (
        const serviceId of
        selectedServiceIds
      ) {
        const service =
          services.find(
            (item) =>
              item.id ===
              serviceId,
          );

        const assignment =
          assignments.get(
            serviceId,
          );

        if (
          !service ||
          !assignment
        ) {
          continue;
        }

        totalPrice += Number(
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
      selectedBarber,
      selectedServiceIds,
      services,
    ]);

  const handleSelectBarber = (
    barberId: number,
  ) => {
    setSelectedBarberId(
      barberId,
    );

    /*
     * Cambiar de profesional
     * reinicia servicios para evitar
     * conservar servicios que el nuevo
     * barbero quizá no realiza.
     */
    setSelectedServiceIds(
      [],
    );
  };

  const handleToggleService = (
    serviceId: number,
  ) => {
    setSelectedServiceIds(
      (current) =>
        current.includes(
          serviceId,
        )
          ? current.filter(
              (id) =>
                id !==
                serviceId,
            )
          : [
              ...current,
              serviceId,
            ],
    );
  };

  const canContinue =
    selectedBarber !== null &&
    selectedServiceIds.length >
      0;

  const handleContinue = () => {
    if (
      !selectedBarber ||
      selectedServiceIds.length ===
        0
    ) {
      return;
    }

    const params =
      new URLSearchParams();

    params.set(
      "barberId",
      String(
        selectedBarber.id,
      ),
    );

    params.set(
      "serviceIds",
      selectedServiceIds.join(
        ",",
      ),
    );

    router.push(
      `/${businessSlug}/booking?${params.toString()}`,
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessSlug={
          businessSlug
        }
      />

      <main className="mx-auto max-w-3xl px-4 pb-36 pt-8 sm:px-6 sm:pt-12">
        <section className="mb-10">
          <p className="text-sm font-medium text-zinc-500">
            Reserva online
          </p>

          <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Reserva tu próxima hora
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500 sm:text-base">
            Elige tu barbero y los
            servicios que necesitas.
            Luego podrás escoger la
            fecha y hora disponible.
          </p>
        </section>

        {barbers.length ===
        0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="font-medium text-zinc-900">
              No hay barberos
              disponibles
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Intenta nuevamente más
              tarde.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <BarberSelector
              barbers={
                barbers
              }
              selectedBarberId={
                selectedBarberId
              }
              onSelect={
                handleSelectBarber
              }
            />

            <PublicServiceSelector
              barber={
                selectedBarber
              }
              services={
                services
              }
              selectedServiceIds={
                selectedServiceIds
              }
              onToggle={
                handleToggleService
              }
            />
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {selectedServiceIds.length >
            0 ? (
              <>
                <p className="text-xs text-zinc-500">
                  {
                    selectedServiceIds.length
                  }{" "}
                  {selectedServiceIds.length ===
                  1
                    ? "servicio"
                    : "servicios"}{" "}
                  ·{" "}
                  {
                    summary.totalDuration
                  }{" "}
                  min
                </p>

                <p className="mt-0.5 font-semibold text-zinc-950">
                  {formatPrice(
                    summary.totalPrice,
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                {!selectedBarber
                  ? "Selecciona un barbero"
                  : "Selecciona un servicio"}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={
              !canContinue
            }
            onClick={
              handleContinue
            }
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            Elegir horario
          </button>
        </div>
      </div>
    </div>
  );
}