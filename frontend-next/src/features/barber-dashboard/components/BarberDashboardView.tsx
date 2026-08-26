"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import {
  getBarberDashboard,
  updateBarberAppointmentStatus,
} from "../api/barber-dashboard.api";

import {
  BARBER_STATUS_PRESENTATION,
  formatDateKey,
  formatTime,
  getCustomerName,
  getDateKeyInTimezone,
  getServicesLabel,
} from "../lib/barber-dashboard";

import type {
  BarberAppointment,
  BarberDashboardData,
  BarberStatusAction,
} from "../types/barber-dashboard.types";

import BarberAppointmentCard from "./BarberAppointmentCard";
import BarberDayNavigator from "./BarberDayNavigator";
import BarberStatusDialog from "./BarberStatusDialog";

type BarberDashboardViewProps = {
  businessSlug: string;
};

type AgendaFilter =
  | "all"
  | "active"
  | "closed";

function DashboardSkeleton() {
  return (
    <div
      aria-label="Cargando panel del barbero"
      className="space-y-6"
    >
      <div className="h-64 animate-pulse rounded-3xl bg-zinc-200/70" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-zinc-200/70"
          />
        ))}
      </div>

      <div className="h-40 animate-pulse rounded-3xl bg-zinc-200/70" />

      <div className="space-y-4">
        {[0, 1].map(
          (item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-3xl bg-zinc-200/70"
            />
          ),
        )}
      </div>
    </div>
  );
}

export default function BarberDashboardView({
  businessSlug,
}: BarberDashboardViewProps) {
  const {
    user,
  } = useAuth();

  const [data, setData] =
    useState<BarberDashboardData | null>(
      null,
    );

  const [selectedDate, setSelectedDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [filter, setFilter] =
    useState<AgendaFilter>(
      "all",
    );

  const [referenceTime, setReferenceTime] =
    useState(() =>
      Date.now(),
    );

  const [pendingAppointment, setPendingAppointment] =
    useState<BarberAppointment | null>(
      null,
    );

  const [pendingAction, setPendingAction] =
    useState<BarberStatusAction | null>(
      null,
    );

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const requestSequence =
    useRef(0);

  useEffect(() => {
    let active = true;

    const requestId =
      ++requestSequence.current;

    getBarberDashboard()
      .then((result) => {
        if (
          !active ||
          requestId !==
            requestSequence.current
        ) {
          return;
        }

        setData(result);
        setSelectedDate(
          result.date,
        );
        setError("");
        setReferenceTime(
          new Date(
            result.generatedAt,
          ).getTime(),
        );
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible cargar tu jornada.",
          ),
        );
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
    const timer =
      window.setInterval(
        () => {
          setReferenceTime(
            Date.now(),
          );
        },
        30_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          const requestId =
            ++requestSequence.current;

          void getBarberDashboard(
            selectedDate,
          )
            .then((result) => {
              if (
                requestId ===
                requestSequence.current
              ) {
                setData(result);
                setReferenceTime(
                  new Date(
                    result.generatedAt,
                  ).getTime(),
                );
                setError("");
              }
            })
            .catch(
              (requestError) => {
                if (
                  requestId ===
                  requestSequence.current
                ) {
                  setError(
                    getApiErrorMessage(
                      requestError,
                      "La actualización automática no pudo completarse.",
                    ),
                  );
                }
              },
            );
        },
        60_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [selectedDate]);

  const appointments =
    useMemo(
      () =>
        data?.appointments ??
        [],
      [data],
    );

  const summary =
    useMemo(() => {
      const active =
        appointments.filter(
          (appointment) =>
            appointment.status ===
              "PENDING" ||
            appointment.status ===
              "CONFIRMED" ||
            appointment.status ===
              "IN_PROGRESS",
        );

      const completed =
        appointments.filter(
          (appointment) =>
            appointment.status ===
            "COMPLETED",
        );

      const closed =
        appointments.filter(
          (appointment) =>
            appointment.status ===
              "COMPLETED" ||
            appointment.status ===
              "CANCELLED" ||
            appointment.status ===
              "NO_SHOW",
        );

      const scheduledMinutes =
        appointments
          .filter(
            (appointment) =>
              appointment.status !==
              "CANCELLED",
          )
          .reduce(
            (total, appointment) =>
              total +
              appointment.totalDurationMinutes,
            0,
          );

      return {
        active,
        completed,
        closed,
        scheduledMinutes,
      };
    }, [appointments]);

  const currentAppointment =
    appointments.find(
      (appointment) =>
        appointment.status ===
        "IN_PROGRESS",
    );

  const nextAppointment =
    appointments.find(
      (appointment) =>
        (appointment.status ===
          "PENDING" ||
          appointment.status ===
            "CONFIRMED") &&
        new Date(
          appointment.endAt,
        ).getTime() >=
          referenceTime,
    );

  const highlightedAppointment =
    currentAppointment ??
    nextAppointment;

  const visibleAppointments =
    appointments.filter(
      (appointment) => {
        if (filter === "active") {
          return (
            appointment.status ===
              "PENDING" ||
            appointment.status ===
              "CONFIRMED" ||
            appointment.status ===
              "IN_PROGRESS"
          );
        }

        if (filter === "closed") {
          return (
            appointment.status ===
              "COMPLETED" ||
            appointment.status ===
              "CANCELLED" ||
            appointment.status ===
              "NO_SHOW"
          );
        }

        return true;
      },
    );

  const handleSelectDate =
    async (date: string) => {
      if (
        !date ||
        date === selectedDate ||
        refreshing
      ) {
        return;
      }

      const previousDate =
        selectedDate;

      const requestId =
        ++requestSequence.current;

      setSelectedDate(date);
      setRefreshing(true);
      setError("");
      setNotice("");

      try {
        const result =
          await getBarberDashboard(
            date,
          );

        if (
          requestId !==
          requestSequence.current
        ) {
          return;
        }

        setData(result);
        setSelectedDate(
          result.date,
        );
        setReferenceTime(
          new Date(
            result.generatedAt,
          ).getTime(),
        );
        setFilter("all");
      } catch (requestError) {
        if (
          requestId !==
          requestSequence.current
        ) {
          return;
        }

        setSelectedDate(
          previousDate,
        );
        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible cambiar la fecha.",
          ),
        );
      } finally {
        if (
          requestId ===
          requestSequence.current
        ) {
          setRefreshing(false);
        }
      }
    };

  const handleRefresh =
    async () => {
      if (
        !selectedDate ||
        refreshing
      ) {
        return;
      }

      const requestId =
        ++requestSequence.current;

      setRefreshing(true);
      setError("");

      try {
        const result =
          await getBarberDashboard(
            selectedDate,
          );

        if (
          requestId !==
          requestSequence.current
        ) {
          return;
        }

        setData(result);
        setReferenceTime(
          new Date(
            result.generatedAt,
          ).getTime(),
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "No fue posible actualizar la jornada.",
          ),
        );
      } finally {
        if (
          requestId ===
          requestSequence.current
        ) {
          setRefreshing(false);
        }
      }
    };

  const openStatusAction = (
    appointment: BarberAppointment,
    action: BarberStatusAction,
  ) => {
    if (action.disabled) {
      return;
    }

    setPendingAppointment(
      appointment,
    );
    setPendingAction(action);
    setActionError("");
  };

  const closeStatusAction =
    () => {
      if (actionLoading) {
        return;
      }

      setPendingAppointment(
        null,
      );
      setPendingAction(null);
      setActionError("");
    };

  const confirmStatusAction =
    async () => {
      if (
        !pendingAppointment ||
        !pendingAction ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(true);
      setActionError("");
      setNotice("");

      try {
        const updated =
          await updateBarberAppointmentStatus(
            pendingAppointment.id,
            pendingAction.status,
          );

        setData(
          (current) =>
            current
              ? {
                  ...current,
                  generatedAt:
                    new Date().toISOString(),
                  appointments:
                    current.appointments.map(
                      (appointment) =>
                        appointment.id ===
                        updated.id
                          ? updated
                          : appointment,
                    ),
                }
              : current,
        );

        setReferenceTime(
          Date.now(),
        );
        setNotice(
          `Reserva actualizada a ${BARBER_STATUS_PRESENTATION[
            pendingAction.status
          ].label.toLowerCase()}.`,
        );
        setPendingAppointment(
          null,
        );
        setPendingAction(null);
      } catch (requestError) {
        setActionError(
          getApiErrorMessage(
            requestError,
            "No fue posible actualizar la reserva.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  if (
    loading &&
    !data
  ) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-semibold text-red-900">
          No pudimos cargar tu panel
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 text-sm font-semibold text-white"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  const today =
    getDateKeyInTimezone(
      data.generatedAt,
      data.timezone,
    );

  const selectedDateIsToday =
    selectedDate === today;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-zinc-950 p-6 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_0.9fr] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Mi jornada
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Hola
              {user?.firstName
                ? `, ${user.firstName}`
                : ""}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              Revisa tu agenda, contacta al cliente y actualiza cada atención desde un solo lugar.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {data.barber.displayName}
              </span>

              {data.barber.specialty && (
                <span>
                  {data.barber.specialty}
                </span>
              )}

              <span>
                {data.timezone}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                {currentAppointment
                  ? "Atención actual"
                  : nextAppointment
                    ? "Próxima cita"
                    : "Estado de la agenda"}
              </p>

              {highlightedAppointment && (
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    BARBER_STATUS_PRESENTATION[
                      highlightedAppointment.status
                    ].dotClassName
                  }`}
                />
              )}
            </div>

            {highlightedAppointment ? (
              <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                <p className="text-3xl font-semibold tracking-[-0.05em] tabular-nums">
                  {formatTime(
                    highlightedAppointment.startAt,
                    data.timezone,
                  )}
                </p>

                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {getCustomerName(
                      highlightedAppointment,
                    )}
                  </p>

                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {getServicesLabel(
                      highlightedAppointment,
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xl font-semibold">
                  Jornada despejada
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  No quedan atenciones activas para esta fecha.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        aria-label="Resumen de la jornada"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label:
              "Reservas del día",
            value:
              appointments.length,
            detail:
              selectedDateIsToday
                ? "Agenda de hoy"
                : "En la fecha elegida",
          },
          {
            label: "Por atender",
            value:
              summary.active.length,
            detail:
              "Pendientes o activas",
          },
          {
            label: "Completadas",
            value:
              summary.completed.length,
            detail:
              appointments.length > 0
                ? `${Math.round(
                    (summary.completed.length /
                      appointments.length) *
                      100,
                  )}% de la agenda`
                : "Sin atenciones aún",
          },
          {
            label:
              "Tiempo reservado",
            value: `${Math.floor(
              summary.scheduledMinutes /
                60,
            )}h ${
              summary.scheduledMinutes %
              60
            }m`,
            detail:
              "Sin citas canceladas",
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              {metric.label}
            </p>

            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
              {metric.value}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {metric.detail}
            </p>
          </article>
        ))}
      </section>

      <BarberDayNavigator
        selectedDate={selectedDate}
        generatedAt={data.generatedAt}
        timezone={data.timezone}
        loading={refreshing}
        onSelectDate={(date) =>
          void handleSelectDate(
            date,
          )
        }
      />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            className="shrink-0 font-semibold underline underline-offset-4"
          >
            Reintentar
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
        >
          {notice}
        </div>
      )}

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Agenda personal
            </p>

            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-zinc-950">
              {formatDateKey(
                selectedDate,
                {
                  weekday:
                    "long",
                  day: "numeric",
                  month: "long",
                },
              )}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                void handleRefresh()
              }
              className="min-h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {refreshing
                ? "Actualizando..."
                : "Actualizar"}
            </button>

            <Link
              href={`/${businessSlug}`}
              className="inline-flex min-h-10 items-center rounded-xl bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              Ver página pública
            </Link>
          </div>
        </div>

        <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          {(
            [
              {
                id: "all",
                label: "Todas",
                count:
                  appointments.length,
              },
              {
                id: "active",
                label: "Activas",
                count:
                  summary.active.length,
              },
              {
                id: "closed",
                label: "Cerradas",
                count:
                  summary.closed.length,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setFilter(
                  item.id,
                )
              }
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                filter === item.id
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              {item.label}
              <span className="ml-1.5 opacity-60">
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {refreshing ? (
          <div
            aria-live="polite"
            className="mt-5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500"
          >
            Actualizando agenda…
          </div>
        ) : visibleAppointments.length ===
          0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-xl text-zinc-500">
              ✓
            </div>

            <h4 className="mt-5 text-lg font-semibold text-zinc-950">
              {appointments.length ===
              0
                ? "No tienes reservas este día"
                : "No hay citas en este filtro"}
            </h4>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {appointments.length ===
              0
                ? "Puedes revisar otra fecha desde el selector superior."
                : "Cambia el filtro para volver a ver el resto de tu agenda."}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {visibleAppointments.map(
              (appointment) => (
                <BarberAppointmentCard
                  key={
                    appointment.id
                  }
                  appointment={
                    appointment
                  }
                  timezone={
                    data.timezone
                  }
                  policies={
                    data.policies
                  }
                  referenceTime={
                    referenceTime
                  }
                  highlighted={
                    currentAppointment?.id ===
                    appointment.id
                  }
                  onAction={
                    openStatusAction
                  }
                />
              ),
            )}
          </div>
        )}
      </section>

      <BarberStatusDialog
        appointment={
          pendingAppointment
        }
        action={pendingAction}
        loading={actionLoading}
        error={actionError}
        onClose={
          closeStatusAction
        }
        onConfirm={() =>
          void confirmStatusAction()
        }
      />
    </div>
  );
}
