"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import AppointmentReschedulePicker from "@/features/appointment-management/components/AppointmentReschedulePicker";
import { formatAppointmentMoney } from "@/features/appointment-management/lib/appointment-display";
import {
  getPublicBarbers,
  getPublicBusiness,
  getPublicServices,
} from "@/features/public-booking/api/public-booking.api";
import type {
  PublicBarber,
  PublicBusiness,
  PublicService,
} from "@/features/public-booking/types/public-booking.types";
import { getApiErrorMessage } from "@/lib/api/errors";

import { createManualAppointment } from "../api/admin-agenda.api";
import type { AppointmentSource } from "../types/admin-agenda.types";

type Props = {
  open: boolean;
  businessSlug: string;
  onClose: () => void;
  onCreated: (appointmentId: number) => void;
};

const fieldClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200";

export default function ManualAppointmentModal({
  open,
  businessSlug,
  onClose,
  onCreated,
}: Props) {
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [barbers, setBarbers] = useState<PublicBarber[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] =
    useState<Exclude<AppointmentSource, "ONLINE">>("PHONE");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [barberId, setBarberId] = useState<number | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    void Promise.all([
      getPublicBusiness(businessSlug, controller.signal),
      getPublicServices(businessSlug),
      getPublicBarbers(businessSlug),
    ])
      .then(([businessResult, servicesResult, barbersResult]) => {
        if (controller.signal.aborted) return;
        setBusiness(businessResult);
        setServices(servicesResult);
        setBarbers(barbersResult);
        setCatalogLoaded(true);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setCatalogLoaded(true);
        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible cargar servicios y profesionales.",
          ),
        );
      });

    return () => controller.abort();
  }, [businessSlug, open]);

  const eligibleBarbers = useMemo(
    () =>
      barbers.filter((barber) =>
        serviceIds.every((serviceId) =>
          barber.services.some(
            (assignment) => assignment.serviceId === serviceId,
          ),
        ),
      ),
    [barbers, serviceIds],
  );

  const selectedServices = services.filter((service) =>
    serviceIds.includes(service.id),
  );
  const total = selectedServices.reduce(
    (sum, service) => sum + Number(service.price),
    0,
  );
  const contactComplete = Boolean(
    firstName.trim() && lastName.trim() && phone.trim(),
  );
  const readyForSchedule = Boolean(
    business && contactComplete && serviceIds.length > 0 && barberId,
  );

  const toggleService = (serviceId: number) => {
    const nextServiceIds = serviceIds.includes(serviceId)
      ? serviceIds.filter((id) => id !== serviceId)
      : [...serviceIds, serviceId];
    const selectedBarber = barbers.find((barber) => barber.id === barberId);

    setServiceIds(nextServiceIds);

    if (
      selectedBarber &&
      !nextServiceIds.every((id) =>
        selectedBarber.services.some(
          (assignment) => assignment.serviceId === id,
        ),
      )
    ) {
      setBarberId(null);
    }
  };

  const handleCreate = async (startAt: string) => {
    if (!barberId || !contactComplete) return;

    setSubmitting(true);
    setError("");
    try {
      const appointment = await createManualAppointment({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        ...(email.trim() && { email: email.trim().toLowerCase() }),
        source,
        barberId,
        serviceIds,
        startAt,
        ...(customerNotes.trim() && { customerNotes: customerNotes.trim() }),
        ...(internalNotes.trim() && { internalNotes: internalNotes.trim() }),
      });
      onCreated(appointment.id);
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setServiceIds([]);
      setBarberId(null);
      setCustomerNotes("");
      setInternalNotes("");
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(requestError, "No fue posible crear la reserva."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={submitting}
      size="large"
      title="Nueva reserva manual"
      description="Registra una hora solicitada por teléfono o directamente en el local."
    >
      {!catalogLoaded ? (
        <div className="flex h-52 items-center justify-center text-sm text-zinc-500">
          Preparando la agenda...
        </div>
      ) : (
        <div className="space-y-7">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              1. Origen y cliente
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:w-80">
              {(
                [
                  ["PHONE", "Telefónica"],
                  ["IN_PERSON", "Presencial"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={source === value}
                  onClick={() => setSource(value)}
                  className={`h-11 rounded-xl border text-sm font-semibold transition ${source === value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-zinc-600">
                Nombre
                <input
                  value={firstName}
                  maxLength={80}
                  onChange={(event) => setFirstName(event.target.value)}
                  className={fieldClassName}
                />
              </label>
              <label className="text-xs font-semibold text-zinc-600">
                Apellido
                <input
                  value={lastName}
                  maxLength={80}
                  onChange={(event) => setLastName(event.target.value)}
                  className={fieldClassName}
                />
              </label>
              <label className="text-xs font-semibold text-zinc-600">
                Teléfono
                <input
                  type="tel"
                  value={phone}
                  maxLength={30}
                  placeholder="+56912345678"
                  onChange={(event) => setPhone(event.target.value)}
                  className={fieldClassName}
                />
              </label>
              <label className="text-xs font-semibold text-zinc-600">
                Correo{" "}
                <span className="font-normal text-zinc-400">(opcional)</span>
                <input
                  type="email"
                  value={email}
                  maxLength={150}
                  placeholder="cliente@correo.cl"
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClassName}
                />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Si el teléfono ya pertenece a un cliente, la cita se agregará a su
              cuenta. Si no, se creará como invitado.
            </p>
          </section>

          <section className="border-t border-zinc-100 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              2. Servicios
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {services.map((service) => {
                const selected = serviceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleService(service.id)}
                    className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-amber-400 bg-amber-50 ring-1 ring-amber-200" : "border-zinc-200 bg-white hover:border-zinc-400"}`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">
                        {service.name}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {service.durationMinutes} min
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {formatAppointmentMoney(
                        service.price,
                        business?.currency ?? "CLP",
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {serviceIds.length > 0 && (
              <p className="mt-3 text-right text-sm font-semibold text-zinc-900">
                Total estimado:{" "}
                {formatAppointmentMoney(total, business?.currency ?? "CLP")}
              </p>
            )}
          </section>

          <section className="border-t border-zinc-100 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              3. Profesional
            </p>
            {serviceIds.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                Selecciona al menos un servicio.
              </p>
            ) : eligibleBarbers.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                Ningún profesional realiza toda esta combinación de servicios.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleBarbers.map((barber) => (
                  <button
                    key={barber.id}
                    type="button"
                    aria-pressed={barberId === barber.id}
                    onClick={() => setBarberId(barber.id)}
                    className={`rounded-2xl border p-4 text-left transition ${barberId === barber.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400"}`}
                  >
                    <span className="block text-sm font-semibold">
                      {barber.displayName}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${barberId === barber.id ? "text-zinc-300" : "text-zinc-500"}`}
                    >
                      {barber.specialty || "Profesional"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-600">
              Nota del cliente{" "}
              <span className="font-normal text-zinc-400">(opcional)</span>
              <textarea
                value={customerNotes}
                maxLength={500}
                rows={3}
                onChange={(event) => setCustomerNotes(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <label className="text-xs font-semibold text-zinc-600">
              Nota interna{" "}
              <span className="font-normal text-zinc-400">(opcional)</span>
              <textarea
                value={internalNotes}
                maxLength={1000}
                rows={3}
                onChange={(event) => setInternalNotes(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </section>

          {!readyForSchedule ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-500">
              Completa los datos obligatorios, servicios y profesional para ver
              horarios disponibles.
            </div>
          ) : (
            <AppointmentReschedulePicker
              businessSlug={businessSlug}
              barberId={barberId!}
              serviceIds={serviceIds}
              timeZone={business!.timezone}
              submitting={submitting}
              error={error}
              onCancel={onClose}
              onConfirm={handleCreate}
              eyebrow="4. Fecha y hora"
              title="Selecciona un horario disponible"
              description="La disponibilidad se valida nuevamente al guardar para evitar cruces."
              cancelLabel="Cancelar"
              confirmLabel="Crear reserva"
            />
          )}

          {error && !readyForSchedule && (
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
