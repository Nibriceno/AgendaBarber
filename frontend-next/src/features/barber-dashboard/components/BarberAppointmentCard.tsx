import {
  BARBER_STATUS_PRESENTATION,
  formatTime,
  getBarberStatusActions,
  getCustomerName,
} from "../lib/barber-dashboard";

import type {
  BarberAppointment,
  BarberDashboardData,
  BarberStatusAction,
} from "../types/barber-dashboard.types";

type BarberAppointmentCardProps = {
  appointment: BarberAppointment;
  timezone: string;
  policies: BarberDashboardData["policies"];
  referenceTime: number;
  highlighted?: boolean;
  onAction: (
    appointment: BarberAppointment,
    action: BarberStatusAction,
  ) => void;
};

export default function BarberAppointmentCard({
  appointment,
  timezone,
  policies,
  referenceTime,
  highlighted = false,
  onAction,
}: BarberAppointmentCardProps) {
  const status =
    BARBER_STATUS_PRESENTATION[
      appointment.status
    ];

  const actions =
    getBarberStatusActions(
      appointment,
      policies,
      referenceTime,
    );

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
        highlighted
          ? "border-violet-300 ring-4 ring-violet-100/70"
          : "border-zinc-200"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${status.dotClassName}`}
      />

      <div className="grid gap-5 p-5 pl-6 lg:grid-cols-[108px_minmax(0,1fr)_minmax(210px,0.6fr)] lg:items-start lg:p-6 lg:pl-7">
        <div className="flex items-end justify-between gap-4 lg:block">
          <div>
            <p className="text-3xl font-semibold tracking-[-0.05em] tabular-nums text-zinc-950">
              {formatTime(
                appointment.startAt,
                timezone,
              )}
            </p>

            <p className="mt-1 text-xs tabular-nums text-zinc-500">
              hasta las{" "}
              {formatTime(
                appointment.endAt,
                timezone,
              )}
            </p>
          </div>

          <p className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 lg:mt-4 lg:inline-flex">
            {
              appointment.totalDurationMinutes
            }{" "}
            min
          </p>
        </div>

        <div className="min-w-0 border-t border-zinc-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}
            >
              {status.label}
            </span>

            {highlighted && (
              <span className="text-xs font-semibold text-violet-700">
                Atención actual
              </span>
            )}
          </div>

          <h3 className="mt-3 truncate text-lg font-semibold text-zinc-950 sm:text-xl">
            {getCustomerName(
              appointment,
            )}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {appointment.services.map(
              (service) => (
                <span
                  key={service.id}
                  className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                >
                  {
                    service.serviceName
                  }
                </span>
              ),
            )}
          </div>

          {appointment.customerNotes && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                Nota del cliente
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-950">
                {
                  appointment.customerNotes
                }
              </p>
            </div>
          )}

          {appointment.cancellationReason && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              Motivo: {appointment.cancellationReason}
            </p>
          )}
        </div>

        <div className="border-t border-zinc-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Contacto
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <a
              href={`tel:${appointment.customer.phone}`}
              className="flex min-h-11 items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <span className="truncate">
                {
                  appointment.customer.phone
                }
              </span>
              <span aria-hidden="true">
                ↗
              </span>
            </a>

            {appointment.customer.email && (
              <a
                href={`mailto:${appointment.customer.email}`}
                className="flex min-h-11 items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                <span className="truncate">
                  {
                    appointment.customer.email
                  }
                </span>
                <span aria-hidden="true">
                  ↗
                </span>
              </a>
            )}
          </div>

          {actions.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              {actions.map(
                (action) => (
                  <div
                    key={
                      action.status
                    }
                  >
                    <button
                      type="button"
                      disabled={
                        action.disabled
                      }
                      onClick={() =>
                        onAction(
                          appointment,
                          action,
                        )
                      }
                      className={`min-h-11 w-full rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${
                        action.destructive
                          ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                          : "bg-zinc-950 text-white hover:bg-zinc-800"
                      }`}
                    >
                      {action.label}
                    </button>

                    {action.disabledReason && (
                      <p className="mt-1.5 text-center text-[11px] leading-4 text-zinc-400">
                        {
                          action.disabledReason
                        }
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
