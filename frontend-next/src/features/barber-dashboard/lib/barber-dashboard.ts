import type {
  BarberAppointment,
  BarberAppointmentStatus,
  BarberDashboardData,
  BarberStatusAction,
} from "../types/barber-dashboard.types";

export const BARBER_STATUS_PRESENTATION: Record<
  BarberAppointmentStatus,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dotClassName: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmada",
    className: "bg-sky-50 text-sky-800 ring-sky-600/20",
    dotClassName: "bg-sky-500",
  },
  IN_PROGRESS: {
    label: "En atención",
    className: "bg-violet-50 text-violet-800 ring-violet-600/20",
    dotClassName: "bg-violet-500",
  },
  COMPLETED: {
    label: "Completada",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    dotClassName: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "bg-red-50 text-red-700 ring-red-600/20",
    dotClassName: "bg-red-500",
  },
  NO_SHOW: {
    label: "No asistió",
    className: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
    dotClassName: "bg-zinc-500",
  },
};

export function addDaysToDateKey(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);

  const result = new Date(Date.UTC(year, month - 1, day + days));

  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDateKey(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("es-CL", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function getDateKeyInTimezone(
  value: string | Date,
  timezone: string,
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(new Date(value));
}

export function getCustomerName(appointment: BarberAppointment): string {
  return `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim();
}

export function getServicesLabel(appointment: BarberAppointment): string {
  return appointment.services.map((service) => service.serviceName).join(" + ");
}

export function getBarberStatusActions(
  appointment: BarberAppointment,
  policies: BarberDashboardData["policies"],
  referenceTime: number,
): BarberStatusAction[] {
  if (appointment.status === "PENDING") {
    const start = new Date(appointment.startAt).getTime();
    const noShowAvailableAt = start + policies.noShowGraceMinutes * 60_000;

    return [
      {
        status: "CONFIRMED",
        label: "Confirmar llegada",
        title: "Confirmar esta reserva",
        description:
          "La cita quedará preparada para iniciar la atención cuando corresponda.",
        disabled: false,
      },
      {
        status: "NO_SHOW",
        label: "No asistió",
        title: "Marcar inasistencia",
        description:
          "La reserva pendiente se cerrará como inasistencia. Esta acción no se puede revertir desde el panel.",
        disabled: referenceTime < noShowAvailableAt,
        disabledReason:
          referenceTime < noShowAvailableAt
            ? `Disponible ${policies.noShowGraceMinutes} min después de la hora.`
            : undefined,
        destructive: true,
      },
    ];
  }

  if (appointment.status === "CONFIRMED") {
    const start = new Date(appointment.startAt).getTime();

    const end = new Date(appointment.endAt).getTime();

    const earliestStart = start - policies.barberStartEarlyMinutes * 60_000;

    const noShowAvailableAt = start + policies.noShowGraceMinutes * 60_000;

    return [
      {
        status: "IN_PROGRESS",
        label: "Iniciar atención",
        title: "Iniciar la atención",
        description:
          "La cita cambiará a En atención y quedará registrada la hora de inicio.",
        disabled: referenceTime < earliestStart || referenceTime >= end,
        disabledReason:
          referenceTime < earliestStart
            ? `Disponible ${policies.barberStartEarlyMinutes} min antes de la cita.`
            : referenceTime >= end
              ? "La hora reservada ya finalizó."
              : undefined,
      },
      {
        status: "NO_SHOW",
        label: "No asistió",
        title: "Marcar inasistencia",
        description:
          "La reserva se cerrará como inasistencia. Esta acción no se puede revertir desde el panel.",
        disabled: referenceTime < noShowAvailableAt,
        disabledReason:
          referenceTime < noShowAvailableAt
            ? `Disponible ${policies.noShowGraceMinutes} min después de la hora.`
            : undefined,
        destructive: true,
      },
    ];
  }

  if (appointment.status === "IN_PROGRESS") {
    return [
      {
        status: "COMPLETED",
        label: "Finalizar atención",
        title: "Finalizar la atención",
        description:
          "La cita quedará completada y se registrará la hora de término.",
        disabled: false,
      },
    ];
  }

  return [];
}
