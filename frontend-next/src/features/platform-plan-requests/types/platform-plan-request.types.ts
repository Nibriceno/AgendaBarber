import type { BusinessCategory, ContactPreference } from "@/features/marketing/types/plan-request.types";
import type { PlanCode } from "@/features/marketing/config/plans";

export type PlanRequestStatus = "NEW" | "CHECKOUT_PENDING" | "PAID" | "PAYMENT_REVERSED" | "CONTACTED" | "CONVERTED" | "CLOSED";

export type PlatformPlanRequest = {
  id: number;
  plan: PlanCode;
  basePrice: number;
  discountAmount: number;
  monthlyPrice: number;
  teamSize: number;
  businessName: string;
  businessCategory: BusinessCategory;
  desiredSlug: string | null;
  contactName: string;
  email: string;
  phone: string;
  contactPreference: ContactPreference;
  notes: string | null;
  promoCode: string | null;
  discount: { id: number; name: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; value: number } | null;
  checkouts: { id: string; status: "CREATED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED" | "CHARGED_BACK" | "ERROR"; mercadoPagoPaymentId: string | null; mercadoPagoStatus: string | null; paidAt: string | null; createdAt: string }[];
  status: PlanRequestStatus;
  contactedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformPlanRequestsResponse = {
  items: PlatformPlanRequest[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
