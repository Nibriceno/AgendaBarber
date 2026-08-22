"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getBarbers,
} from "@/features/barbers/api/barbers.api";

import type {
  Barber,
} from "@/features/barbers/types/barber.types";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

import WeeklyScheduleEditor from "./WeeklyScheduleEditor";

import ScheduleExceptionsPanel from "./ScheduleExceptionsPanel";

function getInitials(
  name: string,
): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

export default function SchedulesOverview() {
  const [
    barbers,
    setBarbers,
  ] =
    useState<Barber[]>(
      [],
    );

  const [
    selectedBarberId,
    setSelectedBarberId,
  ] =
    useState<number | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    const loadBarbers =
      async () => {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const result =
            await getBarbers();

          const active =
            result.filter(
              (barber) =>
                barber.isActive,
            );

          setBarbers(
            active,
          );

          if (
            active.length >
            0
          ) {
            setSelectedBarberId(
              active[0].id,
            );
          }
        } catch (error) {
          setError(
            getApiErrorMessage(
              error,
              "No fue posible cargar los barberos.",
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    void loadBarbers();
  }, []);

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

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-zinc-500">
          Cargando equipo...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-8">
        <p className="text-sm font-medium text-zinc-500">
          Disponibilidad
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Horarios del equipo
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Configura los días,
          horarios normales y
          excepciones de cada
          profesional.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {barbers.length ===
      0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <p className="font-medium text-zinc-950">
            No hay profesionales disponibles
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Primero debes crear al
            menos un barbero.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <label
              htmlFor="schedule-barber"
              className="block text-sm font-medium text-zinc-800"
            >
              Profesional
            </label>

            <select
              id="schedule-barber"
              value={
                selectedBarberId ??
                ""
              }
              onChange={(
                event,
              ) =>
                setSelectedBarberId(
                  Number(
                    event
                      .target
                      .value,
                  ),
                )
              }
              className="mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            >
              {barbers.map(
                (barber) => (
                  <option
                    key={
                      barber.id
                    }
                    value={
                      barber.id
                    }
                  >
                    {
                      barber.displayName
                    }
                  </option>
                ),
              )}
            </select>

            {selectedBarber && (
              <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
                  {selectedBarber.photoUrl ? (
                    <img
                      src={
                        selectedBarber.photoUrl
                      }
                      alt={
                        selectedBarber.displayName
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-zinc-600">
                      {getInitials(
                        selectedBarber.displayName,
                      )}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-zinc-500">
                    Editando disponibilidad de
                  </p>

                  <p className="font-semibold text-zinc-950">
                    {
                      selectedBarber.displayName
                    }
                  </p>
                </div>
              </div>
            )}
          </section>

          {selectedBarberId !==
            null && (
            <>
              <WeeklyScheduleEditor
                key={`schedule-${selectedBarberId}`}
                barberId={
                  selectedBarberId
                }
              />

              <ScheduleExceptionsPanel
                key={`exceptions-${selectedBarberId}`}
                barberId={
                  selectedBarberId
                }
              />
            </>
          )}
        </>
      )}
    </div>
  );
}