import type { Metadata } from "next";

import MarketingHeader from "@/features/marketing/components/MarketingHeader";
import SubscriptionResultView from "@/features/subscriptions/components/SubscriptionResultView";

export const metadata: Metadata = {
  title: "Estado de la suscripción | AgendaYa",
  description: "Consulta el estado confirmado de tu suscripción.",
};

export default async function SubscriptionResultPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string; token?: string }>;
}) {
  const params = await searchParams;
  const requestId = Number(params.request);
  return (
    <main className="min-h-screen bg-[#f6f6f3]">
      <MarketingHeader />
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <SubscriptionResultView
          requestId={Number.isInteger(requestId) && requestId > 0 ? requestId : undefined}
          onboardingToken={params.token}
        />
      </div>
    </main>
  );
}
