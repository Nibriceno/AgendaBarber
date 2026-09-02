import type { BusinessStatus } from "../types/platform-business.types";

export const BUSINESS_STATUS_CONFIG: Record<
  BusinessStatus,
  { label: string; className: string; dotClassName: string }
> = {
  ACTIVE: {
    label: "Activa",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  SUSPENDED: {
    label: "Suspendida",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    dotClassName: "bg-amber-500",
  },
  INACTIVE: {
    label: "Inactiva",
    className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    dotClassName: "bg-zinc-400",
  },
};

export function formatPlatformDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("es-CL", { notation: "compact" }).format(value);
}
