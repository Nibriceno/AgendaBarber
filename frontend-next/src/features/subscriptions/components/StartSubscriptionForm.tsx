"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import {
  getPlanQuote,
  getPublicPlanPricing,
} from "@/features/marketing/api/plan-requests.api";
import type { PlanCode } from "@/features/marketing/config/plans";
import type { PublicPlanQuote } from "@/features/marketing/types/plan-request.types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createSubscription } from "../api/subscriptions.api";
import { formatMoney, getStringFeatures } from "../lib/subscription-formatters";

type StartSubscriptionFormProps = {
  initialPlan: PlanCode;
};

export default function StartSubscriptionForm({
  initialPlan,
}: StartSubscriptionFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<PublicPlanQuote[]>([]);
  const [planCode, setPlanCode] = useState<PlanCode>(initialPlan);
  const [quotedPlan, setQuotedPlan] = useState<PublicPlanQuote | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getPublicPlanPricing()
      .then((response) => {
        if (!active) return;
        setPlans(response);
        if (!response.some((plan) => plan.plan === initialPlan)) {
          const firstPlan = response[0]?.plan;
          if (firstPlan) setPlanCode(firstPlan);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "No pudimos cargar los planes disponibles.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });

    return () => {
      active = false;
    };
  }, [initialPlan]);

  const selectedPlan = useMemo(
    () =>
      quotedPlan?.plan === planCode
        ? quotedPlan
        : plans.find((plan) => plan.plan === planCode) ?? null,
    [planCode, plans, quotedPlan],
  );

  const selectPlan = (nextPlan: PlanCode) => {
    setPlanCode(nextPlan);
    setPromoCode("");
    setQuotedPlan(null);
    setError("");
  };

  const applyPromo = async () => {
    const cleanCode = promoCode.trim();
    if (!cleanCode) {
      setQuotedPlan(null);
      setError("");
      return;
    }

    setApplyingPromo(true);
    setError("");
    try {
      setQuotedPlan(await getPlanQuote(planCode, cleanCode));
    } catch (requestError) {
      setQuotedPlan(null);
      setError(
        getApiErrorMessage(requestError, "El código promocional no es válido."),
      );
    } finally {
      setApplyingPromo(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "ADMIN" || !selectedPlan || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const subscription = await createSubscription({
        planCode,
        promoCode: promoCode.trim() || undefined,
      });
      if (subscription.authorizationUrl) {
        window.location.assign(subscription.authorizationUrl);
        return;
      }
      router.push(`/${user.businessSlug}/subscription`);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No pudimos iniciar la suscripción. Inténtalo nuevamente.",
        ),
      );
      setSubmitting(false);
    }
  };

  if (!user || user.role !== "ADMIN") return null;

  return (
    <form
      onSubmit={submit}
      className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl sm:p-9"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Suscripción para {user.businessSlug}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-3xl">
            Elige el plan y autoriza el cobro mensual.
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Sesión verificada
        </span>
      </div>

      {loadingPlans ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const selected = plan.plan === planCode;
            return (
              <button
                key={plan.plan}
                type="button"
                aria-pressed={selected}
                onClick={() => selectPlan(plan.plan)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white ring-4 ring-zinc-100"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{plan.name}</span>
                  <span
                    className={`h-4 w-4 rounded-full border-4 ${
                      selected ? "border-amber-300" : "border-zinc-300"
                    }`}
                  />
                </span>
                <span
                  className={`mt-3 block text-2xl font-semibold ${
                    selected ? "text-white" : "text-zinc-950"
                  }`}
                >
                  {formatMoney(plan.finalPrice, plan.currency)}
                </span>
                <span
                  className={`mt-1 block text-xs ${
                    selected ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  por mes · {plan.minimumTeamSize} a {plan.maximumTeamSize} personas
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedPlan && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Cobro mensual</p>
              {selectedPlan.discountAmount > 0 && (
                <p className="mt-1 text-sm text-zinc-400 line-through">
                  {formatMoney(selectedPlan.basePrice, selectedPlan.currency)}
                </p>
              )}
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
                {formatMoney(selectedPlan.finalPrice, selectedPlan.currency)}
              </p>
            </div>
            {selectedPlan.discount && (
              <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                {selectedPlan.discount.name}
              </span>
            )}
          </div>
          <ul className="mt-5 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
            {getStringFeatures(selectedPlan.features).map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="font-semibold text-emerald-600">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <label htmlFor="subscription-promo" className="text-sm font-medium text-zinc-700">
          Código de descuento <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="subscription-promo"
            value={promoCode}
            maxLength={40}
            onChange={(event) => {
              setPromoCode(event.target.value.toUpperCase());
              setQuotedPlan(null);
            }}
            placeholder="AGENDAYA"
            className="h-12 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
          />
          <button
            type="button"
            disabled={applyingPromo}
            onClick={() => void applyPromo()}
            className="h-12 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {applyingPromo ? "Validando..." : "Aplicar"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Mercado Pago solicitará y protegerá los datos de pago. AgendaYa no recibe
        el número completo de la tarjeta ni el código de seguridad. El cobro se
        renovará mensualmente hasta que solicites la cancelación.
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-zinc-600">
        <input
          required
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-zinc-950"
        />
        <span>
          Acepto los{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold text-zinc-950 underline underline-offset-4"
          >
            términos y condiciones
          </Link>{" "}
          y autorizo el cobro mensual recurrente del plan seleccionado.
        </span>
      </label>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || loadingPlans || !selectedPlan || !acceptedTerms}
        className="mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-[#009ee3] px-6 text-sm font-semibold text-white transition hover:bg-[#008ed0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Conectando con Mercado Pago..."
          : "Continuar de forma segura en Mercado Pago"}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-400">
        Tu negocio sólo se activa después de que Mercado Pago confirme la suscripción.
      </p>
    </form>
  );
}
