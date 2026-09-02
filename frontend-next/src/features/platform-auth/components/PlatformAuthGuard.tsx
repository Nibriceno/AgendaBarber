"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { usePlatformAuth } from "../context/PlatformAuthContext";

function PlatformLoadingScreen() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f4f5f7]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />
        <p className="text-sm font-medium text-zinc-500">
          Verificando acceso global...
        </p>
      </div>
    </main>
  );
}

export function PlatformAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = usePlatformAuth();
  const hasAccess = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasAccess)) {
      router.replace("/super-admin/login");
    }
  }, [hasAccess, isAuthenticated, loading, router]);

  if (loading || !isAuthenticated || !hasAccess) {
    return <PlatformLoadingScreen />;
  }

  return children;
}
