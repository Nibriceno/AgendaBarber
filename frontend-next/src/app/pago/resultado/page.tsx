import type { Metadata } from "next";

import MarketingHeader from "@/features/marketing/components/MarketingHeader";
import PaymentResultView from "@/features/marketing/components/PaymentResultView";

export const metadata: Metadata = {
  title: "Estado del pago | AgendaYa",
  description: "Consulta el resultado de tu pago con Mercado Pago.",
};

export default async function PaymentResultPage({ searchParams }: PageProps<"/pago/resultado">) {
  const params = await searchParams;
  const checkoutId = typeof params.checkout === "string" ? params.checkout : undefined;

  return <main className="min-h-screen bg-[#f6f6f3]"><MarketingHeader /><div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20"><PaymentResultView checkoutId={checkoutId} /></div></main>;
}
