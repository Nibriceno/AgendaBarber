"use client";

import { useEffect, useMemo, useState } from "react";

import { getPublicAvailability } from "@/features/public-booking/api/public-booking.api";
import type { PublicAvailabilitySlot } from "@/features/public-booking/types/public-booking.types";

const DAYS_TO_SHOW = 21;

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function addUtcDays(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function formatDay(dateKey: string, timeZone: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("es-CL", {
      weekday: "short",
      timeZone,
    })
      .format(date)
      .replace(".", ""),
    day: new Intl.DateTimeFormat("es-CL", {
      day: "numeric",
      timeZone,
    }).format(date),
    month: new Intl.DateTimeFormat("es-CL", {
      month: "short",
      timeZone,
    })
      .format(date)
      .replace(".", ""),
  };
}

type AppointmentReschedulePickerProps = {
  businessSlug: string;
  barberId: number;
  serviceIds: number[];
  timeZone: string;
  submitting: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (startAt: string) => Promise<void>;
  eyebrow?: string;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
};

export default function AppointmentReschedulePicker({
  businessSlug,
  barberId,
  serviceIds,
  timeZone,
  submitting,
  error,
  onCancel,
  onConfirm,
  eyebrow = "Reprogramar",
  title = "Elige una nueva fecha y hora",
  description = "Mantendremos el profesional y los servicios de esta reserva.",
  cancelLabel = "Mantener fecha actual",
  confirmLabel = "Confirmar nueva hora",
}: AppointmentReschedulePickerProps) {
  const today = useMemo(
    () => dateKeyInTimeZone(new Date(), timeZone),
    [timeZone],
  );
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_TO_SHOW }, (_, index) =>
        addUtcDays(today, index),
      ),
    [today],
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const [slots, setSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const serviceIdsKey = useMemo(
    () => [...serviceIds].sort((first, second) => first - second).join(","),
    [serviceIds],
  );
  const stableServiceIds = useMemo(
    () => serviceIdsKey.split(",").filter(Boolean).map(Number),
    [serviceIdsKey],
  );

  const selectDate = (dateKey: string) => {
    setLoading(true);
    setAvailabilityError("");
    setSelectedStartAt(null);
    setSelectedDate(dateKey);
  };

  useEffect(() => {
    const controller = new AbortController();

    void getPublicAvailability(
      businessSlug,
      barberId,
      stableServiceIds,
      selectedDate,
      controller.signal,
    )
      .then((result) => setSlots(result.availableSlots))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setSlots([]);
        setAvailabilityError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos consultar los horarios.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [barberId, businessSlug, selectedDate, stableServiceIds]);

  return (
    <section className="border-t border-amber-100 bg-amber-50/60 p-5 sm:p-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          {eyebrow}
        </p>
        <h4 className="mt-2 text-lg font-semibold text-zinc-950">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>

        <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
          <div className="flex min-w-max gap-2">
            {days.map((dateKey) => {
              const formatted = formatDay(dateKey, timeZone);
              const selected = selectedDate === dateKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectDate(dateKey)}
                  className={`flex h-20 w-16 flex-col items-center justify-center rounded-2xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  <span className="text-[10px] uppercase opacity-70">
                    {dateKey === today ? "Hoy" : formatted.weekday}
                  </span>
                  <span className="mt-1 text-lg font-semibold">
                    {formatted.day}
                  </span>
                  <span className="text-[10px] uppercase opacity-70">
                    {formatted.month}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex h-28 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-500">
              Buscando horarios disponibles...
            </div>
          ) : availabilityError ? (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"
            >
              {availabilityError}
            </p>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
              No quedan horas disponibles para este día.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {slots.map((slot) => (
                <button
                  key={slot.startAt}
                  type="button"
                  aria-pressed={selectedStartAt === slot.startAt}
                  onClick={() => setSelectedStartAt(slot.startAt)}
                  className={`h-11 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
                    selectedStartAt === slot.startAt
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {(error || availabilityError) && error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!selectedStartAt || submitting}
            onClick={() => selectedStartAt && void onConfirm(selectedStartAt)}
            className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {submitting ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
