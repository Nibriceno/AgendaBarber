"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getPlanCheckoutStatus } from "../api/plan-requests.api";
import { formatPlanPrice } from "../config/plans";
import type { PlanCheckoutStatus } from "../types/plan-request.types";

const FINAL_STATUSES = new Set(["APPROVED", "REJECTED", "CANCELLED", "REFUNDED", "CHARGED_BACK", "ERROR"]);

export default function PaymentResultView({ checkoutId }: { checkoutId?: string }) {
  const [checkout, setCheckout] = useState<PlanCheckoutStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!checkoutId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      void getPlanCheckoutStatus(checkoutId)
        .then((response) => {
          if (!active) return;
          setCheckout(response);
          setError("");
          if (!FINAL_STATUSES.has(response.status)) timer = setTimeout(load, 4_000);
        })
        .catch(() => {
          if (active) setError("No pudimos consultar el estado del pago.");
        });
    };

    load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [checkoutId]);

  if (!checkoutId || error) {
    return <ResultCard tone="error" title="No pudimos verificar este pago" description={error || "El enlace de retorno no contiene una referencia válida."} />;
  }

  if (!checkout) {
    return <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-xl"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" /><p className="mt-5 text-sm text-zinc-600">Verificando el pago directamente con Mercado Pago...</p></div>;
  }

  if (checkout.status === "APPROVED") {
    return <ResultCard tone="success" title="Pago aprobado" description={`Recibimos ${formatPlanPrice(checkout.finalAmount)} para ${checkout.planRequest.businessName}. Un agente de AgendaYa se contactará contigo para completar la activación.`} />;
  }

  if (checkout.status === "PENDING" || checkout.status === "CREATED") {
    return <ResultCard tone="pending" title="Pago en validación" description="Mercado Pago todavía está procesando la operación. Esta página se actualizará automáticamente; también puedes volver más tarde." />;
  }

  return <ResultCard tone="error" title="El pago no fue aprobado" description="No activamos el plan ni registramos un cobro exitoso. Puedes volver a solicitar el plan o intentar nuevamente más tarde." />;
}

function ResultCard({ tone, title, description }: { tone: "success" | "pending" | "error"; title: string; description: string }) {
  const symbol = tone === "success" ? "✓" : tone === "pending" ? "…" : "!";
  const colors = tone === "success" ? "bg-emerald-100 text-emerald-700" : tone === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700";
  return <section className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-xl sm:p-10"><div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-semibold ${colors}`}>{symbol}</div><h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl">{title}</h1><p className="mt-5 text-base leading-7 text-zinc-600">{description}</p><Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white hover:bg-zinc-800">Volver a AgendaYa</Link></section>;
}
