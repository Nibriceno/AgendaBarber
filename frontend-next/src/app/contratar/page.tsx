import type { Metadata } from "next";

import MarketingHeader from "@/features/marketing/components/MarketingHeader";
import PlanRequestForm from "@/features/marketing/components/PlanRequestForm";
import { PLANS, type PlanCode } from "@/features/marketing/config/plans";

export const metadata: Metadata = {
  title: "Contratar un plan | AgendaYa",
  description: "Elige un plan y solicita la activación de AgendaYa para tu negocio.",
};

export default async function ContractPage({ searchParams }: PageProps<"/contratar">) {
  const params = await searchParams;
  const initialPlan: PlanCode = params.plan === "pro" ? "PRO" : "ESSENTIAL";
  const plan = PLANS[initialPlan];

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-zinc-950">
      <MarketingHeader />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:px-8">
        <aside className="lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Comienza con AgendaYa</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Tu negocio, listo para recibir reservas.</h1>
          <p className="mt-5 text-base leading-7 text-zinc-600">Completa estos datos y nuestro equipo te ayudará personalmente con la puesta en marcha.</p>
          <div className="mt-8 rounded-2xl bg-zinc-950 p-6 text-white">
            <p className="text-sm font-semibold text-amber-300">Plan seleccionado</p>
            <p className="mt-3 text-2xl font-semibold">{plan.name}</p>
            <p className="mt-1 text-sm text-zinc-400">Cobro mensual recurrente mediante Mercado Pago</p>
            <div className="my-5 h-px bg-white/10" />
            <p className="text-sm leading-6 text-zinc-300">Podrás cambiar de plan dentro del formulario y revisar el precio final, incluido cualquier descuento, antes de ir a Mercado Pago.</p>
          </div>
        </aside>
        <PlanRequestForm initialPlan={initialPlan} />
      </div>
    </main>
  );
}
