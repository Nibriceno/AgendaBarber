"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PLATFORM_BRAND_NAME } from "@/config/site";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function ClientGlobalAuthGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />
          <p className="text-sm text-zinc-500">Comprobando sesión...</p>
        </div>
      </main>
    );
  }

  if (!user || user.role !== "CLIENT") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            {PLATFORM_BRAND_NAME}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Inicia sesión para ver tus reservas
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Puedes ingresar desde cualquiera de las barberías en las que uses AgendaYa. Tu cuenta y tu historial son globales.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
