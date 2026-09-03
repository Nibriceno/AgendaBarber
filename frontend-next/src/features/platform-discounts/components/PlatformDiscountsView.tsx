"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Card } from "@/components/ui/Card";
import { PLANS, formatPlanPrice, type PlanCode } from "@/features/marketing/config/plans";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createPlatformDiscount, getPlatformDiscounts, updatePlatformDiscount } from "../api/platform-discounts.api";
import type { PlanDiscountInput, PlanDiscountType, PlatformPlanDiscount } from "../types/platform-discount.types";

const EMPTY_FORM: PlanDiscountInput = { plan: "ESSENTIAL", name: "", type: "PERCENTAGE", value: 10, code: "", autoApply: true, isActive: true };
const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const toLocalDateTime = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default function PlatformDiscountsView() {
  const [discounts, setDiscounts] = useState<PlatformPlanDiscount[]>([]);
  const [form, setForm] = useState<PlanDiscountInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    try { setDiscounts(await getPlatformDiscounts()); setError(""); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "No fue posible cargar los descuentos.")); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;

    void getPlatformDiscounts()
      .then((items) => {
        if (!active) return;
        setDiscounts(items);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "No fue posible cargar los descuentos."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(""); setNotice("");
    const input = { ...form, code: form.autoApply ? undefined : form.code, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined };
    try {
      if (editingId) await updatePlatformDiscount(editingId, input);
      else await createPlatformDiscount(input);
      setNotice(editingId ? "Descuento actualizado." : "Descuento creado y disponible según sus fechas.");
      setEditingId(null); setForm(EMPTY_FORM); await load();
    } catch (requestError) { setError(getApiErrorMessage(requestError, "No fue posible guardar el descuento.")); }
    finally { setSubmitting(false); }
  };

  const edit = (discount: PlatformPlanDiscount) => {
    setEditingId(discount.id);
    setForm({ plan: discount.plan, name: discount.name, type: discount.type, value: discount.value, code: discount.code ?? "", autoApply: discount.autoApply, isActive: discount.isActive, startsAt: toLocalDateTime(discount.startsAt), endsAt: toLocalDateTime(discount.endsAt) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (discount: PlatformPlanDiscount) => {
    try { await updatePlatformDiscount(discount.id, { isActive: !discount.isActive }); await load(); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "No fue posible cambiar el estado.")); }
  };

  return <div className="space-y-6">
    <header><p className="text-sm font-semibold text-amber-700">Precios y promociones</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">Descuentos de planes</h2><p className="mt-2 text-sm text-zinc-500">Crea campañas automáticas o códigos promocionales. Solo se aplica el mejor descuento y nunca se acumulan.</p></header>
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <Card className="p-5 sm:p-6"><form onSubmit={submit}><div className="flex items-center justify-between"><div><h3 className="font-semibold text-zinc-950">{editingId ? "Editar descuento" : "Nuevo descuento"}</h3><p className="mt-1 text-xs text-zinc-500">Los montos se calculan en el backend antes de crear el pago.</p></div>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} className="text-xs font-semibold text-zinc-500">Cancelar edición</button>}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-zinc-700">Plan<select value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value as PlanCode }))} className={inputClass}>{Object.values(PLANS).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}</select></label>
        <label className="text-sm font-medium text-zinc-700">Nombre<input required maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="Lanzamiento 20%" /></label>
        <label className="text-sm font-medium text-zinc-700">Tipo<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PlanDiscountType }))} className={inputClass}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED_AMOUNT">Monto fijo</option></select></label>
        <label className="text-sm font-medium text-zinc-700">Valor<input required type="number" min={1} max={form.type === "PERCENTAGE" ? 90 : 100000} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value) }))} className={inputClass} /><span className="mt-1 block text-xs text-zinc-400">{form.type === "PERCENTAGE" ? "Entre 1% y 90%" : "Monto en pesos chilenos"}</span></label>
        <label className="text-sm font-medium text-zinc-700">Inicio <span className="font-normal text-zinc-400">(opcional)</span><input type="datetime-local" value={form.startsAt ?? ""} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className={inputClass} /></label>
        <label className="text-sm font-medium text-zinc-700">Término <span className="font-normal text-zinc-400">(opcional)</span><input type="datetime-local" value={form.endsAt ?? ""} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className={inputClass} /></label>
        <label className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700"><input type="checkbox" checked={form.autoApply} onChange={(event) => setForm((current) => ({ ...current, autoApply: event.target.checked, code: event.target.checked ? "" : current.code }))} className="h-4 w-4 accent-zinc-950" /><span>Aplicar automáticamente<span className="block text-xs font-normal text-zinc-400">Visible en la portada</span></span></label>
        {!form.autoApply && <label className="text-sm font-medium text-zinc-700">Código promocional<input required minLength={3} maxLength={30} value={form.code ?? ""} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/\s/g, "") }))} className={inputClass} placeholder="AGENDA20" /></label>}
      </div>
      <button disabled={submitting} className="mt-6 h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">{submitting ? "Guardando..." : editingId ? "Guardar cambios" : "Crear descuento"}</button>
    </form></Card>
    <div className="grid gap-4">
      {loading ? <Card className="h-32 animate-pulse bg-zinc-100" /> : discounts.map((discount) => <Card key={discount.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-zinc-950">{discount.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${discount.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{discount.isActive ? "Activo" : "Inactivo"}</span></div><p className="mt-2 text-sm text-zinc-600">Plan {PLANS[discount.plan].name} · {discount.type === "PERCENTAGE" ? `${discount.value}%` : formatPlanPrice(discount.value)} · {discount.autoApply ? "Automático" : `Código ${discount.code}`}</p><p className="mt-1 text-xs text-zinc-400">{discount.startsAt ? `Desde ${new Date(discount.startsAt).toLocaleString("es-CL")}` : "Sin fecha de inicio"} · {discount.endsAt ? `Hasta ${new Date(discount.endsAt).toLocaleString("es-CL")}` : "Sin fecha de término"}</p></div><div className="flex gap-2"><button onClick={() => edit(discount)} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Editar</button><button onClick={() => void toggle(discount)} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">{discount.isActive ? "Desactivar" : "Activar"}</button></div></div></Card>)}
      {!loading && discounts.length === 0 && <Card className="py-14 text-center text-sm text-zinc-500">Aún no hay descuentos configurados.</Card>}
    </div>
  </div>;
}
