"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import { getApiErrorMessage } from "@/lib/api/errors";
import { createPlanCheckout, createPlanRequest } from "../api/plan-requests.api";
import { PLANS, formatPlanPrice, type PlanCode } from "../config/plans";
import type { BusinessCategory, ContactPreference, CreatePlanRequestResponse } from "../types/plan-request.types";

const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "HAIR_SALON", label: "Peluquería o salón de estilistas" },
  { value: "BARBERSHOP", label: "Barbería" },
  { value: "NAIL_SALON", label: "Centro de uñas" },
  { value: "BEAUTY_CENTER", label: "Centro de estética" },
  { value: "MASSAGE_CENTER", label: "Masajes o bienestar" },
  { value: "OTHER", label: "Otro negocio con agenda" },
];

const fieldClass = "mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100";

const toSlug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export default function PlanRequestForm({ initialPlan }: { initialPlan: PlanCode }) {
  const [planCode, setPlanCode] = useState<PlanCode>(initialPlan);
  const [teamSize, setTeamSize] = useState<number>(PLANS[initialPlan].minimumTeamSize);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>("HAIR_SALON");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [chooseSlugLater, setChooseSlugLater] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("WHATSAPP");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestResult, setRequestResult] = useState<CreatePlanRequestResponse | null>(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const selectedPlan = PLANS[planCode];
  const teamOptions = useMemo(() => Array.from({ length: selectedPlan.maximumTeamSize - selectedPlan.minimumTeamSize + 1 }, (_, index) => selectedPlan.minimumTeamSize + index), [selectedPlan]);

  const selectPlan = (nextPlan: PlanCode) => {
    setPlanCode(nextPlan);
    setTeamSize(PLANS[nextPlan].minimumTeamSize);
  };

  const handleBusinessName = (value: string) => {
    setBusinessName(value);
    if (!slugEdited) setDesiredSlug(toSlug(value));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await createPlanRequest({
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
      });
      setRequestResult(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No pudimos enviar tu solicitud. Revisa los datos e inténtalo nuevamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!requestResult) return;
    setStartingPayment(true);
    setPaymentError("");

    try {
      const checkout = await createPlanCheckout(requestResult.id, requestResult.checkoutToken);
      window.location.assign(checkout.initPoint);
    } catch (requestError) {
      setPaymentError(getApiErrorMessage(requestError, "No pudimos iniciar el pago. Inténtalo nuevamente."));
      setStartingPayment(false);
    }
  };

  if (requestResult) {
    return (
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-xl sm:p-10" aria-live="polite">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800">✓</div>
        <p className="mt-8 text-sm font-semibold text-amber-700">Solicitud #{requestResult.id} preparada</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl">Revisa el total antes de pagar.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">El pago corresponde al primer mes del plan. Después de recibirlo, uno de nuestros agentes se contactará contigo vía {contactPreference === "EMAIL" ? "correo electrónico" : contactPreference === "WHATSAPP" ? "WhatsApp" : "WhatsApp o correo"} para agilizar la activación de tu página.</p>
        <div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
          <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-zinc-950">Plan {selectedPlan.name}</p><p className="mt-1">{businessName} · {teamSize} {teamSize === 1 ? "persona" : "personas"}</p></div><p className="font-semibold text-zinc-950">{formatPlanPrice(requestResult.basePrice)}</p></div>
          {requestResult.discountAmount > 0 && <div className="mt-4 flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 text-emerald-700"><span>Descuento · {requestResult.discount?.name}</span><span>-{formatPlanPrice(requestResult.discountAmount)}</span></div>}
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-zinc-200 pt-4"><span className="font-semibold text-zinc-950">Total a pagar ahora</span><span className="text-2xl font-semibold tracking-tight text-zinc-950">{formatPlanPrice(requestResult.monthlyPrice)}</span></div>
          <p className="mt-3 text-xs text-zinc-500">Este pago no activa cobros automáticos futuros.</p>
        </div>
        {paymentError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{paymentError}</div>}
        <button type="button" disabled={startingPayment} onClick={() => void handlePayment()} className="mt-7 inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-[#009ee3] px-6 text-sm font-semibold text-white transition hover:bg-[#008ed0] disabled:opacity-60">{startingPayment ? "Conectando con Mercado Pago..." : `Pagar ${formatPlanPrice(requestResult.monthlyPrice)} con Mercado Pago`}</button>
        <p className="mt-3 text-center text-xs text-zinc-400">Serás redirigido al sitio seguro de Mercado Pago.</p>
        <Link href="/" className="mt-5 inline-flex w-full justify-center text-sm font-medium text-zinc-500 hover:text-zinc-950">Volver al inicio sin pagar</Link>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">1. Selecciona tu plan</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.values(PLANS) as (typeof PLANS)[PlanCode][]).map((plan) => {
            const selected = plan.code === planCode;
            return <button key={plan.code} type="button" onClick={() => selectPlan(plan.code)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-zinc-950 bg-zinc-950 text-white ring-4 ring-zinc-100" : "border-zinc-200 hover:border-zinc-400"}`} aria-pressed={selected}><span className="flex items-center justify-between gap-3"><span className="font-semibold">{plan.name}</span><span className={`h-4 w-4 rounded-full border-4 ${selected ? "border-amber-300 bg-zinc-950" : "border-zinc-300"}`} /></span><span className={`mt-2 block text-sm ${selected ? "text-zinc-300" : "text-zinc-600"}`}>{formatPlanPrice(plan.price)}/mes · {plan.teamRange}</span></button>;
          })}
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-100 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">2. Cuéntanos sobre tu negocio</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700">Nombre del negocio<input required maxLength={100} value={businessName} onChange={(event) => handleBusinessName(event.target.value)} className={fieldClass} placeholder="Ej. Estudio Aurora" /></label>
          <label className="text-sm font-medium text-zinc-700">Tipo de negocio<select value={businessCategory} onChange={(event) => setBusinessCategory(event.target.value as BusinessCategory)} className={fieldClass}>{BUSINESS_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
          <label className="text-sm font-medium text-zinc-700">Personas que usarán la agenda<select value={teamSize} onChange={(event) => setTeamSize(Number(event.target.value))} className={fieldClass}>{teamOptions.map((size) => <option key={size} value={size}>{size} {size === 1 ? "persona" : "personas"}</option>)}</select></label>
          <div>
            <label className="text-sm font-medium text-zinc-700">URL deseada <span className="font-normal text-zinc-400">(opcional)</span><div className={`mt-2 flex h-12 overflow-hidden rounded-xl border border-zinc-200 bg-white transition focus-within:border-zinc-500 focus-within:ring-4 focus-within:ring-zinc-100 ${chooseSlugLater ? "opacity-50" : ""}`}><span className="flex items-center border-r border-zinc-100 bg-zinc-50 px-3 text-xs text-zinc-500">agendaya.cl/</span><input disabled={chooseSlugLater} minLength={3} maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={desiredSlug} onChange={(event) => { setSlugEdited(true); setDesiredSlug(toSlug(event.target.value)); }} className="min-w-0 flex-1 px-3 text-sm text-zinc-950 outline-none" placeholder="tu-negocio" /></div></label>
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" checked={chooseSlugLater} onChange={(event) => setChooseSlugLater(event.target.checked)} className="h-4 w-4 rounded border-zinc-300 accent-zinc-950" />Prefiero decidirla con el agente</label>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-100 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">3. Datos de contacto</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700">Tu nombre<input required maxLength={100} value={contactName} onChange={(event) => setContactName(event.target.value)} className={fieldClass} placeholder="Nombre y apellido" autoComplete="name" /></label>
          <label className="text-sm font-medium text-zinc-700">Correo electrónico<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="tu@negocio.cl" autoComplete="email" /></label>
          <label className="text-sm font-medium text-zinc-700">WhatsApp o teléfono<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} placeholder="+56 9 1234 5678" autoComplete="tel" /></label>
          <label className="text-sm font-medium text-zinc-700">¿Cómo prefieres que te contactemos?<select value={contactPreference} onChange={(event) => setContactPreference(event.target.value as ContactPreference)} className={fieldClass}><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Correo electrónico</option><option value="EITHER">Cualquiera de los dos</option></select></label>
        </div>
        <label className="mt-5 block text-sm font-medium text-zinc-700">¿Hay algo que debamos saber? <span className="font-normal text-zinc-400">(opcional)</span><textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-950 outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100" placeholder="Cuéntanos si ya usas otro sistema o si necesitas ayuda especial." /></label>
        <label className="mt-5 block text-sm font-medium text-zinc-700">Código de descuento <span className="font-normal text-zinc-400">(opcional)</span><input maxLength={30} value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase().replace(/\s/g, ""))} className={fieldClass} placeholder="Ej. BIENVENIDA20" autoComplete="off" /></label>
        <div className="absolute -left-[9999px]" aria-hidden="true"><label>No completar<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-semibold text-amber-950">Antes de enviar</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950/75"><li>• Podrás revisar el precio final antes de abrir Mercado Pago.</li><li>• La URL propuesta se confirma según disponibilidad.</li><li>• Checkout Pro cobrará el primer mes y no generará renovaciones automáticas.</li></ul>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-zinc-600"><input required type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950" /><span>Acepto los <Link href="/terms" target="_blank" className="font-medium text-zinc-950 underline underline-offset-4">términos y condiciones</Link> y autorizo a AgendaYa a contactarme sobre esta solicitud.</span></label>

      {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <button disabled={submitting || !acceptedTerms} type="submit" className="mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Calculando precio..." : "Continuar y revisar precio"}</button>
      <p className="mt-3 text-center text-xs text-zinc-400">No solicitaremos datos de tarjeta en este paso.</p>
    </form>
  );
}
