"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getPlatformBusiness, resendPlatformBusinessInvitation } from "../api/platform-businesses.api";
import { BUSINESS_STATUS_CONFIG, formatPlatformDate } from "../lib/platform-business-formatters";
import type { BusinessStatus, PlatformBusinessDetail } from "../types/platform-business.types";
import { ChangeBusinessStatusModal } from "./ChangeBusinessStatusModal";
import { EditPlatformBusinessModal } from "./EditPlatformBusinessModal";

function DataItem({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt className="text-xs font-medium text-zinc-400">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium text-zinc-800">{value || "No informado"}</dd></div>;
}

export default function PlatformBusinessDetailView({ businessId, createdState }: { businessId: number; createdState?: "sent" | "pending" }) {
  const [business, setBusiness] = useState<PlatformBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(createdState === "sent" ? "Barbería creada. La invitación fue enviada al administrador." : createdState === "pending" ? "Barbería creada, pero el correo no pudo enviarse. Puedes reenviarlo desde esta página." : "");
  const [editing, setEditing] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BusinessStatus | null>(null);
  const [resending, setResending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBusiness(await getPlatformBusiness(businessId)); setError(""); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "No fue posible cargar la barbería.")); }
    finally { setLoading(false); }
  }, [businessId]);

  useEffect(() => {
    let active = true;

    void getPlatformBusiness(businessId)
      .then((response) => {
        if (!active) return;
        setBusiness(response);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "No fue posible cargar la barbería."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [businessId]);

  const handleResend = async () => {
    setResending(true); setError(""); setNotice("");
    try { const result = await resendPlatformBusinessInvitation(businessId); setNotice(result.emailSent ? "Invitación reenviada correctamente." : "No fue posible enviar el correo. La invitación quedó pendiente para volver a intentarlo."); await load(); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "No fue posible reenviar la invitación.")); }
    finally { setResending(false); }
  };

  if (loading && !business) return <div className="space-y-5"><div className="h-28 animate-pulse rounded-3xl bg-zinc-200/70" /><div className="grid gap-5 lg:grid-cols-3"><div className="h-80 animate-pulse rounded-2xl bg-zinc-200/70 lg:col-span-2" /><div className="h-80 animate-pulse rounded-2xl bg-zinc-200/70" /></div></div>;
  if (!business) return <Card className="p-8 text-center"><p className="font-semibold text-zinc-950">No pudimos abrir esta barbería</p><p className="mt-2 text-sm text-zinc-500">{error}</p><button onClick={() => void load()} className="mt-5 h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white">Intentar nuevamente</button></Card>;

  const status = BUSINESS_STATUS_CONFIG[business.status];
  const invitation = business.initialAdmin?.businessInvitation;
  const invitationAccepted = Boolean(invitation?.acceptedAt || business.initialAdmin?.isRegistered);

  return (
    <div className="space-y-6">
      <div><Link href="/super-admin/businesses" className="text-sm font-semibold text-zinc-500 hover:text-zinc-950">← Volver a barberías</Link></div>
      <header className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="truncate text-3xl font-semibold tracking-[-0.04em] text-zinc-950">{business.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}>{status.label}</span></div><p className="mt-2 text-sm text-zinc-500">/{business.slug} · creada el {formatPlatformDate(business.createdAt)}</p></div>
        <div className="flex flex-wrap gap-2"><a href={`/${business.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">Ver sitio ↗</a><button onClick={() => setEditing(true)} className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">Editar datos</button></div>
      </header>

      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Clientes', business.counters.clients], ['Equipo', business.counters.team], ['Servicios', business.counters.services], ['Reservas', business.counters.appointments]].map(([label, value]) => <Card key={String(label)} className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-zinc-950">{value}</p></Card>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-zinc-950">Datos generales</h3><p className="mt-1 text-xs text-zinc-500">Información de contacto y operación</p></div></div><dl className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2"><DataItem label="Correo" value={business.email} /><DataItem label="Teléfono" value={business.phone} /><DataItem label="Dirección" value={business.address} /><DataItem label="Zona horaria" value={business.timezone} /><DataItem label="Moneda" value={business.currency} /><DataItem label="Última actualización" value={formatPlatformDate(business.updatedAt)} /></dl></Card>

        <Card className="p-5 sm:p-6"><h3 className="font-semibold text-zinc-950">Administrador inicial</h3><p className="mt-1 text-xs text-zinc-500">Responsable del negocio</p>{business.initialAdmin ? <div className="mt-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">{business.initialAdmin.firstName.charAt(0)}{business.initialAdmin.lastName.charAt(0)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-950">{business.initialAdmin.firstName} {business.initialAdmin.lastName}</p><p className="truncate text-xs text-zinc-500">{business.initialAdmin.email}</p></div></div><div className={`mt-5 rounded-xl p-3 text-sm ${invitationAccepted ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{invitationAccepted ? `Cuenta activada${business.initialAdmin.lastLoginAt ? ` · último acceso ${formatPlatformDate(business.initialAdmin.lastLoginAt)}` : ""}` : invitation?.sentAt ? `Invitación enviada · vence ${formatPlatformDate(invitation.expiresAt)}` : "Invitación pendiente de envío"}</div>{!invitationAccepted && <button disabled={resending || business.status !== "ACTIVE"} onClick={handleResend} className="mt-3 h-10 w-full rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">{resending ? "Enviando..." : "Reenviar invitación"}</button>}</div> : <p className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">No se encontró un administrador inicial.</p>}</Card>
      </section>

      <Card className="overflow-hidden"><div className="border-b border-zinc-100 px-5 py-5 sm:px-6"><h3 className="font-semibold text-zinc-950">Control operacional</h3><p className="mt-1 text-xs text-zinc-500">Los cambios de estado se aplican inmediatamente en backend.</p></div><div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6"><button disabled={business.status === "ACTIVE"} onClick={() => setTargetStatus("ACTIVE")} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-300 disabled:cursor-default disabled:opacity-50"><p className="font-semibold text-emerald-900">Activar</p><p className="mt-1 text-xs leading-5 text-emerald-700">Permite acceso y operación normal.</p></button><button disabled={business.status === "SUSPENDED"} onClick={() => setTargetStatus("SUSPENDED")} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 disabled:cursor-default disabled:opacity-50"><p className="font-semibold text-amber-900">Suspender</p><p className="mt-1 text-xs leading-5 text-amber-700">Bloqueo temporal con datos intactos.</p></button><button disabled={business.status === "INACTIVE"} onClick={() => setTargetStatus("INACTIVE")} className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left transition hover:border-red-300 disabled:cursor-default disabled:opacity-50"><p className="font-semibold text-red-900">Inactivar</p><p className="mt-1 text-xs leading-5 text-red-700">Detiene el uso hasta reactivación.</p></button></div>{business.statusReason && <div className="border-t border-zinc-100 px-5 py-4 text-sm text-zinc-600 sm:px-6"><strong className="text-zinc-800">Último motivo:</strong> {business.statusReason}</div>}</Card>

      {editing && <EditPlatformBusinessModal business={business} onClose={() => setEditing(false)} onUpdated={(updated) => { setBusiness(updated); setEditing(false); setNotice("Datos de la barbería actualizados."); }} />}
      {targetStatus && <ChangeBusinessStatusModal business={business} targetStatus={targetStatus} onClose={() => setTargetStatus(null)} onUpdated={(updated) => { setBusiness(updated); setTargetStatus(null); setNotice(`Estado actualizado a ${BUSINESS_STATUS_CONFIG[updated.status].label.toLowerCase()}.`); }} />}
    </div>
  );
}
