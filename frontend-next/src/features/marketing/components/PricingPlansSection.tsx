"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  formatMoney,
  getStringFeatures,
} from "@/features/subscriptions/lib/subscription-formatters";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getPublicPlanPricing } from "../api/plan-requests.api";
import type { PublicPlanQuote } from "../types/plan-request.types";

export default function PricingPlansSection() {
  const [plans, setPlans] = useState<PublicPlanQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getPublicPlanPricing()
      .then((pricing) => {
        if (active) setPlans(pricing);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "No pudimos cargar los planes en este momento.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="planes"
      className="scroll-mt-16 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Planes simples
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Elige según el tamaño de tu equipo.
          </h2>
          <p className="mt-5 text-base leading-7 text-zinc-600">
            El precio mostrado viene directamente de AgendaYa e incluye cualquier
            promoción automática vigente.
          </p>
        </div>

        {loading && (
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 lg:grid-cols-2">
            <div className="h-[480px] animate-pulse rounded-[2rem] bg-zinc-100" />
            <div className="h-[480px] animate-pulse rounded-[2rem] bg-zinc-900" />
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mx-auto mt-12 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700"
          >
            {error} Inténtalo nuevamente en unos minutos.
          </div>
        )}

        {!loading && !error && (
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 lg:grid-cols-2">
            {plans.map((plan) => {
              const featured = plan.plan === "PRO";
              const hasDiscount = plan.discountAmount > 0;
              return (
                <article
                  key={plan.plan}
                  className={`relative flex flex-col rounded-[2rem] border p-7 sm:p-9 ${
                    featured
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-2xl"
                      : "border-zinc-200 bg-[#fafaf8]"
                  }`}
                >
                  {hasDiscount ? (
                    <span className="absolute right-6 top-6 rounded-full bg-emerald-300 px-3 py-1 text-[11px] font-semibold text-emerald-950">
                      {plan.discount?.name}
                    </span>
                  ) : featured ? (
                    <span className="absolute right-6 top-6 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-semibold text-zinc-950">
                      Para equipos en crecimiento
                    </span>
                  ) : null}
                  <p
                    className={`text-sm font-semibold ${featured ? "text-amber-300" : "text-amber-700"}`}
                  >
                    Plan {plan.name}
                  </p>
                  {hasDiscount && (
                    <p
                      className={`mt-7 text-sm line-through ${featured ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      {formatMoney(plan.basePrice, plan.currency)}
                    </p>
                  )}
                  <div
                    className={`${hasDiscount ? "mt-1" : "mt-7"} flex items-end gap-2`}
                  >
                    <span className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                      {formatMoney(plan.finalPrice, plan.currency)}
                    </span>
                    <span
                      className={`pb-1 text-sm ${featured ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      /mes
                    </span>
                  </div>
                  <p
                    className={`mt-3 text-sm font-medium ${featured ? "text-zinc-300" : "text-zinc-700"}`}
                  >
                    {plan.minimumTeamSize} a {plan.maximumTeamSize} personas
                  </p>
                  {plan.description && (
                    <p
                      className={`mt-4 text-sm leading-6 ${featured ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      {plan.description}
                    </p>
                  )}
                  <ul className="mt-8 flex-1 space-y-3">
                    {getStringFeatures(plan.features).map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            featured
                              ? "bg-amber-300 text-zinc-950"
                              : "bg-zinc-950 text-white"
                          }`}
                        >
                          ✓
                        </span>
                        <span className={featured ? "text-zinc-300" : "text-zinc-700"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/contratar?plan=${plan.plan.toLowerCase()}`}
                    className={`mt-9 inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
                      featured
                        ? "bg-amber-300 text-zinc-950 hover:bg-amber-200"
                        : "bg-zinc-950 text-white hover:bg-zinc-800"
                    }`}
                  >
                    Elegir plan {plan.name}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-zinc-500">
          Valores mensuales en pesos chilenos. Mercado Pago realiza la renovación
          automática; puedes revisar el estado desde tu panel.
        </p>
      </div>
    </section>
  );
}
