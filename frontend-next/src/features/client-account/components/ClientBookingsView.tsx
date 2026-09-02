"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelMyAppointment,
  getMyAppointments,
  rescheduleMyAppointment,
} from "../api/client-account.api";
import type {
  ClientAppointment,
  ClientAppointmentStatus,
} from "../types/client-account.types";
import { getApiErrorMessage } from "@/lib/api/errors";
import AppointmentReschedulePicker from "@/features/appointment-management/components/AppointmentReschedulePicker";
import { useAuth } from "@/features/auth/context/AuthContext";

type BookingFilter = "upcoming" | "history";

type ClientBookingsViewProps = {
  businessSlug?: string;
};

const STATUS_PRESENTATION: Record<
  ClientAppointmentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  CONFIRMED: {
    label: "Confirmada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  IN_PROGRESS: {
    label: "En curso",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  COMPLETED: {
    label: "Completada",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  NO_SHOW: {
    label: "No asistió",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
};

function isUpcoming(
  appointment: ClientAppointment,
  referenceTime: number,
): boolean {
  return (
    new Date(appointment.endAt).getTime() >= referenceTime &&
    appointment.status !== "CANCELLED" &&
    appointment.status !== "COMPLETED" &&
    appointment.status !== "NO_SHOW"
  );
}

function formatAppointmentDate(appointment: ClientAppointment): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: appointment.business.timezone,
  }).format(new Date(appointment.startAt));
}

function formatAppointmentTime(appointment: ClientAppointment): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: appointment.business.timezone,
  }).format(new Date(appointment.startAt));
}

function formatPrice(appointment: ClientAppointment): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: appointment.business.currency,
    maximumFractionDigits: 0,
  }).format(Number(appointment.totalPrice));
}

export default function ClientBookingsView({
  businessSlug,
}: ClientBookingsViewProps) {
  const { user } = useAuth();
  const defaultBusinessSlug = businessSlug ?? user?.businessSlug ?? "";
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<BookingFilter>("upcoming");
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [submittingCancellation, setSubmittingCancellation] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescheduleError, setRescheduleError] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [notice, setNotice] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setAppointments(await getMyAppointments());
      setReferenceTime(Date.now());
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "No pudimos cargar tus reservas."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getMyAppointments()
      .then((loadedAppointments) => {
        if (active) {
          setAppointments(loadedAppointments);
          setReferenceTime(Date.now());
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(requestError, "No pudimos cargar tus reservas."),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setInterval(() => {
      void getMyAppointments()
        .then((loadedAppointments) => {
          if (!active) return;
          setAppointments(loadedAppointments);
          setReferenceTime(Date.now());
        })
        .catch(() => {
          // Conservamos la última vista válida ante un fallo temporal de red.
        });
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => isUpcoming(appointment, referenceTime))
        .sort(
          (first, second) =>
            new Date(first.startAt).getTime() -
            new Date(second.startAt).getTime(),
        ),
    [appointments, referenceTime],
  );

  const historicAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => !isUpcoming(appointment, referenceTime),
      ),
    [appointments, referenceTime],
  );

  const visibleAppointments =
    filter === "upcoming" ? upcomingAppointments : historicAppointments;

  const openCancellation = (appointmentId: number) => {
    setReschedulingId(null);
    setCancellingId(appointmentId);
    setCancelReason("");
    setCancelError("");
  };

  const openReschedule = (appointmentId: number) => {
    setCancellingId(null);
    setCancelReason("");
    setReschedulingId(appointmentId);
    setRescheduleError("");
    setNotice("");
  };

  const closeReschedule = () => {
    if (submittingReschedule) return;
    setReschedulingId(null);
    setRescheduleError("");
  };

  const handleReschedule = async (appointmentId: number, startAt: string) => {
    setSubmittingReschedule(true);
    setRescheduleError("");
    setNotice("");

    try {
      const updatedAppointment = await rescheduleMyAppointment(
        appointmentId,
        startAt,
      );
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === updatedAppointment.id
            ? updatedAppointment
            : appointment,
        ),
      );
      setReschedulingId(null);
      setNotice("Tu reserva fue reprogramada correctamente.");
    } catch (requestError) {
      setRescheduleError(
        getApiErrorMessage(requestError, "No pudimos reprogramar la reserva."),
      );
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const closeCancellation = () => {
    if (submittingCancellation) {
      return;
    }

    setCancellingId(null);
    setCancelReason("");
    setCancelError("");
  };

  const handleCancellation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!cancellingId) {
      return;
    }

    const cleanReason = cancelReason.trim();

    if (!cleanReason) {
      setCancelError("Cuéntanos brevemente por qué necesitas cancelar.");
      return;
    }

    setSubmittingCancellation(true);
    setCancelError("");

    try {
      const updatedAppointment = await cancelMyAppointment(
        cancellingId,
        cleanReason,
      );

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === updatedAppointment.id
            ? updatedAppointment
            : appointment,
        ),
      );
      setCancellingId(null);
      setCancelReason("");
      setNotice("Tu reserva fue cancelada correctamente.");
    } catch (requestError) {
      setCancelError(
        getApiErrorMessage(requestError, "No pudimos cancelar la reserva."),
      );
    } finally {
      setSubmittingCancellation(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Agenda personal
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Mis reservas
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Toda la información de tus visitas, clara y actualizada.
          </p>
        </div>

        <Link
          href={`/${defaultBusinessSlug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          Reservar una hora
        </Link>
      </div>

      <div className="mt-7 inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        {(
          [
            {
              id: "upcoming",
              label: "Próximas",
              count: upcomingAppointments.length,
            },
            {
              id: "history",
              label: "Historial",
              count: historicAppointments.length,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
              filter === item.id
                ? "bg-zinc-950 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {item.label}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                filter === item.id
                  ? "bg-white/15 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {loading ? (
        <div aria-live="polite" className="mt-6 space-y-4">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-3xl border border-zinc-200 bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadAppointments()}
            className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Volver a intentar
          </button>
        </div>
      ) : visibleAppointments.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-2xl">
            {filter === "upcoming" ? "✦" : "✓"}
          </div>
          <h3 className="mt-5 text-lg font-semibold">
            {filter === "upcoming"
              ? "Aún no tienes próximas reservas"
              : "Todavía no hay visitas anteriores"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            {filter === "upcoming"
              ? "Elige tus servicios y encuentra el horario que mejor te acomode."
              : "Cuando completes o canceles una reserva, aparecerá aquí."}
          </p>
          {filter === "upcoming" && (
            <Link
              href={`/${defaultBusinessSlug}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              Explorar servicios
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleAppointments.map((appointment) => {
            const status = STATUS_PRESENTATION[appointment.status];
            const hasManageableStatus =
              appointment.status === "PENDING" ||
              appointment.status === "CONFIRMED";
            const minutesUntilStart =
              (new Date(appointment.startAt).getTime() - referenceTime) / 60_000;
            const canCancel =
              hasManageableStatus &&
              appointment.business.allowClientCancellation &&
              minutesUntilStart >=
                appointment.business.cancellationMinimumMinutes;
            const canReschedule =
              hasManageableStatus &&
              appointment.business.allowClientRescheduling &&
              minutesUntilStart >=
                appointment.business.rescheduleMinimumMinutes;
            const cancellationOpen = cancellingId === appointment.id;
            const rescheduleOpen = reschedulingId === appointment.id;

            return (
              <article
                key={appointment.id}
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-start">
                  <div className="rounded-2xl bg-zinc-950 p-4 text-white">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                      {formatAppointmentDate(appointment)}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">
                      {formatAppointmentTime(appointment)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {appointment.totalDurationMinutes} min
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/${appointment.business.slug}`}
                        className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-zinc-800"
                      >
                        {appointment.business.name}
                      </Link>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Código {appointment.confirmationCode}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold">
                      {appointment.services
                        .map((service) => service.serviceName)
                        .join(" + ")}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      Con {appointment.barber.displayName}
                      {appointment.barber.specialty
                        ? ` · ${appointment.barber.specialty}`
                        : ""}
                    </p>
                    {appointment.cancellationReason && (
                      <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600">
                        Motivo de cancelación: {appointment.cancellationReason}
                      </p>
                    )}
                    {hasManageableStatus && appointment.business.cancellationPolicy && (
                      <p className="mt-3 text-xs leading-5 text-zinc-500">
                        {appointment.business.cancellationPolicy}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4 md:block md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-right">
                    <p className="text-lg font-semibold">
                      {formatPrice(appointment)}
                    </p>
                    {hasManageableStatus && filter === "upcoming" ? (
                      <div className="mt-0 flex flex-wrap justify-end gap-2 md:mt-4 md:max-w-44">
                        <button
                          type="button"
                          disabled={!canReschedule}
                          onClick={() =>
                            rescheduleOpen
                              ? closeReschedule()
                              : openReschedule(appointment.id)
                          }
                          className="min-h-10 rounded-xl border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {rescheduleOpen ? "Cerrar" : "Reprogramar"}
                        </button>
                        <button
                          type="button"
                          disabled={!canCancel}
                          onClick={() =>
                            cancellationOpen
                              ? closeCancellation()
                              : openCancellation(appointment.id)
                          }
                          className="min-h-10 rounded-xl px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {cancellationOpen ? "Cerrar" : "Cancelar"}
                        </button>
                        {(!canCancel || !canReschedule) && (
                          <p className="w-full text-right text-[11px] leading-4 text-zinc-400">
                            Las acciones desactivadas están fuera del plazo definido por la barbería.
                          </p>
                        )}
                      </div>
                    ) : filter === "history" ? (
                      <Link
                        href={`/${appointment.business.slug}`}
                        className="mt-0 inline-flex text-sm font-semibold text-zinc-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-zinc-300 md:mt-4"
                      >
                        Reservar otra vez
                      </Link>
                    ) : null}
                  </div>
                </div>

                {rescheduleOpen && (
                  <AppointmentReschedulePicker
                    businessSlug={appointment.business.slug}
                    barberId={appointment.barber.id}
                    serviceIds={appointment.services.map(
                      (service) => service.serviceId,
                    )}
                    timeZone={appointment.business.timezone}
                    submitting={submittingReschedule}
                    error={rescheduleError}
                    onCancel={closeReschedule}
                    onConfirm={(startAt) =>
                      handleReschedule(appointment.id, startAt)
                    }
                  />
                )}

                {cancellationOpen && (
                  <form
                    onSubmit={handleCancellation}
                    className="border-t border-red-100 bg-red-50/60 p-5 sm:p-6"
                  >
                    <div className="max-w-2xl">
                      <h4 className="font-semibold text-zinc-950">
                        ¿Necesitas cancelar?
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        Esta acción no se puede deshacer. La barbería verá el
                        motivo que indiques.
                      </p>
                      <label
                        htmlFor={`cancel-reason-${appointment.id}`}
                        className="mt-4 block text-sm font-medium text-zinc-800"
                      >
                        Motivo
                      </label>
                      <textarea
                        id={`cancel-reason-${appointment.id}`}
                        value={cancelReason}
                        onChange={(event) =>
                          setCancelReason(event.target.value)
                        }
                        maxLength={300}
                        required
                        rows={3}
                        placeholder="Ej.: Surgió un imprevisto y no podré asistir."
                        className="mt-2 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                      />
                      {cancelError && (
                        <p role="alert" className="mt-2 text-sm text-red-700">
                          {cancelError}
                        </p>
                      )}
                      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={closeCancellation}
                          disabled={submittingCancellation}
                          className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                        >
                          Mantener mi reserva
                        </button>
                        <button
                          type="submit"
                          disabled={submittingCancellation}
                          className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submittingCancellation
                            ? "Cancelando..."
                            : "Confirmar cancelación"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
