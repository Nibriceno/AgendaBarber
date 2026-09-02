"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/config/site";
import { usePlatformAuth } from "@/features/platform-auth/context/PlatformAuthContext";
import { cn } from "@/lib/utils/cn";

const NAVIGATION = [
  { label: "Dashboard", href: "/super-admin", icon: "grid" },
  { label: "Barberías", href: "/super-admin/businesses", icon: "store" },
] as const;

function NavIcon({ name }: { name: "grid" | "store" }) {
  return name === "grid" ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v10h16V10" />
      <path d="M3 5h18l-1 5a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 5Z" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

export default function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = usePlatformAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const pageTitle = pathname.startsWith("/super-admin/businesses")
    ? "Gestión de barberías"
    : "Resumen de plataforma";

  const handleLogout = async () => {
    await logout();
    router.replace("/super-admin/login");
  };

  const navigation = (
    <nav className="space-y-1">
      {NAVIGATION.map((item) => {
        const active =
          item.href === "/super-admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
              active
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col bg-zinc-950 text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/8 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xs font-black text-zinc-950">{PLATFORM_BRAND_INITIALS}</div>
          <div>
            <p className="font-semibold tracking-tight">{PLATFORM_BRAND_NAME}</p>
            <p className="text-[11px] text-zinc-500">Plataforma global</p>
          </div>
        </div>
        <div className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Administración</p>
          {navigation}
        </div>
        <div className="border-t border-white/8 p-4">
          <div className="mb-4 px-3">
            <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
            <p className="mt-1 truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="h-10 w-full rounded-xl border border-white/10 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white">Cerrar sesión</button>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-zinc-950 p-4 text-white shadow-2xl">
            <div className="mb-7 flex h-14 items-center justify-between px-2">
              <p className="font-semibold">{PLATFORM_BRAND_NAME}</p>
              <button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="h-9 w-9 rounded-xl text-xl text-zinc-400 hover:bg-white/10">×</button>
            </div>
            <div className="flex-1">{navigation}</div>
            <button onClick={handleLogout} className="h-11 rounded-xl border border-white/10 text-sm text-zinc-300">Cerrar sesión</button>
          </aside>
        </div>
      )}

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button aria-label="Abrir menú" onClick={() => setMenuOpen(true)} className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white lg:hidden">
              <span className="h-px w-4 bg-zinc-900" /><span className="h-px w-4 bg-zinc-900" /><span className="h-px w-4 bg-zinc-900" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-950 sm:text-lg">{pageTitle}</h1>
              <p className="hidden text-xs text-zinc-400 sm:block">Control central de {PLATFORM_BRAND_NAME}</p>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white" aria-label={`${user.firstName} ${user.lastName}`}>
            {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
          </div>
        </header>
        <main className="px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
