import apiClient from "@/lib/api/client";

import type { PlanCode } from "../config/plans";
import type { CreateOnboardingInput, CreatePlanRequestInput, CreatePlanRequestResponse, OnboardingStatus, PlanCheckoutResponse, PlanCheckoutStatus, PublicPlanQuote } from "../types/plan-request.types";

export async function createPlanRequest(input: CreatePlanRequestInput) {
  const response = await apiClient.post<CreatePlanRequestResponse>("/plan-requests", input);
  return response.data;
}

export async function createOnboarding(input: CreateOnboardingInput) {
  const response = await apiClient.post<OnboardingStatus>("/onboarding", input);
  return response.data;
}

export async function getOnboardingStatus(id: number, token: string) {
  const response = await apiClient.get<OnboardingStatus>(`/onboarding/${id}`, {
    params: { token },
  });
  return response.data;
}

export async function getPublicPlanPricing() {
  const response = await apiClient.get<PublicPlanQuote[]>("/plans");
  return response.data;
}

export async function getPlanQuote(plan: PlanCode, promoCode?: string) {
  const response = await apiClient.get<PublicPlanQuote>(`/plans/${plan}/quote`, { params: { promoCode } });
  return response.data;
}

export async function createPlanCheckout(planRequestId: number, checkoutToken: string) {
  const response = await apiClient.post<PlanCheckoutResponse>(`/plan-requests/${planRequestId}/checkout`, { checkoutToken });
  return response.data;
}

export async function getPlanCheckoutStatus(checkoutId: string) {
  const response = await apiClient.get<PlanCheckoutStatus>(`/payments/plan-checkouts/${checkoutId}`);
  return response.data;
}
