"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  getBookingSettings,
  updateBookingSettings,
} from "../api/booking-settings.api";
import type {
  BusinessBookingSettings,
  UpdateBusinessBookingSettings,
} from "../types/booking-settings.types";

const WINDOW_OPTIONS = [
  { value: 0, label: "Hasta la hora de la cita" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 240, label: "4 horas antes" },
  { value: 720, label: "12 horas antes" },
  { value: 1_440, label: "24 horas antes" },
  { value: 2_880, label: "48 horas antes" },
  { value: 10_080, label: "7 días antes" },
  { value: 20_160, label: "14 días antes" },
] as const;

const NO_SHOW_GRACE_OPTIONS = [
  { value: 0, label: "Sin espera" },
  { value: 5, label: "5 minutos" },
  { value: 10, label: "10 minutos" },
  { value: 15, label: "15 minutos" },
  { value: 20, label: "20 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
] as const;

function windowLabel(minutes: number): string {
  return (
    WINDOW_OPTIONS.find((option) => option.value === minutes)?.label ??
    `${minutes} minutos antes`
  );
}

function PolicyToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300">
      <span>
        <span className="block font-semibold text-zinc-950">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-zinc-500">
          {description}
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-7 w-12 rounded-full bg-zinc-200 transition peer-checked:bg-zinc-950 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function WindowSelect({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <span className="mb-2 block text-sm font-semibold text-zinc-800">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed"
      >
        {WINDOW_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function BookingSettingsView() {
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [form, setForm] = useState<UpdateBusinessBookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    void getBookingSettings()
      .then((settings) => {
        if (!active) return;

        setBusinessId(settings.id);
        setBusinessName(settings.name);
        setForm({
          cancellationMinimumMinutes: settings.cancellationMinimumMinutes,
          rescheduleMinimumMinutes: settings.rescheduleMinimumMinutes,
          allowClientCancellation: settings.allowClientCancellation,
          allowClientRescheduling: settings.allowClientRescheduling,
          cancellationPolicy: settings.cancellationPolicy ?? "",
          noShowGraceMinutes: settings.noShowGraceMinutes,
        });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "No pudimos cargar las políticas de reserva.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    if (!form) return [];

    return [
      form.allowClientCancellation
        ? `Cancelación en línea: ${windowLabel(form.cancellationMinimumMinutes)}`
        : "Cancelación en línea desactivada",
      form.allowClientRescheduling
        ? `Reprogramación en línea: ${windowLabel(form.rescheduleMinimumMinutes)}`
        : "Reprogramación en línea desactivada",
      `Inasistencia automática: ${form.noShowGraceMinutes} min después de la hora`,
    ];
  }, [form]);

  const updateField = <Key extends keyof UpdateBusinessBookingSettings>(
    field: Key,
    value: UpdateBusinessBookingSettings[Key],
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || businessId === null || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated: BusinessBookingSettings = await updateBookingSettings(
        businessId,
        {
          ...form,
          cancellationPolicy: form.cancellationPolicy?.trim() ?? "",
        },
      );

      setForm({
        cancellationMinimumMinutes: updated.cancellationMinimumMinutes,
        rescheduleMinimumMinutes: updated.rescheduleMinimumMinutes,
        allowClientCancellation: updated.allowClientCancellation,
        allowClientRescheduling: updated.allowClientRescheduling,
        cancellationPolicy: updated.cancellationPolicy ?? "",
        noShowGraceMinutes: updated.noShowGraceMinutes,
      });
      setNotice("Políticas guardadas. Ya se aplican a las próximas gestiones.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "No pudimos guardar los cambios."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[560px] animate-pulse rounded-3xl bg-white" />
        <div className="h-72 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  if (!form || businessId === null) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "No pudimos cargar la configuración."}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Experiencia del cliente
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Políticas de reserva
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Define qué puede hacer el cliente por su cuenta y hasta cuándo. El
            servidor aplica estas reglas también a los enlaces de invitados.
          </p>
        </header>

        <section className="space-y-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
          <PolicyToggle
            checked={form.allowClientCancellation}
            label="Permitir cancelación en línea"
            description="El cliente podrá cancelar desde su cuenta o desde su enlace privado."
            onChange={(checked) =>
              updateField("allowClientCancellation", checked)
            }
          />
          <PolicyToggle
            checked={form.allowClientRescheduling}
            label="Permitir reprogramación en línea"
            description="Conserva profesional y servicios; solo permite elegir otra hora disponible."
            onChange={(checked) =>
              updateField("allowClientRescheduling", checked)
            }
          />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-zinc-950">
            Ventanas de anticipación
          </h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Fuera de estos plazos el cliente verá que debe contactar a la
            barbería. El administrador y recepción conservan la gestión manual.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <WindowSelect
              id="cancellation-window"
              label="Cancelar hasta"
              value={form.cancellationMinimumMinutes}
              disabled={!form.allowClientCancellation}
              onChange={(value) =>
                updateField("cancellationMinimumMinutes", value)
              }
            />
            <WindowSelect
              id="reschedule-window"
              label="Reprogramar hasta"
              value={form.rescheduleMinimumMinutes}
              disabled={!form.allowClientRescheduling}
              onChange={(value) =>
                updateField("rescheduleMinimumMinutes", value)
              }
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <label htmlFor="no-show-grace" className="text-lg font-semibold">
            Cierre automático por inasistencia
          </label>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Si una reserva continúa pendiente después de este período, el
            sistema la marcará como No asistió, registrará el cambio y avisará
            al cliente por correo cuando tenga uno asociado.
          </p>
          <select
            id="no-show-grace"
            value={form.noShowGraceMinutes}
            onChange={(event) =>
              updateField("noShowGraceMinutes", Number(event.target.value))
            }
            className="mt-4 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200 sm:max-w-xs"
          >
            {NO_SHOW_GRACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} después de la hora
              </option>
            ))}
          </select>
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            Una reserva Confirmada o En atención nunca se cerrará
            automáticamente; solo se procesan las que continúan Pendientes.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <label htmlFor="policy-text" className="text-lg font-semibold">
            Mensaje para tus clientes
          </label>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Se muestra junto a las reglas. Explica cobros, devoluciones o cómo
            contactar al negocio en casos especiales.
          </p>
          <textarea
            id="policy-text"
            rows={5}
            maxLength={1000}
            value={form.cancellationPolicy ?? ""}
            onChange={(event) =>
              updateField("cancellationPolicy", event.target.value)
            }
            placeholder="Ej.: Si necesitas cambiar tu hora fuera del plazo, contáctanos por WhatsApp."
            className="mt-4 w-full resize-y rounded-2xl border border-zinc-300 px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
          />
          <p className="mt-2 text-right text-xs text-zinc-400">
            {(form.cancellationPolicy ?? "").length}/1000
          </p>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="bg-zinc-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Vista previa
            </p>
            <h3 className="mt-2 text-xl font-semibold">{businessName}</h3>
          </div>
          <div className="p-5">
            <p className="text-sm font-semibold text-zinc-950">
              Cambios y cancelaciones
            </p>
            <ul className="mt-3 space-y-3">
              {summary.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-zinc-600">
                  <span className="mt-1 text-emerald-600">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {form.cancellationPolicy && (
              <p className="mt-4 border-t border-zinc-100 pt-4 text-sm leading-6 text-zinc-500">
                {form.cancellationPolicy}
              </p>
            )}
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {notice}
          </p>
        )}
        <Button type="submit" disabled={saving} className="h-12 w-full">
          {saving ? "Guardando..." : "Guardar políticas"}
        </Button>
      </aside>
    </form>
  );
}
