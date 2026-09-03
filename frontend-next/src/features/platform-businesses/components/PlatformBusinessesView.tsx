"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getPlatformBusinesses } from "../api/platform-businesses.api";
import {
  BUSINESS_STATUS_CONFIG,
  formatPlatformDate,
} from "../lib/platform-business-formatters";
import type {
  BusinessStatus,
  PlatformBusinessesResponse,
} from "../types/platform-business.types";
import { CreatePlatformBusinessModal } from "./CreatePlatformBusinessModal";

const PAGE_SIZE = 10;

export default function PlatformBusinessesView({ initialCreate = false }: { initialCreate?: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<PlatformBusinessesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BusinessStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(initialCreate);

  useEffect(() => {
    let active = true;

    void getPlatformBusinesses({ page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined })
      .then((response) => {
        if (!active) return;
        setResult(response);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "No fue posible cargar los negocios."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, search, status]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">Directorio global</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">Negocios</h2>
          <p className="mt-2 text-sm text-zinc-500">Busca, revisa y administra cada negocio desde un solo lugar.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800">+ Nuevo negocio</button>
      </header>

      <Card className="p-4 sm:p-5">
        <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]">
          <div className="relative">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por nombre, slug o correo" className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
          </div>
          <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as BusinessStatus | ""); setPage(1); }} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400">
            <option value="">Todos los estados</option><option value="ACTIVE">Activas</option><option value="SUSPENDED">Suspendidas</option><option value="INACTIVE">Inactivas</option>
          </select>
          <button type="submit" className="h-11 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Buscar</button>
        </form>
      </Card>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-950">{loading ? "Cargando..." : `${result?.pagination.total ?? 0} negocios`}</p>
          {(search || status) && <button onClick={() => { setLoading(true); setSearchInput(""); setSearch(""); setStatus(""); setPage(1); }} className="text-xs font-semibold text-zinc-500 hover:text-zinc-950">Limpiar filtros</button>}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"><tr><th className="px-5 py-3">Negocio</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Actividad</th><th className="px-4 py-3">Creación</th><th className="px-5 py-3 text-right">Acción</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={5} className="px-5 py-4"><div className="h-10 animate-pulse rounded-lg bg-zinc-100" /></td></tr>) : result?.items.map((business) => {
                const statusConfig = BUSINESS_STATUS_CONFIG[business.status];
                return <tr key={business.id} className="transition hover:bg-zinc-50/80"><td className="px-5 py-4"><p className="font-semibold text-zinc-950">{business.name}</p><p className="mt-1 text-xs text-zinc-400">/{business.slug}{business.email ? ` · ${business.email}` : ""}</p></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusConfig.className}`}><span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClassName}`} />{statusConfig.label}</span></td><td className="px-4 py-4"><p className="text-sm font-semibold text-zinc-800">{business._count.appointments} reservas</p><p className="mt-1 text-xs text-zinc-400">{business._count.barbers} profesionales · {business._count.services} servicios</p></td><td className="px-4 py-4 text-sm text-zinc-500">{formatPlatformDate(business.createdAt)}</td><td className="px-5 py-4 text-right"><Link href={`/super-admin/businesses/${business.id}`} className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:text-zinc-950">Ver detalle</Link></td></tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-zinc-100 md:hidden">
          {!loading && result?.items.map((business) => {
            const statusConfig = BUSINESS_STATUS_CONFIG[business.status];
            return <Link key={business.id} href={`/super-admin/businesses/${business.id}`} className="block p-5 transition hover:bg-zinc-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-zinc-950">{business.name}</p><p className="mt-1 truncate text-xs text-zinc-400">/{business.slug}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusConfig.className}`}>{statusConfig.label}</span></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3 text-center"><div><p className="font-semibold text-zinc-900">{business._count.appointments}</p><p className="text-[10px] text-zinc-400">Reservas</p></div><div><p className="font-semibold text-zinc-900">{business._count.barbers}</p><p className="text-[10px] text-zinc-400">Profesionales</p></div><div><p className="font-semibold text-zinc-900">{business._count.services}</p><p className="text-[10px] text-zinc-400">Servicios</p></div></div></Link>;
          })}
          {loading && <div className="p-5"><div className="h-28 animate-pulse rounded-xl bg-zinc-100" /></div>}
        </div>

        {!loading && result?.items.length === 0 && <div className="px-6 py-16 text-center"><p className="font-semibold text-zinc-800">No encontramos negocios</p><p className="mt-2 text-sm text-zinc-500">Prueba con otros filtros o crea un nuevo negocio.</p></div>}

        {result && result.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4"><button disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }} className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 disabled:opacity-40">Anterior</button><p className="text-xs text-zinc-500">Página <strong className="text-zinc-900">{result.pagination.page}</strong> de {result.pagination.totalPages}</p><button disabled={page >= result.pagination.totalPages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }} className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 disabled:opacity-40">Siguiente</button></div>}
      </Card>

      <CreatePlatformBusinessModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(created) => { setCreateOpen(false); router.push(`/super-admin/businesses/${created.business.id}?created=${created.invitationEmailSent ? "sent" : "pending"}`); }} />
    </div>
  );
}
