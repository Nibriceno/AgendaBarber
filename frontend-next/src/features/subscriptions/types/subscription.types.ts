import type { PlanCode } from "@/features/marketing/config/plans";

export type SubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "SUSPENDED";

export type SubscriptionPaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED"
  | "CHARGED_BACK"
  | "ERROR";

export type SubscriptionPayment = {
  id: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  paymentMethodId: string | null;
  cardLastFourDigits: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
};

export type BusinessSubscription = {
  id: string;
  status: SubscriptionStatus;
  plan: {
    code: PlanCode;
    name: string;
    description: string | null;
    features: unknown;
    limits: unknown;
  };
  price: {
    baseAmount: number;
    discountAmount: number;
    amount: number;
    currency: string;
    interval: "MONTH" | "YEAR";
    intervalCount: number;
    discountName: string | null;
    promoCode: string | null;
  };
  authorizationUrl: string | null;
  paymentMethodId: string | null;
  paymentMethod: {
    id: string | null;
    lastFourDigits: string | null;
  } | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextPaymentAt: string | null;
  pastDueAt: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancellationRequestedAt: string | null;
  canceledAt: string | null;
  payments: SubscriptionPayment[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSubscriptionInput = {
  planCode: PlanCode;
  promoCode?: string;
};
