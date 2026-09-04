import type { PlanCode } from "../config/plans";

export type BusinessCategory = "BARBERSHOP" | "HAIR_SALON" | "NAIL_SALON" | "BEAUTY_CENTER" | "MASSAGE_CENTER" | "OTHER";
export type ContactPreference = "WHATSAPP" | "EMAIL" | "EITHER";

export type CreatePlanRequestInput = {
  plan: PlanCode;
  teamSize: number;
  businessName: string;
  businessCategory: BusinessCategory;
  desiredSlug?: string;
  contactName: string;
  email: string;
  phone: string;
  contactPreference: ContactPreference;
  notes?: string;
  promoCode?: string;
  acceptedTerms: true;
  website?: string;
};

export type CreatePlanRequestResponse = {
  id: number;
  plan: PlanCode;
  monthlyPrice: number;
  basePrice: number;
  discountAmount: number;
  discount: { id: number; name: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; value: number } | null;
  checkoutToken: string;
  createdAt: string;
  message: string;
};

export type CreateOnboardingInput = CreatePlanRequestInput & {
  idempotencyKey: string;
  onboardingToken: string;
};

export type OnboardingStatus = {
  requestId: number;
  requestStatus:
    | "NEW"
    | "CHECKOUT_PENDING"
    | "PAID"
    | "PAYMENT_REVERSED"
    | "CONTACTED"
    | "CONVERTED"
    | "CLOSED";
  business: {
    name: string;
    desiredSlug: string | null;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  };
  subscription: {
    id: string;
    status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
    plan: { code: PlanCode; name: string };
    amount: number;
    currency: string;
    authorizationUrl: string | null;
    paymentConfirmed: boolean;
    paidAt: string | null;
  };
};

export type PublicPlanQuote = {
  plan: PlanCode;
  name: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  minimumTeamSize: number;
  maximumTeamSize: number;
  description: string | null;
  currency: string;
  interval: "MONTH" | "YEAR";
  intervalCount: number;
  features: unknown;
  limits: unknown;
  discount: { id: number; name: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; value: number; code: string | null; autoApply: boolean } | null;
};

export type PlanCheckoutResponse = {
  checkoutId: string;
  initPoint: string;
  expiresAt: string;
  finalAmount: number;
  currency: "CLP";
  status: "CREATED" | "PENDING";
};

export type PlanCheckoutStatus = {
  id: string;
  plan: PlanCode;
  finalAmount: number;
  currency: "CLP";
  status: "CREATED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED" | "CHARGED_BACK" | "ERROR";
  mercadoPagoStatusDetail: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  planRequest: { businessName: string };
};
