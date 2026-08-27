"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import AccountIcon from "@/features/client-account/components/AccountIcon";
import { CLIENT_ACCOUNT_NAVIGATION } from "@/features/client-account/config/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getDefaultRouteForRole } from "@/features/auth/lib/auth-routing";

type PublicHeaderProps = {
  businessName?: string;
  businessSlug: string;
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function PublicHeader({
  businessName,
  businessSlug,
}: PublicHeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  const staffPanelHref =
    user && user.role !== "CLIENT"
      ? getDefaultRouteForRole(user.role, user.businessSlug)
      : null;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push(`/${businessSlug}`);
  };

  const secondaryActionClassName =
    "inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40";

  const primaryActionClassName =
    "inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/60";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 text-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6">
        <Link
          href={`/${businessSlug}`}
          className="group flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white text-sm font-bold text-zinc-950 transition group-hover:scale-[1.03]">
            AB
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-white sm:text-base">
              {businessName ?? "AgendaBarber"}
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 sm:block">
              {businessName ? "AgendaBarber" : "Reservas online"}
            </span>
          </span>
        </Link>

        {loading ? (
          <span
            aria-live="polite"
            className={`${secondaryActionClassName} cursor-wait text-zinc-400`}
          >
            Comprobando sesión...
          </span>
        ) : user?.role === "CLIENT" ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="client-account-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="group flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] py-1 pl-1 pr-2 text-left transition hover:border-white/25 hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-white/40 sm:gap-3 sm:pr-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-950">
                {getInitials(user.firstName, user.lastName)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Mi cuenta
                </span>
                <span className="block max-w-32 truncate text-sm font-semibold text-white">
                  {user.firstName}
                </span>
              </span>
              <AccountIcon
                name="chevron"
                className={`h-4 w-4 text-zinc-400 transition ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuOpen && (
              <div
                id="client-account-menu"
                className="absolute right-0 top-[calc(100%+0.65rem)] w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-950 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
              >
                <div className="border-b border-zinc-100 px-3 py-3">
                  <p className="truncate text-sm font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {user.email ?? "Cuenta de cliente"}
                  </p>
                </div>

                <nav aria-label="Cuenta del cliente" className="py-1">
                  {CLIENT_ACCOUNT_NAVIGATION.map((item) => (
                    <Link
                      key={item.path}
                      href={`/${businessSlug}${item.path}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    >
                      <AccountIcon
                        name={item.icon}
                        className="h-[18px] w-[18px] text-zinc-500"
                      />
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="border-t border-zinc-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <AccountIcon name="logout" className="h-[18px] w-[18px]" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : staffPanelHref ? (
          <Link href={staffPanelHref} className={secondaryActionClassName}>
            Ir al panel
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/${businessSlug}/login`}
              className={secondaryActionClassName}
            >
              <span className="sm:hidden">Ingresar</span>
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Link>

            <Link
              href={`/${businessSlug}/register`}
              className={primaryActionClassName}
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
