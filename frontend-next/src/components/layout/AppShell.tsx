"use client";

import {
  ReactNode,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Button,
} from "@/components/ui/Button";

import {
  APP_NAVIGATION,
} from "@/config/navigation";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import {
  getDefaultRouteForRole,
  getRoleAreaLabel,
} from "@/features/auth/lib/auth-routing";

import {
  cn,
} from "@/lib/utils/cn";

type AppShellProps = {
  children:
    ReactNode;

  businessSlug:
    string;
};

export default function AppShell({
  children,
  businessSlug,
}: AppShellProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    user,
    logout,
  } =
    useAuth();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false);

  if (!user) {
    return null;
  }

  const navigation =
    APP_NAVIGATION.filter(
      (item) =>
        item.roles.includes(
          user.role,
        ),
    );

  const homeHref =
    getDefaultRouteForRole(
      user.role,
      businessSlug,
    );

  const areaLabel =
    getRoleAreaLabel(
      user.role,
    );

  const handleLogout =
    () => {
      logout();

      router.replace(
        `/${businessSlug}/login`,
      );
    };

  const currentPage =
    navigation.find(
      (item) => {
        const href =
          `/${businessSlug}/${item.segment}`;

        return (
          pathname === href ||
          pathname.startsWith(
            `${href}/`,
          )
        );
      },
    )?.label ??
    "AgendaBarber";

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-zinc-100 px-6">
          <Link
            href={
              homeHref
            }
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
              AB
            </div>

            <div>
              <p className="font-semibold tracking-tight text-zinc-950">
                AgendaBarber
              </p>

              <p className="max-w-36 truncate text-xs text-zinc-400">
                {
                  businessSlug
                }
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Principal
          </p>

          <div className="space-y-1">
            {navigation.map(
              (item) => {
                const href =
                  `/${businessSlug}/${item.segment}`;

                const active =
                  pathname ===
                    href ||
                  pathname.startsWith(
                    `${href}/`,
                  );

                return (
                  <Link
                    key={
                      item.segment
                    }
                    href={
                      href
                    }
                    className={cn(
                      "flex h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors",

                      active
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                  >
                    {
                      item.label
                    }
                  </Link>
                );
              },
            )}
          </div>
        </nav>

        <div className="border-t border-zinc-100 p-4">
          <div className="mb-4 px-3">
            <p className="truncate text-sm font-medium text-zinc-950">
              {
                user.firstName
              }{" "}
              {
                user.lastName
              }
            </p>

            <p className="mt-0.5 truncate text-xs text-zinc-400">
              {
                user.email
              }
            </p>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={
              handleLogout
            }
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/30"
            onClick={() =>
              setMobileMenuOpen(
                false,
              )
            }
          />

          <aside className="relative z-50 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-20 items-center justify-between border-b border-zinc-100 px-5">
              <Link
                href={
                  homeHref
                }
                className="flex items-center gap-3"
                onClick={() =>
                  setMobileMenuOpen(
                    false,
                  )
                }
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-xs font-semibold text-white">
                  AB
                </div>

                <span className="font-semibold">
                  AgendaBarber
                </span>
              </Link>

              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() =>
                  setMobileMenuOpen(
                    false,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-zinc-500 hover:bg-zinc-100"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 p-4">
              {navigation.map(
                (item) => {
                  const href =
                    `/${businessSlug}/${item.segment}`;

                  const active =
                    pathname ===
                      href ||
                    pathname.startsWith(
                      `${href}/`,
                    );

                  return (
                    <Link
                      key={
                        item.segment
                      }
                      href={
                        href
                      }
                      onClick={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                      className={cn(
                        "flex h-11 items-center rounded-xl px-3 text-sm font-medium",

                        active
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600 hover:bg-zinc-100",
                      )}
                    >
                      {
                        item.label
                      }
                    </Link>
                  );
                },
              )}
            </nav>

            <div className="border-t border-zinc-100 p-4">
              <p className="px-2 text-sm font-medium">
                {
                  user.firstName
                }{" "}
                {
                  user.lastName
                }
              </p>

              <p className="mb-4 mt-1 px-2 text-xs text-zinc-400">
                {
                  user.email
                }
              </p>

              <Button
                variant="secondary"
                className="w-full"
                onClick={
                  handleLogout
                }
              >
                Cerrar sesión
              </Button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() =>
                setMobileMenuOpen(
                  true,
                )
              }
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white lg:hidden"
            >
              <span className="h-px w-4 bg-zinc-950" />
              <span className="h-px w-4 bg-zinc-950" />
              <span className="h-px w-4 bg-zinc-950" />
            </button>

            <div>
              <h1 className="text-base font-semibold text-zinc-950 md:text-lg">
                {
                  currentPage
                }
              </h1>

              <p className="hidden text-xs text-zinc-400 sm:block">
                {
                  areaLabel
                }
              </p>
            </div>
          </div>

          <div
            aria-label={`Usuario ${user.firstName} ${user.lastName}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700"
          >
            {user.firstName
              .charAt(0)
              .toUpperCase()}

            {user.lastName
              .charAt(0)
              .toUpperCase()}
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}