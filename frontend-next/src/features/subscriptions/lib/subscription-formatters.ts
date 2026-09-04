import type {
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from "../types/subscription.types";

export const SUBSCRIPTION_STATUS: Record<
  SubscriptionStatus,
  { label: string; message: string; className: string }
> = {
  PENDING: {
    label: "Pendiente de autorización",
    message:
      "Completa la autorización en Mercado Pago. Tu negocio se activará cuando el backend reciba la confirmación.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  ACTIVE: {
    label: "Activa",
    message:
      "Tu suscripción está activa y los cobros se realizan automáticamente.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  PAST_DUE: {
    label: "Pago pendiente",
    message:
      "No pudimos procesar tu último pago. Regularízalo antes de que termine el período de gracia.",
    className: "border-orange-200 bg-orange-50 text-orange-900",
  },
  SUSPENDED: {
    label: "Suspendida",
    message:
      "La suscripción está suspendida. Puedes reactivarla sin perder las reservas ni la configuración del negocio.",
    className: "border-red-200 bg-red-50 text-red-900",
  },
  CANCELED: {
    label: "Cancelada",
    message:
      "La suscripción está cancelada. Puedes iniciar una nueva autorización sin recrear tu negocio.",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
};

export const PAYMENT_STATUS: Record<
  SubscriptionPaymentStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Procesando", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Aprobado", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rechazado", className: "bg-red-100 text-red-800" },
  CANCELED: { label: "Cancelado", className: "bg-zinc-100 text-zinc-700" },
  REFUNDED: {
    label: "Reembolsado",
    className: "bg-violet-100 text-violet-800",
  },
  CHARGED_BACK: { label: "Contracargo", className: "bg-red-100 text-red-800" },
  ERROR: { label: "Con error", className: "bg-red-100 text-red-800" },
};

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | null) {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function getStringFeatures(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
