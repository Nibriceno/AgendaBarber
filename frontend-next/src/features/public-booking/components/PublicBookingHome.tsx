"use client";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import PublicHeader from "./PublicHeader";
import PublicHomeHero from "./PublicHomeHero";
import BusinessLocation from "./BusinessLocation";
import BarberSelector from "./BarberSelector";
import PublicServiceSelector from "./PublicServiceSelector";

import type {
  PublicBarber,
  PublicBusiness,
  PublicService,
} from "../types/public-booking.types";

type PublicBookingHomeProps = {
  business: PublicBusiness;
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
  business,
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
      const assignments =
        new Map(
          (selectedBarber?.services ?? []).map(
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

        if (!service) {
          continue;
        }

        totalPrice += Number(
          assignment?.customPrice ??
            service.price,
        );

        totalDuration +=
          assignment?.customDurationMinutes ??
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
    barberId: number | null,
  ) => {
    setSelectedBarberId(
      barberId,
    );

    if (barberId === null) {
      return;
    }

    const barber =
      barbers.find(
        (item) =>
          item.id === barberId,
      );

    if (!barber) {
      return;
    }

    const availableServiceIds =
      new Set(
        barber.services.map(
          (item) =>
            item.serviceId,
        ),
      );

    setSelectedServiceIds(
      (current) =>
        current.filter(
          (serviceId) =>
            availableServiceIds.has(
              serviceId,
            ),
        ),
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

  const canAdvance =
    selectedServiceIds.length > 0 &&
    selectedBarber !== null;

  const handleContinue = () => {
    if (!canAdvance || !selectedBarber) {
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
        businessName={
          business.name
        }
        businessSlug={
          businessSlug
        }
      />

      <section className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
        <div
          className={`mx-auto max-w-7xl ${
            business.address
              ? "grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] lg:gap-5"
              : "block"
          }`}
        >
          <div className="overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_-38px_rgba(0,0,0,0.7)] ring-1 ring-black/5 lg:rounded-[2rem]">
            <PublicHomeHero
              businessName={
                business.name
              }
            />
          </div>

          {business.address && (
            <div
              aria-hidden="true"
              className="relative hidden items-center justify-center lg:flex"
            >
              <span className="h-[72%] w-1.5 rounded-full bg-gradient-to-b from-zinc-100 via-zinc-400 to-zinc-100 shadow-[0_0_0_1px_rgba(0,0,0,0.03)]" />
            </div>
          )}

          {business.address && (
            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_-38px_rgba(0,0,0,0.55)] ring-1 ring-zinc-200 lg:rounded-[2rem]">
              <BusinessLocation
                business={business}
              />
            </div>
          )}
        </div>
      </section>

      <main
        id="reservar"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-36 pt-8 sm:px-6 sm:pt-12"
      >
        <section className="mb-8 sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Reserva en línea
          </p>

          <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-4xl lg:text-5xl">
            Tu próxima visita, en pocos pasos
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
            Comienza por los servicios que necesitas y después elige quién te atenderá.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="lg:order-2">
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

          <div
            id="profesionales"
            className="scroll-mt-24 lg:order-1 lg:sticky lg:top-24"
          >
            {barbers.length === 0 ? (
              <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-7 text-center">
                <p className="font-medium text-zinc-900">
                  No hay profesionales disponibles
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Intenta nuevamente más tarde.
                </p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6">
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
                Selecciona uno o más servicios
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={
              !canAdvance
            }
            onClick={
              handleContinue
            }
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            {selectedServiceIds.length === 0
              ? "Elige un servicio"
              : !selectedBarber
                ? "Elige un profesional"
                : "Elegir horario"}
          </button>
        </div>
      </div>
    </div>
  );
}
