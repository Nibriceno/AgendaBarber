"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Card } from "@/components/ui/Card";
import { PLANS, formatPlanPrice } from "@/features/marketing/config/plans";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getPlatformPlanRequests, updatePlatformPlanRequestStatus } from "../api/platform-plan-requests.api";
import type { PlanRequestStatus, PlatformPlanRequestsResponse } from "../types/platform-plan-request.types";

const PAGE_SIZE = 10;
const STATUS: Record<PlanRequestStatus, { label: string; className: string }> = {
  NEW: { label: "Nueva", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  CHECKOUT_PENDING: { label: "Pago pendiente", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  PAID: { label: "Pagada", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  PAYMENT_REVERSED: { label: "Pago revertido", className: "bg-red-50 text-red-700 ring-red-200" },
  CONTACTED: { label: "Contactada", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  CONVERTED: { label: "Convertida", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CLOSED: { label: "Cerrada", className: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
};
const CATEGORY = { BARBERSHOP: "Barbería", HAIR_SALON: "Peluquería", NAIL_SALON: "Centro de uñas", BEAUTY_CENTER: "Centro de estética", MASSAGE_CENTER: "Masajes o bienestar", OTHER: "Otro" } as const;
const CONTACT = { WHATSAPP: "WhatsApp", EMAIL: "Correo", EITHER: "WhatsApp o correo" } as const;

export default function PlatformPlanRequestsView() {
  const [result, setResult] = useState<PlatformPlanRequestsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlanRequestStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getPlatformPlanRequests({ page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined })
      .then((response) => {
        if (!active) return;
        setResult(response);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "No fue posible cargar las solicitudes."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, search, status]);

  const handleSearch = (event: FormEvent) => { event.preventDefault(); setLoading(true); setPage(1); setSearch(searchInput.trim()); };

  const changeStatus = async (id: number, nextStatus: PlanRequestStatus) => {
    setUpdatingId(id);
    try {
      const updated = await updatePlatformPlanRequestStatus(id, nextStatus);
      setResult((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? updated : item) } : current);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No fue posible actualizar la solicitud."));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header><p className="text-sm font-semibold text-amber-700">Flujo comercial</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">Solicitudes de planes</h2><p className="mt-2 text-sm text-zinc-500">Contacta a cada negocio y registra el avance de su activación.</p></header>
      <Card className="p-4 sm:p-5"><form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar negocio, persona, correo o teléfono" className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:bg-white" /><select value={status} onChange={(event) => { setStatus(event.target.value as PlanRequestStatus | ""); setPage(1); }} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none"><option value="">Todos los estados</option>{Object.entries(STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</select><button className="h-11 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Buscar</button></form></Card>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4">
        {loading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-44 animate-pulse bg-zinc-100" />) : result?.items.map((item) => (
          <Card key={item.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-zinc-950">{item.businessName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS[item.status].className}`}>{STATUS[item.status].label}</span></div><p className="mt-1 text-sm text-zinc-500">{CATEGORY[item.businessCategory]} · Plan {PLANS[item.plan].name} · {item.teamSize} personas · {formatPlanPrice(item.monthlyPrice)}/mes</p>{item.desiredSlug && <p className="mt-2 text-xs font-medium text-zinc-500">URL solicitada: agendaya.cl/{item.desiredSlug}</p>}</div>
              <label className="text-xs font-medium text-zinc-500">Estado<select disabled={updatingId === item.id} value={item.status} onChange={(event) => void changeStatus(item.id, event.target.value as PlanRequestStatus)} className="mt-1 block h-10 min-w-40 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none disabled:opacity-50">{Object.entries(STATUS).map(([value, config]) => <option key={value} value={value} disabled={value === "CHECKOUT_PENDING" || value === "PAID" || value === "PAYMENT_REVERSED"}>{config.label}</option>)}</select></label>
            </div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-zinc-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-zinc-400">Contacto</p><p className="mt-1 font-medium text-zinc-800">{item.contactName}</p></div><div><p className="text-xs text-zinc-400">Correo</p><a href={`mailto:${item.email}`} className="mt-1 block truncate font-medium text-zinc-800 hover:underline">{item.email}</a></div><div><p className="text-xs text-zinc-400">Teléfono</p><a href={`tel:${item.phone}`} className="mt-1 block font-medium text-zinc-800 hover:underline">{item.phone}</a></div><div><p className="text-xs text-zinc-400">Preferencia</p><p className="mt-1 font-medium text-zinc-800">{CONTACT[item.contactPreference]}</p></div></div>
            {item.notes && <p className="mt-4 rounded-xl border border-zinc-100 px-4 py-3 text-sm leading-6 text-zinc-600">{item.notes}</p>}
            {item.discountAmount > 0 && <p className="mt-4 text-sm font-medium text-emerald-700">Descuento aplicado: {item.discount?.name ?? item.promoCode} · -{formatPlanPrice(item.discountAmount)} (base {formatPlanPrice(item.basePrice)})</p>}
            {item.checkouts[0] && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><span className="font-semibold">Mercado Pago: {item.checkouts[0].status}</span>{item.checkouts[0].mercadoPagoPaymentId ? ` · Pago ${item.checkouts[0].mercadoPagoPaymentId}` : ""}{item.checkouts[0].paidAt ? ` · Aprobado ${new Date(item.checkouts[0].paidAt).toLocaleString("es-CL")}` : ""}</div>}
            <p className="mt-4 text-xs text-zinc-400">Recibida el {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
          </Card>
        ))}
        {!loading && result?.items.length === 0 && <Card className="px-6 py-16 text-center"><p className="font-semibold text-zinc-800">No hay solicitudes para estos filtros</p><p className="mt-2 text-sm text-zinc-500">Las solicitudes enviadas desde la página principal aparecerán aquí.</p></Card>}
      </div>
      {result && result.pagination.totalPages > 1 && <div className="flex items-center justify-between"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold disabled:opacity-40">Anterior</button><p className="text-xs text-zinc-500">Página {result.pagination.page} de {result.pagination.totalPages}</p><button disabled={page >= result.pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold disabled:opacity-40">Siguiente</button></div>}
    </div>
  );
}
