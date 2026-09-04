"use client";

import Link from "next/link";

import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/config/site";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function MarketingHeader() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const primaryHref = isAdmin
    ? `/${user.businessSlug}/subscription`
    : "/#planes";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-18 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 text-[11px] font-black text-zinc-950">{PLATFORM_BRAND_INITIALS}</span>
          <span className="font-semibold tracking-[-0.02em]">{PLATFORM_BRAND_NAME}</span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden items-center gap-7 md:flex">
          <Link href="/#beneficios" className="text-sm text-zinc-400 transition hover:text-white">Beneficios</Link>
          <Link href="/#planes" className="text-sm text-zinc-400 transition hover:text-white">Planes</Link>
          <Link href="/#como-funciona" className="text-sm text-zinc-400 transition hover:text-white">Cómo funciona</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/mi-cuenta/reservas" className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white sm:inline-flex">Mis reservas</Link>
          <Link href={primaryHref} className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200">
            {loading ? "AgendaYa" : isAdmin ? "Mi suscripción" : "Ver planes"}
          </Link>
        </div>
      </div>
    </header>
  );
}
