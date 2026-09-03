import type { PlanCode } from "@/features/marketing/config/plans";

export type PlanDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type PlatformPlanDiscount = {
  id: number;
  plan: PlanCode;
  name: string;
  type: PlanDiscountType;
  value: number;
  code: string | null;
  autoApply: boolean;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanDiscountInput = {
  plan: PlanCode;
  name: string;
  type: PlanDiscountType;
  value: number;
  code?: string;
  autoApply: boolean;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
};
