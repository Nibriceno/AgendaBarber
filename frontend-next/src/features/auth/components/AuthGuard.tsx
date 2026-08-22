"use client";

import {
  ReactNode,
  useEffect,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  canAccessProtectedRoute,
  getDefaultRouteForRole,
} from "../lib/auth-routing";

import {
  useAuth,
} from "../context/AuthContext";

type AuthGuardProps = {
  children: ReactNode;

  businessSlug: string;
};

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

        <p className="text-sm text-zinc-500">
          Comprobando sesión...
        </p>
      </div>
    </main>
  );
}

export function AuthGuard({
  children,
  businessSlug,
}: AuthGuardProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const {
    user,
    loading,
    isAuthenticated,
  } =
    useAuth();

  const legacyDashboard =
    `/${businessSlug}/dashboard`;

  const defaultRoute =
    user
      ? getDefaultRouteForRole(
          user.role,
          businessSlug,
        )
      : null;

  const hasAccess =
    user
      ? canAccessProtectedRoute(
          pathname,
          businessSlug,
          user.role,
        )
      : false;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (
      !isAuthenticated ||
      !user
    ) {
      router.replace(
        `/${businessSlug}/login`,
      );

      return;
    }

    /*
     * Compatibilidad temporal con
     * /dashboard antiguo.
     */
    if (
      pathname ===
      legacyDashboard
    ) {
      router.replace(
        getDefaultRouteForRole(
          user.role,
          businessSlug,
        ),
      );

      return;
    }

    if (!hasAccess) {
      router.replace(
        getDefaultRouteForRole(
          user.role,
          businessSlug,
        ),
      );
    }
  }, [
    loading,
    isAuthenticated,
    user,
    pathname,
    legacyDashboard,
    businessSlug,
    hasAccess,
    router,
  ]);

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  if (
    !isAuthenticated ||
    !user
  ) {
    return null;
  }

  if (
    pathname ===
    legacyDashboard
  ) {
    return (
      <LoadingScreen />
    );
  }

  if (
    !defaultRoute ||
    !hasAccess
  ) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <>
      {children}
    </>
  );
}