"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getPublicPlanPricing } from "../api/plan-requests.api";
import { PLANS, formatPlanPrice, type PlanCode } from "../config/plans";
import type { PublicPlanQuote } from "../types/plan-request.types";

export default function PricingPlansSection() {
  const [quotes, setQuotes] = useState<Partial<Record<PlanCode, PublicPlanQuote>>>({});

  useEffect(() => {
    let active = true;
    void getPublicPlanPricing()
      .then((pricing) => {
        if (!active) return;
        setQuotes(Object.fromEntries(pricing.map((quote) => [quote.plan, quote])));
      })
      .catch(() => {
        // Los precios base siguen visibles si la API no está disponible.
      });
    return () => { active = false; };
  }, []);

  return (
    <section id="planes" className="scroll-mt-16 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Planes simples</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Elige según el tamaño de tu equipo.</h2><p className="mt-5 text-base leading-7 text-zinc-600">Sin funciones escondidas ni una lista difícil de comparar. La diferencia es la cantidad de personas que trabajan con agenda.</p></div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 lg:grid-cols-2">
          {Object.values(PLANS).map((plan) => {
            const quote = quotes[plan.code];
            const finalPrice = quote?.finalPrice ?? plan.price;
            const hasDiscount = Boolean(quote?.discountAmount);
            return (
              <article key={plan.code} className={`relative flex flex-col rounded-[2rem] border p-7 sm:p-9 ${plan.code === "PRO" ? "border-zinc-950 bg-zinc-950 text-white shadow-2xl" : "border-zinc-200 bg-[#fafaf8]"}`}>
                {hasDiscount ? <span className="absolute right-6 top-6 rounded-full bg-emerald-300 px-3 py-1 text-[11px] font-semibold text-emerald-950">{quote?.discount?.name}</span> : plan.code === "PRO" ? <span className="absolute right-6 top-6 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-semibold text-zinc-950">Para equipos en crecimiento</span> : null}
                <p className={`text-sm font-semibold ${plan.code === "PRO" ? "text-amber-300" : "text-amber-700"}`}>Plan {plan.name}</p>
                {hasDiscount && <p className={`mt-7 text-sm line-through ${plan.code === "PRO" ? "text-zinc-500" : "text-zinc-400"}`}>{formatPlanPrice(quote?.basePrice ?? plan.price)}</p>}
                <div className={`${hasDiscount ? "mt-1" : "mt-7"} flex items-end gap-2`}><span className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{formatPlanPrice(finalPrice)}</span><span className={`pb-1 text-sm ${plan.code === "PRO" ? "text-zinc-400" : "text-zinc-500"}`}>/mes</span></div>
                <p className={`mt-3 text-sm font-medium ${plan.code === "PRO" ? "text-zinc-300" : "text-zinc-700"}`}>{plan.teamRange}</p>
                <p className={`mt-4 text-sm leading-6 ${plan.code === "PRO" ? "text-zinc-400" : "text-zinc-600"}`}>{plan.description}</p>
                <ul className="mt-8 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${plan.code === "PRO" ? "bg-amber-300 text-zinc-950" : "bg-zinc-950 text-white"}`}>✓</span><span className={plan.code === "PRO" ? "text-zinc-300" : "text-zinc-700"}>{feature}</span></li>)}</ul>
                <Link href={`/contratar?plan=${plan.code.toLowerCase()}`} className={`mt-9 inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${plan.code === "PRO" ? "bg-amber-300 text-zinc-950 hover:bg-amber-200" : "bg-zinc-950 text-white hover:bg-zinc-800"}`}>Elegir plan {plan.name}</Link>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">Valores mensuales en pesos chilenos. Checkout Pro cobra el primer mes; no activa renovaciones automáticas.</p>
      </div>
    </section>
  );
}
