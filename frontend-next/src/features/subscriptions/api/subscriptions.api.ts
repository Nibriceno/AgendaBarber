import apiClient from "@/lib/api/client";

import type {
  BusinessSubscription,
  CreateSubscriptionInput,
} from "../types/subscription.types";

export async function getMySubscription() {
  const response =
    await apiClient.get<BusinessSubscription>("/subscriptions/me");
  return response.data;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const response = await apiClient.post<BusinessSubscription>(
    "/subscriptions",
    input,
  );
  return response.data;
}

export async function cancelMySubscription() {
  const response = await apiClient.post<BusinessSubscription>(
    "/subscriptions/me/cancel",
  );
  return response.data;
}

export async function reactivateMySubscription() {
  const response = await apiClient.post<BusinessSubscription>(
    "/subscriptions/me/reactivate",
  );
  return response.data;
}
