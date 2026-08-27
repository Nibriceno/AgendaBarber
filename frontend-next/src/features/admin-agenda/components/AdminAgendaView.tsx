"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import {
  APPOINTMENT_STATUS_CONFIG,
  formatAppointmentMoney,
  formatAppointmentTime,
} from "@/features/appointment-management/lib/appointment-display";
import type { AppointmentDisplayStatus } from "@/features/appointment-management/lib/appointment-display";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getAdminAgenda } from "../api/admin-agenda.api";
import type {
  AdminAgendaAppointment,
  AdminAgendaResponse,
} from "../types/admin-agenda.types";

type AgendaFilters = {
  date: string;
  status: "" | AppointmentDisplayStatus;
  barberId: string;
  search: string;
};

const PAGE_SIZE = 20;

function getBrowserDateKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDateKey(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);

  return shifted.toISOString().slice(0, 10);
}

function formatSelectedDate(date: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function AppointmentCard({
  appointment,
  timezone,
  currency,
}: {
  appointment: AdminAgendaAppointment;
  timezone: string;
  currency: string;
}) {
  const status = APPOINTMENT_STATUS_CONFIG[appointment.status];
  const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim();

  return (
    <li className="grid gap-4 border-b border-zinc-100 px-4 py-5 last:border-b-0 md:grid-cols-[92px_minmax(180px,1.35fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_110px] md:items-center md:px-5">
      <div className="flex items-baseline gap-2 md:block">
        <p className="text-lg font-semibold tabular-nums text-zinc-950">
          {formatAppointmentTime(appointment.startAt, timezone)}
        </p>
        <p className="text-xs tabular-nums text-zinc-400">
          hasta {formatAppointmentTime(appointment.endAt, timezone)}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-zinc-950">{customerName}</p>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {appointment.customer.isRegistered ? "Registrado" : "Invitado"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {appointment.customer.email || appointment.customer.phone}
        </p>
        {appointment.customer.email && (
          <p className="mt-0.5 text-xs text-zinc-400">{appointment.customer.phone}</p>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-800">
          {appointment.services.join(" · ") || "Sin servicio"}
        </p>
        <p className="mt-1 flex items-center gap-2 truncate text-xs text-zinc-500">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: appointment.barber.calendarColor || "#18181b" }}
          />
          {appointment.barber.displayName}
        </p>
      </div>

      <div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${status.className}`}
        >
          {status.label}
        </span>
        <p className="mt-1.5 text-[11px] text-zinc-400">
          Código {appointment.confirmationCode}
        </p>
      </div>

      <p className="text-sm font-semibold tabular-nums text-zinc-950 md:text-right">
        {formatAppointmentMoney(appointment.totalPrice, currency)}
      </p>
    </li>
  );
}

export default function AdminAgendaView({ businessSlug }: { businessSlug: string }) {
  const initialFilters: AgendaFilters = {
    date: getBrowserDateKey(),
    status: "",
    barberId: "",
    search: "",
  };
  const [draftFilters, setDraftFilters] = useState<AgendaFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<AgendaFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminAgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    void getAdminAgenda(
      {
        page,
        pageSize: PAGE_SIZE,
        date: appliedFilters.date,
        status: appliedFilters.status || undefined,
        barberId: appliedFilters.barberId
          ? Number(appliedFilters.barberId)
          : undefined,
        search: appliedFilters.search.trim() || undefined,
      },
      controller.signal,
    )
      .then((result) => {
        if (!active) return;

        setData(result);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!active || controller.signal.aborted) return;

        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible cargar la agenda. Inténtalo nuevamente.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    appliedFilters.barberId,
    appliedFilters.date,
    appliedFilters.search,
    appliedFilters.status,
    page,
    refreshKey,
  ]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setAppliedFilters({ ...draftFilters, search: draftFilters.search.trim() });
    setRefreshKey((current) => current + 1);
  };

  const changeDate = (date: string) => {
    const nextFilters = { ...appliedFilters, date };
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const clearFilters = () => {
    const cleared: AgendaFilters = {
      date: getBrowserDateKey(),
      status: "",
      barberId: "",
      search: "",
    };
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
    setPage(1);
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const changePage = (nextPage: number) => {
    if (!data || nextPage < 1 || nextPage > data.pagination.totalPages) return;

    setPage(nextPage);
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const firstItem = data && data.pagination.total > 0
    ? (data.pagination.page - 1) * data.pagination.pageSize + 1
    : 0;
  const lastItem = data
    ? Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)
    : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Operación diaria
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Agenda completa
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Consulta todas las reservas por día, profesional y estado. Cada
            página carga un máximo de {PAGE_SIZE} resultados.
          </p>
        </div>
        <Link
          href={`/${businessSlug}/admin/dashboard`}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Volver al dashboard
        </Link>
      </header>

      <Card className="p-4 sm:p-5">
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-[170px_180px_200px_minmax(220px,1fr)_auto] lg:items-end">
          <label className="text-xs font-semibold text-zinc-600">
            Fecha
            <input
              type="date"
              value={draftFilters.date}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, date: event.target.value }))
              }
              required
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <label className="text-xs font-semibold text-zinc-600">
            Estado
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value as AgendaFilters["status"],
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Todos</option>
              {Object.entries(APPOINTMENT_STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-zinc-600">
            Profesional
            <select
              value={draftFilters.barberId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  barberId: event.target.value,
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Todos</option>
              {data?.barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.displayName}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-zinc-600">
            Buscar cliente o código
            <input
              type="search"
              maxLength={100}
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Nombre, correo, teléfono o código"
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 lg:flex-none"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="capitalize font-semibold text-zinc-950">
              {formatSelectedDate(appliedFilters.date)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {data ? `${data.pagination.total} reserva${data.pagination.total === 1 ? "" : "s"} encontrada${data.pagination.total === 1 ? "" : "s"}` : "Cargando resultados"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => changeDate(shiftDateKey(appliedFilters.date, -1))}
              className="h-10 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              aria-label="Ver día anterior"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => changeDate(getBrowserDateKey())}
              className="h-10 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => changeDate(shiftDateKey(appliedFilters.date, 1))}
              className="h-10 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              aria-label="Ver día siguiente"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-5 py-12 text-center">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshKey((current) => current + 1);
              }}
              className="mt-4 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : loading && !data ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-zinc-800">No hay reservas con estos filtros</p>
            <p className="mt-2 text-sm text-zinc-500">Prueba otra fecha, estado o profesional.</p>
          </div>
        ) : (
          <div className={loading ? "opacity-55 transition" : "transition"} aria-busy={loading}>
            <div className="hidden grid-cols-[92px_minmax(180px,1.35fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_110px] gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 md:grid">
              <span>Horario</span><span>Cliente</span><span>Servicio y profesional</span><span>Estado</span><span className="text-right">Total</span>
            </div>
            <ul>
              {data?.items.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  timezone={data.timezone}
                  currency={data.currency}
                />
              ))}
            </ul>
          </div>
        )}

        {data && data.pagination.total > 0 && (
          <nav
            aria-label="Paginación de reservas"
            className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <p className="text-xs text-zinc-500">
              Mostrando {firstItem}–{lastItem} de {data.pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => changePage(page - 1)}
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="min-w-24 text-center text-xs font-medium text-zinc-600">
                Página {data.pagination.page} de {data.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.pagination.totalPages || loading}
                onClick={() => changePage(page + 1)}
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </nav>
        )}
      </Card>
    </div>
  );
}
