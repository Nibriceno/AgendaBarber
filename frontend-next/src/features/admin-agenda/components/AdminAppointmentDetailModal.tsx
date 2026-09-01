"use client";

import { FormEvent, useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import AppointmentReschedulePicker from "@/features/appointment-management/components/AppointmentReschedulePicker";
import {
  APPOINTMENT_STATUS_CONFIG,
  formatAppointmentMoney,
  formatAppointmentTime,
} from "@/features/appointment-management/lib/appointment-display";
import type { AppointmentDisplayStatus } from "@/features/appointment-management/lib/appointment-display";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  cancelAdminAppointment,
  getAdminAppointment,
  rescheduleAdminAppointment,
  updateAdminAppointmentStatus,
} from "../api/admin-agenda.api";
import type {
  AdminAppointmentDetail,
  AppointmentSource,
} from "../types/admin-agenda.types";

type Props = {
  appointmentId: number | null;
  businessSlug: string;
  timezone: string;
  currency: string;
  onClose: () => void;
  onChanged: () => void;
};

const SOURCE_LABELS: Record<AppointmentSource, string> = {
  ONLINE: "Reserva web",
  PHONE: "Reserva telefónica",
  IN_PERSON: "Reserva presencial",
};

const STATUS_TRANSITIONS: Record<
  AppointmentDisplayStatus,
  AppointmentDisplayStatus[]
> = {
  PENDING: ["CONFIRMED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function formatDateTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(new Date(value));
}

export default function AdminAppointmentDetailModal({
  appointmentId,
  businessSlug,
  timezone,
  currency,
  onClose,
  onChanged,
}: Props) {
  const [appointment, setAppointment] = useState<AdminAppointmentDetail | null>(
    null,
  );
  const [action, setAction] = useState<"details" | "reschedule" | "cancel">(
    "details",
  );
  const [pendingStatus, setPendingStatus] =
    useState<AppointmentDisplayStatus | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appointmentId) {
      return;
    }

    const controller = new AbortController();

    void getAdminAppointment(appointmentId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setAppointment(result);
          setError("");
          setAction("details");
          setPendingStatus(null);
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          getApiErrorMessage(requestError, "No fue posible abrir la reserva."),
        );
      });

    return () => controller.abort();
  }, [appointmentId]);

  const replaceAppointment = (result: AdminAppointmentDetail) => {
    setAppointment(result);
    setAction("details");
    setPendingStatus(null);
    setCancellationReason("");
    setError("");
    onChanged();
  };

  const changeStatus = async () => {
    if (!appointment || !pendingStatus) return;
    setSubmitting(true);
    setError("");
    try {
      replaceAppointment(
        await updateAdminAppointmentStatus(appointment.id, pendingStatus),
      );
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(requestError, "No fue posible cambiar el estado."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reschedule = async (startAt: string) => {
    if (!appointment) return;
    setSubmitting(true);
    setError("");
    try {
      replaceAppointment(
        await rescheduleAdminAppointment(appointment.id, startAt),
      );
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(
          requestError,
          "No fue posible reprogramar la reserva.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!appointment || cancellationReason.trim().length < 3) return;
    setSubmitting(true);
    setError("");
    try {
      replaceAppointment(
        await cancelAdminAppointment(appointment.id, cancellationReason.trim()),
      );
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(requestError, "No fue posible cancelar la reserva."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canManageSchedule =
    appointment?.status === "PENDING" || appointment?.status === "CONFIRMED";
  const loading =
    appointmentId !== null && appointment?.id !== appointmentId && !error;

  return (
    <Modal
      open={appointmentId !== null}
      onClose={onClose}
      closeDisabled={submitting}
      size="large"
      title={
        appointment
          ? `Reserva ${appointment.confirmationCode}`
          : "Detalle de reserva"
      }
      description="Información completa, historial y acciones operativas de la cita."
    >
      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
          Cargando detalle...
        </div>
      ) : !appointment ? (
        <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
          {error || "La reserva no está disponible."}
        </div>
      ) : action === "reschedule" ? (
        <AppointmentReschedulePicker
          businessSlug={businessSlug}
          barberId={appointment.barberId}
          serviceIds={appointment.services.map((service) => service.serviceId)}
          timeZone={timezone}
          submitting={submitting}
          error={error}
          onCancel={() => {
            setAction("details");
            setError("");
          }}
          onConfirm={reschedule}
        />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl bg-zinc-950 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${APPOINTMENT_STATUS_CONFIG[appointment.status].className}`}
                >
                  {APPOINTMENT_STATUS_CONFIG[appointment.status].label}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-200">
                  {SOURCE_LABELS[appointment.source]}
                </span>
              </div>
              <p className="mt-4 text-xl font-semibold capitalize">
                {formatDateTime(appointment.startAt, timezone)}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatAppointmentTime(appointment.startAt, timezone)}–
                {formatAppointmentTime(appointment.endAt, timezone)} ·{" "}
                {appointment.totalDurationMinutes} min
              </p>
            </div>
            <p className="mt-4 text-2xl font-semibold sm:mt-0">
              {formatAppointmentMoney(appointment.totalPrice, currency)}
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Cliente
              </p>
              <p className="mt-3 font-semibold text-zinc-950">
                {appointment.customer.firstName} {appointment.customer.lastName}
              </p>
              <a
                href={`tel:${appointment.customer.phone}`}
                className="mt-2 block text-sm text-zinc-600 hover:text-zinc-950"
              >
                {appointment.customer.phone}
              </a>
              {appointment.customer.email && (
                <a
                  href={`mailto:${appointment.customer.email}`}
                  className="mt-1 block truncate text-sm text-zinc-600 hover:text-zinc-950"
                >
                  {appointment.customer.email}
                </a>
              )}
              <span className="mt-3 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                {appointment.customer.isRegistered
                  ? "Cliente registrado"
                  : "Cliente invitado"}
              </span>
            </section>

            <section className="rounded-2xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Profesional y servicios
              </p>
              <p className="mt-3 font-semibold text-zinc-950">
                {appointment.barber.displayName}
              </p>
              <ul className="mt-3 space-y-2">
                {appointment.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex justify-between gap-3 text-sm text-zinc-600"
                  >
                    <span>
                      {service.serviceName} · {service.durationMinutes} min
                    </span>
                    <span className="font-medium text-zinc-900">
                      {formatAppointmentMoney(service.finalPrice, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              {Number(appointment.discountAmount) > 0 && (
                <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-emerald-700">
                  Descuento: −
                  {formatAppointmentMoney(appointment.discountAmount, currency)}
                </p>
              )}
            </section>
          </div>

          {(appointment.customerNotes ||
            appointment.internalNotes ||
            appointment.cancellationReason) && (
            <section className="grid gap-3 sm:grid-cols-2">
              {appointment.customerNotes && (
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold text-zinc-500">
                    Nota del cliente
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {appointment.customerNotes}
                  </p>
                </div>
              )}
              {appointment.internalNotes && (
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-700">
                    Nota interna
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {appointment.internalNotes}
                  </p>
                </div>
              )}
              {appointment.cancellationReason && (
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs font-semibold text-red-700">
                    Motivo de cancelación
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {appointment.cancellationReason}
                  </p>
                </div>
              )}
            </section>
          )}

          {(canManageSchedule ||
            STATUS_TRANSITIONS[appointment.status].length > 0) && (
            <section className="rounded-2xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Acciones
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {canManageSchedule && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setAction("reschedule");
                      setError("");
                    }}
                    className="h-10 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Reprogramar
                  </button>
                )}
                {STATUS_TRANSITIONS[appointment.status].map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={submitting}
                    onClick={() => setPendingStatus(status)}
                    className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    Marcar{" "}
                    {APPOINTMENT_STATUS_CONFIG[status].label.toLowerCase()}
                  </button>
                ))}
                {canManageSchedule && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setAction("cancel");
                      setPendingStatus(null);
                      setError("");
                    }}
                    className="h-10 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Cancelar cita
                  </button>
                )}
              </div>

              {pendingStatus && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-amber-900">
                    ¿Confirmas cambiar el estado a{" "}
                    <strong>
                      {APPOINTMENT_STATUS_CONFIG[pendingStatus].label}
                    </strong>
                    ?
                  </p>
                  <div className="mt-3 flex gap-2 sm:mt-0">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setPendingStatus(null)}
                      className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void changeStatus()}
                      className="h-9 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? "Guardando..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}

              {action === "cancel" && (
                <form
                  onSubmit={cancel}
                  className="mt-4 rounded-xl bg-red-50 p-4"
                >
                  <label className="text-xs font-semibold text-red-800">
                    Motivo de cancelación
                    <textarea
                      required
                      minLength={3}
                      maxLength={300}
                      rows={3}
                      value={cancellationReason}
                      onChange={(event) =>
                        setCancellationReason(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </label>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setAction("details")}
                      className="h-9 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting || cancellationReason.trim().length < 3
                      }
                      className="h-9 rounded-lg bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? "Cancelando..." : "Confirmar cancelación"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Historial
            </p>
            <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4">
              {appointment.history.map((entry) => (
                <li
                  key={entry.id}
                  className="relative text-sm before:absolute before:-left-[21px] before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-zinc-400 before:ring-4 before:ring-white"
                >
                  <p className="font-medium text-zinc-800">
                    {APPOINTMENT_STATUS_CONFIG[entry.newStatus].label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDateTime(entry.createdAt, timezone)}
                    {entry.comment ? ` · ${entry.comment}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
