"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { PLATFORM_BRAND_NAME } from "@/config/site";
import {
  getPlatformBusinesses,
  getPlatformBusinessSummary,
} from "@/features/platform-businesses/api/platform-businesses.api";
import {
  BUSINESS_STATUS_CONFIG,
  formatCompactNumber,
  formatPlatformDate,
} from "@/features/platform-businesses/lib/platform-business-formatters";
import type {
  PlatformBusinessListItem,
  PlatformBusinessSummary,
} from "@/features/platform-businesses/types/platform-business.types";
import { usePlatformAuth } from "@/features/platform-auth/context/PlatformAuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";

function MetricCard({
  label,
  value,
  detail,
  tone = "light",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "dark" | "light";
}) {
  return (
    <article
      className={
        tone === "dark"
          ? "rounded-2xl bg-zinc-950 p-5 text-white shadow-lg shadow-zinc-950/10"
          : "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      }
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.13em] ${tone === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{formatCompactNumber(value)}</p>
      <p className={`mt-2 text-xs ${tone === "dark" ? "text-zinc-500" : "text-zinc-500"}`}>{detail}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Cargando dashboard">
      <div className="h-28 animate-pulse rounded-3xl bg-zinc-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl bg-zinc-200/70" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-zinc-200/70" />
    </div>
  );
}

export default function PlatformDashboardView() {
  const { user } = usePlatformAuth();
  const [summary, setSummary] = useState<PlatformBusinessSummary | null>(null);
  const [recent, setRecent] = useState<PlatformBusinessListItem[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [summaryResult, businessesResult] = await Promise.all([
      getPlatformBusinessSummary(),
      getPlatformBusinesses({ page: 1, pageSize: 5 }),
    ]);
    setSummary(summaryResult);
    setRecent(businessesResult.items);
    setError("");
  }, []);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getPlatformBusinessSummary(),
      getPlatformBusinesses({ page: 1, pageSize: 5 }),
    ])
      .then(([summaryResult, businessesResult]) => {
        if (!active) return;
        setSummary(summaryResult);
        setRecent(businessesResult.items);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "No fue posible cargar el resumen global."));
      });

    return () => { active = false; };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No fue posible actualizar los datos."));
    } finally {
      setRefreshing(false);
    }
  };

  if (!summary && !error) return <DashboardSkeleton />;

  if (!summary) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold text-zinc-950">No pudimos cargar la plataforma</p>
        <p className="mt-2 text-sm text-zinc-500">{error}</p>
        <button onClick={handleRefresh} className="mt-5 h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white">Intentar nuevamente</button>
      </Card>
    );
  }

  const operationalPercentage = summary.businesses.total
    ? Math.round((summary.businesses.active / summary.businesses.total) * 100)
    : 0;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-amber-100 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Visión general</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">Hola, {user?.firstName}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">El {operationalPercentage}% de los negocios registrados se encuentra operativo. Aquí tienes el estado actualizado de {PLATFORM_BRAND_NAME}.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button disabled={refreshing} onClick={handleRefresh} className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60">{refreshing ? "Actualizando..." : "Actualizar"}</button>
            <Link href="/super-admin/businesses?create=1" className="inline-flex h-11 items-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800">Nuevo negocio</Link>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas de plataforma">
        <MetricCard label="Negocios" value={summary.businesses.total} detail={`${summary.businesses.active} activos`} tone="dark" />
        <MetricCard label="Usuarios" value={summary.users} detail="En todos los negocios" />
        <MetricCard label="Profesionales" value={summary.barbers} detail="Perfiles registrados" />
        <MetricCard label="Reservas" value={summary.appointments} detail="Histórico de plataforma" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5 sm:px-6">
            <div>
              <h3 className="font-semibold text-zinc-950">Negocios recientes</h3>
              <p className="mt-1 text-xs text-zinc-500">Últimos negocios incorporados</p>
            </div>
            <Link href="/super-admin/businesses" className="text-sm font-semibold text-zinc-600 hover:text-zinc-950">Ver todas →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-zinc-500">Aún no hay negocios registrados.</p>
          ) : (
            <ul>
              {recent.map((business) => {
                const status = BUSINESS_STATUS_CONFIG[business.status];
                return (
                  <li key={business.id} className="border-b border-zinc-100 last:border-0">
                    <Link href={`/super-admin/businesses/${business.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-zinc-50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">{business.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">/{business.slug} · creada {formatPlatformDate(business.createdAt)}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}>{status.label}</span>
                      <span className="text-xs font-semibold text-zinc-400 sm:text-right">{business._count.appointments} reservas</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-semibold text-zinc-950">Estado operacional</h3>
          <p className="mt-1 text-xs text-zinc-500">Distribución actual de negocios</p>
          <div className="mt-7 space-y-5">
            {([
              ["ACTIVE", "Activas", summary.businesses.active, "bg-emerald-500"],
              ["SUSPENDED", "Suspendidas", summary.businesses.suspended, "bg-amber-500"],
              ["INACTIVE", "Inactivas", summary.businesses.inactive, "bg-zinc-400"],
            ] as const).map(([key, label, value, color]) => (
              <div key={key}>
                <div className="flex justify-between text-sm"><span className="text-zinc-600">{label}</span><span className="font-semibold tabular-nums text-zinc-950">{value}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${summary.businesses.total ? (value / summary.businesses.total) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Catálogo de servicios</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">{formatCompactNumber(summary.services)}</p>
            <p className="mt-1 text-xs text-zinc-400">servicios configurados globalmente</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
