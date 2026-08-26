"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import AppointmentReschedulePicker from "@/features/appointment-management/components/AppointmentReschedulePicker";

import {
  cancelGuestManagedAppointment,
  getGuestManagedAppointment,
  rescheduleGuestManagedAppointment,
} from "../api/manage-booking.api";
import { bookingConfirmationStorage } from "../lib/booking-confirmation-storage";
import { bookingManagementTokenStorage } from "../lib/booking-management-token-storage";
import type { BookingConfirmation } from "../types/public-booking.types";
import PublicHeader from "./PublicHeader";

type ManageAction = "reschedule" | "cancel" | null;

const STATUS_PRESENTATION: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: { label: "Pendiente", className: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmada", className: "bg-sky-50 text-sky-700" },
  IN_PROGRESS: {
    label: "En atención",
    className: "bg-violet-50 text-violet-700",
  },
  COMPLETED: {
    label: "Completada",
    className: "bg-emerald-50 text-emerald-700",
  },
  CANCELLED: { label: "Cancelada", className: "bg-red-50 text-red-700" },
  NO_SHOW: { label: "No asistió", className: "bg-zinc-100 text-zinc-600" },
};

function formatDate(booking: BookingConfirmation): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: booking.business.timezone,
  }).format(new Date(booking.startAt));
}

function formatPrice(booking: BookingConfirmation): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: booking.business.currency,
    maximumFractionDigits: 0,
  }).format(Number(booking.totalPrice));
}

function policyWindow(minutes: number): string {
  if (minutes === 0) return "hasta la hora de la cita";
  if (minutes % 1_440 === 0) {
    const days = minutes / 1_440;
    return `hasta ${days} ${days === 1 ? "día" : "días"} antes`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `hasta ${hours} ${hours === 1 ? "hora" : "horas"} antes`;
  }
  return `hasta ${minutes} minutos antes`;
}

export default function ManageGuestBookingView({
  businessSlug,
  confirmationCode,
}: {
  businessSlug: string;
  confirmationCode: string;
}) {
  const [managementToken, setManagementToken] = useState("");
  const [booking, setBooking] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [action, setAction] = useState<ManageAction>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referenceTime] = useState(() => Date.now());
  const managementTokenRef = useRef("");

  useEffect(() => {
    let active = true;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const tokenFromLink = hash.get("token") ?? "";
    const storedBooking = bookingConfirmationStorage.get();
    const token =
      tokenFromLink ||
      managementTokenRef.current ||
      bookingManagementTokenStorage.get(businessSlug, confirmationCode) ||
      (storedBooking?.confirmationCode === confirmationCode
        ? (storedBooking.managementToken ?? "")
        : "");

    if (!token || token.length > 200) {
      setPageError(
        "Este enlace no contiene la autorización necesaria para gestionar la reserva.",
      );
      setLoading(false);
      return () => {
        active = false;
      };
    }

    managementTokenRef.current = token;
    bookingManagementTokenStorage.save(businessSlug, confirmationCode, token);
    setManagementToken(token);

    if (tokenFromLink) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    async function loadAppointment() {
      try {
        const appointment = await getGuestManagedAppointment(
          businessSlug,
          confirmationCode,
          token,
        );
        if (active) setBooking(appointment);
      } catch (requestError) {
        if (active) {
          setPageError(
            requestError instanceof Error
              ? requestError.message
              : "No pudimos abrir esta reserva.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAppointment();

    return () => {
      active = false;
    };
  }, [businessSlug, confirmationCode]);

  const permissions = useMemo(() => {
    if (!booking) return { canCancel: false, canReschedule: false };
    const activeStatus =
      booking.status === "PENDING" || booking.status === "CONFIRMED";
    const minutesUntilStart =
      (new Date(booking.startAt).getTime() - referenceTime) / 60_000;
    return {
      canCancel:
        activeStatus &&
        booking.business.bookingPolicy.allowCancellation &&
        minutesUntilStart >=
          booking.business.bookingPolicy.cancellationMinimumMinutes,
      canReschedule:
        activeStatus &&
        booking.business.bookingPolicy.allowRescheduling &&
        minutesUntilStart >=
          booking.business.bookingPolicy.rescheduleMinimumMinutes,
    };
  }, [booking, referenceTime]);

  const openAction = (nextAction: ManageAction) => {
    setAction(nextAction);
    setActionError("");
    setNotice("");
    setCancelReason("");
  };

  const handleReschedule = async (startAt: string) => {
    if (!managementToken) return;
    setSubmitting(true);
    setActionError("");
    try {
      const updated = await rescheduleGuestManagedAppointment(
        businessSlug,
        confirmationCode,
        managementToken,
        startAt,
      );
      setBooking(updated);
      setAction(null);
      setNotice("Tu reserva fue reprogramada correctamente.");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos reprogramar la reserva.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = cancelReason.trim();
    if (reason.length < 3 || !managementToken) {
      setActionError("Indica brevemente por qué necesitas cancelar.");
      return;
    }

    setSubmitting(true);
    setActionError("");
    try {
      const updated = await cancelGuestManagedAppointment(
        businessSlug,
        confirmationCode,
        managementToken,
        reason,
      );
      setBooking(updated);
      setAction(null);
      setNotice("Tu reserva fue cancelada correctamente.");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cancelar la reserva.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const status = booking
    ? (STATUS_PRESENTATION[booking.status] ?? {
        label: booking.status,
        className: "bg-zinc-100 text-zinc-600",
      })
    : STATUS_PRESENTATION.PENDING;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <PublicHeader
        businessSlug={businessSlug}
        businessName={booking?.business.name}
      />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-3xl bg-white" />
            <div className="h-96 animate-pulse rounded-3xl bg-white" />
          </div>
        ) : pageError || !booking ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-xl">
              !
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              Reserva no disponible
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              {pageError || "No encontramos esta reserva."}
            </p>
            <Link
              href={`/${businessSlug}`}
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white"
            >
              Volver a la barbería
            </Link>
          </section>
        ) : (
          <>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Enlace privado
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Gestiona tu reserva
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  No necesitas crear una cuenta. Este enlace es tu acceso
                  seguro.
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
            </header>

            {notice && (
              <p
                role="status"
                className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
              >
                {notice}
              </p>
            )}

            <article className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="grid gap-5 bg-zinc-950 p-6 text-white sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                    Próxima visita
                  </p>
                  <p className="mt-2 text-xl font-semibold capitalize">
                    {formatDate(booking)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Con {booking.barber.displayName}
                  </p>
                </div>
                <p className="text-2xl font-semibold">{formatPrice(booking)}</p>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Servicios
                  </p>
                  <div className="mt-3 space-y-3">
                    {booking.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex justify-between gap-4 text-sm"
                      >
                        <span className="font-medium text-zinc-800">
                          {service.name}
                        </span>
                        <span className="text-zinc-500">
                          {service.durationMinutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-zinc-400">
                    Código {booking.confirmationCode}
                  </p>
                </div>

                <aside className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold">Política de cambios</p>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-600">
                    <li>
                      {booking.business.bookingPolicy.allowRescheduling
                        ? `Reprogramación ${policyWindow(booking.business.bookingPolicy.rescheduleMinimumMinutes)}.`
                        : "Reprogramación en línea desactivada."}
                    </li>
                    <li>
                      {booking.business.bookingPolicy.allowCancellation
                        ? `Cancelación ${policyWindow(booking.business.bookingPolicy.cancellationMinimumMinutes)}.`
                        : "Cancelación en línea desactivada."}
                    </li>
                  </ul>
                  {booking.business.bookingPolicy.policyText && (
                    <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-5 text-zinc-500">
                      {booking.business.bookingPolicy.policyText}
                    </p>
                  )}
                </aside>
              </div>

              {(booking.status === "PENDING" ||
                booking.status === "CONFIRMED") && (
                <div className="flex flex-col gap-3 border-t border-zinc-100 p-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={!permissions.canReschedule}
                    onClick={() =>
                      openAction(action === "reschedule" ? null : "reschedule")
                    }
                    className="min-h-11 rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reprogramar
                  </button>
                  <button
                    type="button"
                    disabled={!permissions.canCancel}
                    onClick={() =>
                      openAction(action === "cancel" ? null : "cancel")
                    }
                    className="min-h-11 rounded-xl px-5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cancelar reserva
                  </button>
                </div>
              )}

              {action === "reschedule" && (
                <AppointmentReschedulePicker
                  businessSlug={businessSlug}
                  barberId={booking.barber.id}
                  serviceIds={booking.services.map((service) => service.id)}
                  timeZone={booking.business.timezone}
                  submitting={submitting}
                  error={actionError}
                  onCancel={() => openAction(null)}
                  onConfirm={handleReschedule}
                />
              )}

              {action === "cancel" && (
                <form
                  onSubmit={handleCancel}
                  className="border-t border-red-100 bg-red-50/70 p-5 sm:p-6"
                >
                  <div className="max-w-2xl">
                    <h2 className="text-lg font-semibold">
                      Confirma la cancelación
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      Esta acción no se puede deshacer y libera la hora
                      inmediatamente.
                    </p>
                    <label
                      htmlFor="guest-cancel-reason"
                      className="mt-4 block text-sm font-semibold"
                    >
                      Motivo
                    </label>
                    <textarea
                      id="guest-cancel-reason"
                      rows={3}
                      maxLength={300}
                      required
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      className="mt-2 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
                      placeholder="Ej.: Tuve un imprevisto y no podré asistir."
                    />
                    {actionError && (
                      <p role="alert" className="mt-2 text-sm text-red-700">
                        {actionError}
                      </p>
                    )}
                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => openAction(null)}
                        className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold"
                      >
                        Mantener reserva
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="min-h-11 rounded-xl bg-red-700 px-5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {submitting ? "Cancelando..." : "Confirmar cancelación"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </article>
          </>
        )}
      </main>
    </div>
  );
}
