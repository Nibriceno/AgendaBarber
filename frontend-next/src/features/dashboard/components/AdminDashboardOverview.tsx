"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  Card,
} from "@/components/ui/Card";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

import {
  getAdminDashboardSummary,
} from "../api/admin-dashboard.api";

import type {
  AdminDashboardSummary,
  DashboardAppointment,
  DashboardAppointmentStatus,
} from "../types/admin-dashboard.types";

type AdminDashboardOverviewProps = {
  businessSlug: string;
};

const STATUS_CONFIG: Record<
  DashboardAppointmentStatus,
  {
    label: string;
    className: string;
  }
> = {
  PENDING: {
    label: "Pendiente",
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  CONFIRMED: {
    label: "Confirmada",
    className:
      "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  IN_PROGRESS: {
    label: "En atención",
    className:
      "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  COMPLETED: {
    label: "Completada",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  CANCELLED: {
    label: "Cancelada",
    className:
      "bg-red-50 text-red-700 ring-red-600/20",
  },
  NO_SHOW: {
    label: "No asistió",
    className:
      "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  },
};

function formatMoney(
  value: string,
  currency: string,
) {
  const amount =
    Number(value);

  try {
    return new Intl.NumberFormat(
      "es-CL",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      },
    ).format(
      Number.isFinite(amount)
        ? amount
        : 0,
    );
  } catch {
    return `$${new Intl.NumberFormat(
      "es-CL",
    ).format(
      Number.isFinite(amount)
        ? amount
        : 0,
    )}`;
  }
}

function formatDashboardDate(
  date: string,
) {
  return new Intl.DateTimeFormat(
    "es-CL",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(
      `${date}T12:00:00.000Z`,
    ),
  );
}

function formatTime(
  date: string,
  timezone: string,
) {
  return new Intl.DateTimeFormat(
    "es-CL",
    {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: timezone,
    },
  ).format(
    new Date(date),
  );
}

function getInitials(
  name: string,
) {
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

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone:
    | "dark"
    | "amber"
    | "emerald"
    | "sky";
};

function MetricCard({
  label,
  value,
  detail,
  tone,
}: MetricCardProps) {
  const toneClasses = {
    dark: "bg-zinc-950 text-white",
    amber:
      "bg-amber-50 text-amber-950 ring-1 ring-amber-200",
    emerald:
      "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200",
    sky: "bg-sky-50 text-sky-950 ring-1 ring-sky-200",
  }[tone];

  const detailClasses =
    tone === "dark"
      ? "text-zinc-400"
      : "text-zinc-600";

  return (
    <article
      className={`rounded-2xl p-5 shadow-sm ${toneClasses}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
        {label}
      </p>

      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
        {value}
      </p>

      <p
        className={`mt-2 text-xs ${detailClasses}`}
      >
        {detail}
      </p>
    </article>
  );
}

function AppointmentRow({
  appointment,
  timezone,
  currency,
}: {
  appointment: DashboardAppointment;
  timezone: string;
  currency: string;
}) {
  const status =
    STATUS_CONFIG[
      appointment.status
    ];

  return (
    <li className="grid gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div>
        <p className="text-lg font-semibold tabular-nums text-zinc-950">
          {formatTime(
            appointment.startAt,
            timezone,
          )}
        </p>

        <p className="text-[11px] tabular-nums text-zinc-400">
          hasta{" "}
          {formatTime(
            appointment.endAt,
            timezone,
          )}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-zinc-950">
            {
              appointment.customerName
            }
          </p>

          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <p className="mt-1 truncate text-xs text-zinc-500">
          {appointment.services.join(
            " · ",
          ) || "Sin servicio"}
        </p>

        <p className="mt-1 text-xs text-zinc-400">
          con{" "}
          {
            appointment.barber.displayName
          }
        </p>
      </div>

      <p className="text-sm font-semibold tabular-nums text-zinc-950 sm:text-right">
        {formatMoney(
          appointment.totalPrice,
          currency,
        )}
      </p>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div
      aria-label="Cargando dashboard"
      className="space-y-6"
    >
      <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/70" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-zinc-200/70"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200/70" />
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200/70" />
      </div>
    </div>
  );
}

export default function AdminDashboardOverview({
  businessSlug,
}: AdminDashboardOverviewProps) {
  const {
    user,
  } = useAuth();

  const [summary, setSummary] =
    useState<AdminDashboardSummary | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    getAdminDashboardSummary()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setSummary(result);
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible cargar el dashboard.",
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh =
    async () => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);
      setError(null);

      try {
        setSummary(
          await getAdminDashboardSummary(),
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible actualizar el dashboard.",
          ),
        );
      } finally {
        setRefreshing(false);
      }
    };

  if (!summary && !error) {
    return <DashboardSkeleton />;
  }

  if (!summary) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold text-zinc-950">
          No pudimos cargar el resumen
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
          {error}
        </p>

        <button
          type="button"
          onClick={
            handleRefresh
          }
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Intentar nuevamente
        </button>
      </Card>
    );
  }

  const maxServiceBookings =
    Math.max(
      ...summary.topServices.map(
        (service) =>
          service.bookings,
      ),
      1,
    );

  const quickActions =
    user?.role === "ADMIN"
      ? [
          {
            label: "Servicios",
            description:
              "Precios y duración",
            href: `/${businessSlug}/services`,
          },
          {
            label: "Personal",
            description:
              "Accesos y equipo",
            href: `/${businessSlug}/staff`,
          },
          {
            label: "Horarios",
            description:
              "Disponibilidad semanal",
            href: `/${businessSlug}/schedules`,
          },
        ]
      : [
          {
            label: "Barberos",
            description:
              "Equipo disponible",
            href: `/${businessSlug}/barbers`,
          },
          {
            label: "Horarios",
            description:
              "Disponibilidad semanal",
            href: `/${businessSlug}/schedules`,
          },
        ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            Resumen operativo
          </p>

          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-3xl">
            Hola
            {user?.firstName
              ? `, ${user.firstName}`
              : ""}
          </h2>

          <p className="mt-2 capitalize text-sm text-zinc-500">
            {formatDashboardDate(
              summary.periods.today,
            )}
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={
            handleRefresh
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 5v6h-6" />
          </svg>
          {refreshing
            ? "Actualizando"
            : "Actualizar datos"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {error}
        </div>
      )}

      <section
        aria-label="Indicadores principales"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Reservas de hoy"
          value={String(
            summary.today
              .activeAppointments,
          )}
          detail={`${summary.today.completed} completadas · ${summary.today.totalAppointments} registradas`}
          tone="dark"
        />

        <MetricCard
          label="Ingresos de hoy"
          value={formatMoney(
            summary.today.revenue,
            summary.currency,
          )}
          detail="Solo reservas completadas"
          tone="emerald"
        />

        <MetricCard
          label="Ingresos del mes"
          value={formatMoney(
            summary.month.revenue,
            summary.currency,
          )}
          detail={`${summary.month.completedAppointments} reservas completadas`}
          tone="amber"
        />

        <MetricCard
          label="Clientes"
          value={String(
            summary.clients.total,
          )}
          detail={`+${summary.clients.newThisMonth} nuevos este mes`}
          tone="sky"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-4 py-4 sm:px-5">
            <div>
              <h3 className="font-semibold text-zinc-950">
                Agenda de hoy
              </h3>

              <p className="mt-1 text-xs text-zinc-500">
                Ordenada por hora de atención
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
              {
                summary.today
                  .totalAppointments
              }
            </span>
          </div>

          {summary.today.appointments
            .length === 0 ? (
            <div className="flex min-h-72 items-center justify-center px-6 py-10 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  >
                    <path d="M7 3v3M17 3v3M4 9h16" />
                    <rect x="4" y="5" width="16" height="16" rx="3" />
                  </svg>
                </div>

                <p className="mt-4 font-medium text-zinc-800">
                  No hay reservas para hoy
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Las nuevas reservas aparecerán aquí automáticamente.
                </p>
              </div>
            </div>
          ) : (
            <ul>
              {summary.today.appointments.map(
                (appointment) => (
                  <AppointmentRow
                    key={
                      appointment.id
                    }
                    appointment={
                      appointment
                    }
                    timezone={
                      summary.timezone
                    }
                    currency={
                      summary.currency
                    }
                  />
                ),
              )}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-zinc-950">
            Estado de la jornada
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            Distribución de las reservas de hoy
          </p>

          <div className="mt-6 space-y-5">
            {[
              {
                label: "Pendientes",
                value:
                  summary.today.pending,
                color: "bg-amber-400",
              },
              {
                label: "Confirmadas",
                value:
                  summary.today.confirmed,
                color: "bg-sky-500",
              },
              {
                label: "En atención",
                value:
                  summary.today.inProgress,
                color: "bg-violet-500",
              },
              {
                label: "Completadas",
                value:
                  summary.today.completed,
                color: "bg-emerald-500",
              },
              {
                label: "Canceladas / no asistió",
                value:
                  summary.today.cancelled +
                  summary.today.noShow,
                color: "bg-zinc-400",
              },
            ].map((item) => {
              const percentage =
                summary.today
                  .totalAppointments >
                0
                  ? (item.value /
                      summary.today
                        .totalAppointments) *
                    100
                  : 0;

              return (
                <div
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-600">
                      {item.label}
                    </span>

                    <span className="font-semibold tabular-nums text-zinc-950">
                      {item.value}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-zinc-950">
              Servicios más reservados
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              Reservas confirmadas o completadas · últimos 30 días
            </p>
          </div>

          {summary.topServices.length ===
          0 ? (
            <p className="mt-8 rounded-xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
              Aún no hay datos suficientes.
            </p>
          ) : (
            <ol className="mt-6 space-y-5">
              {summary.topServices.map(
                (service, index) => (
                  <li
                    key={`${service.serviceId}-${service.name}`}
                  >
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {index + 1}.{" "}
                          {service.name}
                        </p>

                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatMoney(
                            service.revenue,
                            summary.currency,
                          )}{" "}
                          generado
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-950">
                        {service.bookings}{" "}
                        {service.bookings ===
                        1
                          ? "reserva"
                          : "reservas"}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-950"
                        style={{
                          width: `${(service.bookings / maxServiceBookings) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-5 sm:px-6">
            <h3 className="font-semibold text-zinc-950">
              Desempeño del equipo
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              Reservas completadas · últimos 30 días
            </p>
          </div>

          {summary.teamPerformance
            .length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-zinc-500">
              Aún no hay profesionales activos.
            </p>
          ) : (
            <ol>
              {summary.teamPerformance.map(
                (member, index) => (
                  <li
                    key={
                      member.barberId
                    }
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:px-6"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        backgroundColor:
                          member.calendarColor ||
                          "#18181b",
                      }}
                    >
                      {getInitials(
                        member.displayName,
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {index + 1}.{" "}
                        {
                          member.displayName
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        {
                          member.completedAppointments
                        }{" "}
                        completadas · Ticket{" "}
                        {formatMoney(
                          member.averageTicket,
                          summary.currency,
                        )}
                      </p>
                    </div>

                    <p className="text-sm font-semibold tabular-nums text-zinc-950">
                      {formatMoney(
                        member.revenue,
                        summary.currency,
                      )}
                    </p>
                  </li>
                ),
              )}
            </ol>
          )}
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">
            Accesos rápidos
          </h3>

          <p className="text-xs text-zinc-400">
            Gestión diaria
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map(
            (action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              >
                <div>
                  <p className="font-semibold text-zinc-950">
                    {action.label}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {
                      action.description
                    }
                  </p>
                </div>

                <span className="text-lg text-zinc-300 transition group-hover:translate-x-1 group-hover:text-zinc-700">
                  →
                </span>
              </Link>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
