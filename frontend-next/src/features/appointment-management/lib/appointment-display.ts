export type AppointmentDisplayStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentDisplayStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  CONFIRMED: {
    label: "Confirmada",
    className: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  IN_PROGRESS: {
    label: "En atención",
    className: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  COMPLETED: {
    label: "Completada",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "bg-red-50 text-red-700 ring-red-600/20",
  },
  NO_SHOW: {
    label: "No asistió",
    className: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  },
};

export function formatAppointmentMoney(
  value: string | number,
  currency: string,
): string {
  const amount = Number(value);

  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `$${new Intl.NumberFormat("es-CL").format(
      Number.isFinite(amount) ? amount : 0,
    )}`;
  }
}

export function formatAppointmentTime(date: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(new Date(date));
}
