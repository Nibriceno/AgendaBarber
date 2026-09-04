"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import StartSubscriptionForm from "@/features/subscriptions/components/StartSubscriptionForm";
import { formatMoney } from "@/features/subscriptions/lib/subscription-formatters";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createOnboarding, getPublicPlanPricing } from "../api/plan-requests.api";
import type { PlanCode } from "../config/plans";
import type {
  BusinessCategory,
  ContactPreference,
  PublicPlanQuote,
} from "../types/plan-request.types";

const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "HAIR_SALON", label: "Peluquería o salón de estilistas" },
  { value: "BARBERSHOP", label: "Barbería" },
  { value: "NAIL_SALON", label: "Centro de uñas" },
  { value: "BEAUTY_CENTER", label: "Centro de estética" },
  { value: "MASSAGE_CENTER", label: "Masajes o bienestar" },
  { value: "OTHER", label: "Otro negocio con agenda" },
];

const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export default function PlanRequestForm({ initialPlan }: { initialPlan: PlanCode }) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="h-[520px] animate-pulse rounded-[2rem] bg-white" />;
  }

  if (user?.role === "ADMIN") {
    return <StartSubscriptionForm initialPlan={initialPlan} />;
  }

  if (user) {
    return (
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-xl sm:p-10">
        <p className="text-sm font-semibold text-amber-700">Cuenta iniciada</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
          La suscripción debe autorizarla el administrador.
        </h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          Tu sesión corresponde al rol {user.role}. Por seguridad, sólo el dueño o
          administrador del negocio puede iniciar cobros recurrentes.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white"
        >
          Volver al inicio
        </Link>
      </section>
    );
  }

  return <ProspectRequestForm initialPlan={initialPlan} />;
}

function ProspectRequestForm({ initialPlan }: { initialPlan: PlanCode }) {
  const [plans, setPlans] = useState<PublicPlanQuote[]>([]);
  const [planCode, setPlanCode] = useState<PlanCode>(initialPlan);
  const [teamSize, setTeamSize] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] =
    useState<BusinessCategory>("HAIR_SALON");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [chooseSlugLater, setChooseSlugLater] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPreference, setContactPreference] =
    useState<ContactPreference>("WHATSAPP");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [website, setWebsite] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const attemptRef = useRef<{ idempotencyKey: string; token: string } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void getPublicPlanPricing()
      .then((response) => {
        if (!active) return;
        setPlans(response);
        const selected =
          response.find((plan) => plan.plan === initialPlan) ?? response[0];
        if (selected) {
          setPlanCode(selected.plan);
          setTeamSize(selected.minimumTeamSize);
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
    () => plans.find((plan) => plan.plan === planCode) ?? null,
    [planCode, plans],
  );
  const teamOptions = useMemo(() => {
    if (!selectedPlan) return [];
    return Array.from(
      {
        length:
          selectedPlan.maximumTeamSize - selectedPlan.minimumTeamSize + 1,
      },
      (_, index) => selectedPlan.minimumTeamSize + index,
    );
  }, [selectedPlan]);

  const selectPlan = (nextPlan: PublicPlanQuote) => {
    setPlanCode(nextPlan.plan);
    setTeamSize(nextPlan.minimumTeamSize);
  };

  const handleBusinessName = (value: string) => {
    setBusinessName(value);
    if (!slugEdited) setDesiredSlug(toSlug(value));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlan || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (!attemptRef.current) {
        attemptRef.current = {
          idempotencyKey: crypto.randomUUID(),
          token: createOnboardingToken(),
        };
      }
      const result = await createOnboarding({
          plan: planCode,
          teamSize,
          businessName,
          businessCategory,
          desiredSlug: chooseSlugLater ? undefined : desiredSlug || undefined,
          contactName,
          email,
          phone,
          contactPreference,
          notes: notes || undefined,
          promoCode: promoCode || undefined,
          acceptedTerms: true,
          website,
          idempotencyKey: attemptRef.current.idempotencyKey,
          onboardingToken: attemptRef.current.token,
        });
      const resultUrl = `/suscripcion/resultado?request=${result.requestId}&token=${encodeURIComponent(attemptRef.current.token)}`;
      window.location.assign(result.subscription.authorizationUrl ?? resultUrl);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No pudimos enviar tu solicitud. Revisa los datos e inténtalo nuevamente.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl sm:p-9"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          1. Selecciona tu plan
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
          ¿Cuántas personas trabajan con agenda?
        </h2>
        {loadingPlans ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const selected = plan.plan === planCode;
              return (
                <button
                  key={plan.plan}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectPlan(plan)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white ring-4 ring-zinc-100"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <span className="font-semibold">{plan.name}</span>
                  <span
                    className={`mt-2 block text-sm ${selected ? "text-zinc-300" : "text-zinc-600"}`}
                  >
                    {formatMoney(plan.finalPrice, plan.currency)}/mes ·{" "}
                    {plan.minimumTeamSize} a {plan.maximumTeamSize} personas
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          2. Cuéntanos sobre tu negocio
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
            Nombre del negocio
            <input
              required
              maxLength={120}
              value={businessName}
              onChange={(event) => handleBusinessName(event.target.value)}
              className={fieldClass}
              placeholder="Ej. Estudio Aurora"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Tipo de negocio
            <select
              value={businessCategory}
              onChange={(event) =>
                setBusinessCategory(event.target.value as BusinessCategory)
              }
              className={fieldClass}
            >
              {BUSINESS_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Personas del equipo
            <select
              value={teamSize}
              onChange={(event) => setTeamSize(Number(event.target.value))}
              className={fieldClass}
            >
              {teamOptions.map((size) => (
                <option key={size} value={size}>
                  {size} {size === 1 ? "persona" : "personas"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
            URL deseada
            <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-500 focus-within:ring-4 focus-within:ring-zinc-100">
              <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500">
                agendaya.cl/
              </span>
              <input
                disabled={chooseSlugLater}
                value={desiredSlug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setDesiredSlug(toSlug(event.target.value));
                }}
                className="min-w-0 flex-1 px-3 text-sm text-zinc-950 outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
                placeholder="mi-negocio"
              />
            </div>
            <span className="mt-2 flex items-center gap-2 text-xs font-normal text-zinc-500">
              <input
                type="checkbox"
                checked={chooseSlugLater}
                onChange={(event) => setChooseSlugLater(event.target.checked)}
                className="accent-zinc-950"
              />
              Prefiero definirla con un agente
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          3. Datos de contacto
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
            Nombre y apellido
            <input
              required
              maxLength={120}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className={fieldClass}
              autoComplete="name"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Correo electrónico
            <input
              required
              type="email"
              maxLength={150}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
              autoComplete="email"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            WhatsApp
            <input
              required
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
              placeholder="+56912345678"
              autoComplete="tel"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Prefiero contacto por
            <select
              value={contactPreference}
              onChange={(event) =>
                setContactPreference(event.target.value as ContactPreference)
              }
              className={fieldClass}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Correo electrónico</option>
              <option value="EITHER">Cualquiera</option>
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Código de descuento <span className="font-normal text-zinc-400">(opcional)</span>
            <input
              maxLength={40}
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
            Algo que debamos saber <span className="font-normal text-zinc-400">(opcional)</span>
            <textarea
              maxLength={1000}
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
            />
          </label>
          <label className="hidden" aria-hidden="true">
            Sitio web
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-amber-50 p-5">
        <p className="font-semibold text-amber-950">Antes de continuar</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950/75">
          <li>• Reservaremos la URL y prepararemos tu negocio de forma privada.</li>
          <li>• Mercado Pago mostrará el monto y te pedirá autorizar el cobro mensual.</li>
          <li>• Tras confirmar el pago, un agente configurará la tienda y enviará tu acceso.</li>
        </ul>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-zinc-600">
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
            className="font-medium text-zinc-950 underline underline-offset-4"
          >
            términos y condiciones
          </Link>{" "}
          y autorizo a AgendaYa a contactarme sobre esta solicitud.
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
        disabled={submitting || loadingPlans || !selectedPlan || !acceptedTerms}
        type="submit"
        className="mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Preparando pago seguro..." : "Continuar a Mercado Pago"}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-400">
        Nunca te pediremos datos de tarjeta en este formulario.
      </p>
    </form>
  );
}

function createOnboardingToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
