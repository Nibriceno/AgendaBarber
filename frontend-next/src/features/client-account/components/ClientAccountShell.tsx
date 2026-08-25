"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import PublicHeader from "@/features/public-booking/components/PublicHeader";

import AccountIcon from "./AccountIcon";
import { CLIENT_ACCOUNT_NAVIGATION } from "../config/navigation";

type ClientAccountShellProps = {
  businessSlug: string;
  children: ReactNode;
};

export default function ClientAccountShell({
  businessSlug,
  children,
}: ClientAccountShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push(`/${businessSlug}`);
  };

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950">
      <PublicHeader businessSlug={businessSlug} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="mb-7 sm:mb-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Área personal
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hola, {user?.firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Revisa tus próximas visitas y mantén tus datos actualizados desde un
            solo lugar.
          </p>
        </div>

        <nav
          aria-label="Secciones de mi cuenta"
          className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm lg:hidden"
        >
          {CLIENT_ACCOUNT_NAVIGATION.map((item) => {
            const href = `/${businessSlug}${item.path}`;
            const active = pathname === href;

            return (
              <Link
                key={item.path}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
                  active
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                <AccountIcon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="sticky top-28 hidden overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:block">
            <div className="border-b border-zinc-100 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-bold text-white">
                {user?.firstName.charAt(0)}
                {user?.lastName.charAt(0)}
              </div>
              <p className="mt-4 truncate font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {user?.email ?? "Cuenta de cliente"}
              </p>
            </div>

            <nav aria-label="Navegación de mi cuenta" className="p-3">
              {CLIENT_ACCOUNT_NAVIGATION.map((item) => {
                const href = `/${businessSlug}${item.path}`;
                const active = pathname === href;

                return (
                  <Link
                    key={item.path}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
                      active
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    <AccountIcon
                      name={item.icon}
                      className="h-[18px] w-[18px]"
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-100 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <AccountIcon name="logout" className="h-[18px] w-[18px]" />
                Cerrar sesión
              </button>
            </div>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </main>
    </div>
  );
}
