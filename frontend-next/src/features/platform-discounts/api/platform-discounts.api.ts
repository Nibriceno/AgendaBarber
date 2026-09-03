import platformClient from "@/lib/api/platform-client";

import type { PlanDiscountInput, PlatformPlanDiscount } from "../types/platform-discount.types";

export async function getPlatformDiscounts() {
  const response = await platformClient.get<PlatformPlanDiscount[]>("/platform/plan-discounts");
  return response.data;
}

export async function createPlatformDiscount(input: PlanDiscountInput) {
  const response = await platformClient.post<PlatformPlanDiscount>("/platform/plan-discounts", input);
  return response.data;
}

export async function updatePlatformDiscount(id: number, input: Partial<PlanDiscountInput>) {
  const response = await platformClient.patch<PlatformPlanDiscount>(`/platform/plan-discounts/${id}`, input);
  return response.data;
}
