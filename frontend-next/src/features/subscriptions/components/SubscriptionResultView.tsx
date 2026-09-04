"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getOnboardingStatus } from "@/features/marketing/api/plan-requests.api";
import type { OnboardingStatus } from "@/features/marketing/types/plan-request.types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getMySubscription } from "../api/subscriptions.api";
import { SUBSCRIPTION_STATUS } from "../lib/subscription-formatters";
import type { BusinessSubscription } from "../types/subscription.types";

const MAX_POLLS = 20;

export default function SubscriptionResultView({
  requestId,
  onboardingToken,
}: {
  requestId?: number;
  onboardingToken?: string;
}) {
  if (requestId && onboardingToken) {
    return (
      <PublicOnboardingResult
        requestId={requestId}
        onboardingToken={onboardingToken}
      />
    );
  }

  return <AuthenticatedSubscriptionResult />;
}

function PublicOnboardingResult({
  requestId,
  onboardingToken,
}: {
  requestId: number;
  onboardingToken: string;
}) {
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [polls, setPolls] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const current = await getOnboardingStatus(requestId, onboardingToken);
        if (!active) return;
        setOnboarding(current);
        setError("");
        attempt += 1;
        setPolls(attempt);
        if (
          ["NEW", "CHECKOUT_PENDING"].includes(current.requestStatus) &&
          attempt < MAX_POLLS
        ) {
          timer = setTimeout(() => void load(), 3_000);
        }
      } catch (requestError) {
        if (!active) return;
        setError(
          getApiErrorMessage(
            requestError,
            "No pudimos consultar el estado de la contratación.",
          ),
        );
      }
    };

    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [onboardingToken, requestId]);

  if (error) {
    return (
      <ResultCard
        tone="error"
        title="No pudimos verificar la contratación"
        description={error}
      >
        <HomeLink />
      </ResultCard>
    );
  }
  if (!onboarding) return <LoadingCard />;

  if (onboarding.requestStatus === "CONVERTED") {
    return (
      <ResultCard
        tone="success"
        title="Tu negocio ya está habilitado"
        description="Terminamos la configuración y enviamos al correo del titular la invitación segura para crear su contraseña y entrar al panel."
      >
        <HomeLink />
      </ResultCard>
    );
  }

  if (onboarding.requestStatus === "PAID") {
    return (
      <ResultCard
        tone="success"
        title="Pago confirmado"
        description="Mercado Pago confirmó el primer cobro y la suscripción mensual. Tu negocio permanece privado mientras un agente de AgendaYa revisa la configuración y te envía el acceso."
      >
        <div className="mt-6 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Solicitud #{onboarding.requestId} · {onboarding.business.name}
        </div>
        <HomeLink />
      </ResultCard>
    );
  }

  if (onboarding.requestStatus === "PAYMENT_REVERSED") {
    return (
      <ResultCard
        tone="error"
        title="El pago fue revertido"
        description="La tienda no fue publicada. Contáctanos para revisar el pago antes de intentar una nueva contratación."
      >
        <HomeLink />
      </ResultCard>
    );
  }

  return (
    <ResultCard
      tone="pending"
      title="Esperando confirmación"
      description={
        polls >= MAX_POLLS
          ? "Mercado Pago todavía no confirma el primer cobro. Conserva esta página: puedes volver a consultar o retomar la autorización sin crear otra tienda."
          : "Ya regresaste a AgendaYa. Estamos esperando la confirmación segura de Mercado Pago; esta página se actualizará automáticamente."
      }
    >
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {onboarding.subscription.authorizationUrl && (
          <a
            href={onboarding.subscription.authorizationUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700"
          >
            Retomar Mercado Pago
          </a>
        )}
        <HomeLink />
      </div>
    </ResultCard>
  );
}

function AuthenticatedSubscriptionResult() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(
    null,
  );
  const [polls, setPolls] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user || user.role !== "ADMIN") return;
    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const current = await getMySubscription();
        if (!active) return;
        setSubscription(current);
        setError("");
        attempt += 1;
        setPolls(attempt);
        if (current.status === "PENDING" && attempt < MAX_POLLS) {
          timer = setTimeout(() => void load(), 3_000);
        }
      } catch (requestError) {
        if (!active) return;
        setError(
          getApiErrorMessage(
            requestError,
            "No pudimos consultar la confirmación de la suscripción.",
          ),
        );
      }
    };

    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, user]);

  if (authLoading) return <LoadingCard />;

  if (!user || user.role !== "ADMIN") {
    return (
      <ResultCard
        tone="error"
        title="Necesitamos verificar tu sesión"
        description="Inicia sesión como administrador del negocio para consultar el resultado. El retorno del navegador no activa la suscripción por sí solo."
      >
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white"
        >
          Volver a AgendaYa
        </Link>
      </ResultCard>
    );
  }

  if (error) {
    return (
      <ResultCard
        tone="error"
        title="No pudimos verificar la suscripción"
        description={error}
      >
        <PanelLink businessSlug={user.businessSlug} />
      </ResultCard>
    );
  }

  if (!subscription) return <LoadingCard />;

  if (subscription.status === "ACTIVE") {
    return (
      <ResultCard
        tone="success"
        title="Suscripción activa"
        description="Mercado Pago confirmó la autorización. Tu plan y los cobros mensuales ya están vinculados de forma segura al negocio."
      >
        <PanelLink businessSlug={user.businessSlug} />
      </ResultCard>
    );
  }

  if (subscription.status === "PENDING") {
    return (
      <ResultCard
        tone="pending"
        title="Esperando confirmación"
        description={
          polls >= MAX_POLLS
            ? "Mercado Pago todavía no confirma la autorización. Puedes revisar el estado más tarde desde tu panel; no necesitas volver a pagar."
            : "Ya regresaste a AgendaYa, pero esperamos la confirmación segura del webhook. Esta página se actualizará automáticamente."
        }
      >
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {subscription.authorizationUrl && (
            <a
              href={subscription.authorizationUrl}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700"
            >
              Retomar autorización
            </a>
          )}
          <PanelLink businessSlug={user.businessSlug} />
        </div>
      </ResultCard>
    );
  }

  const status = SUBSCRIPTION_STATUS[subscription.status];
  return (
    <ResultCard tone="error" title={status.label} description={status.message}>
      <PanelLink businessSlug={user.businessSlug} />
    </ResultCard>
  );
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white"
    >
      Volver a AgendaYa
    </Link>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-xl">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" />
      <p className="mt-5 text-sm text-zinc-600">
        Consultando el estado confirmado por Mercado Pago...
      </p>
    </div>
  );
}

function PanelLink({ businessSlug }: { businessSlug: string }) {
  return (
    <Link
      href={`/${businessSlug}/subscription`}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white"
    >
      Ver mi suscripción
    </Link>
  );
}

function ResultCard({
  tone,
  title,
  description,
  children,
}: {
  tone: "success" | "pending" | "error";
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const icon = tone === "success" ? "✓" : tone === "pending" ? "…" : "!";
  const iconClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "pending"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-xl sm:p-10">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold ${iconClass}`}
      >
        {icon}
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-600">
        {description}
      </p>
      {children}
    </section>
  );
}
