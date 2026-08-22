import { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import { AuthGuard } from "@/features/auth/components/AuthGuard";

type ProtectedLayoutProps = {
  children: ReactNode;

  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ProtectedLayout({
  children,
  params,
}: ProtectedLayoutProps) {
  const { businessSlug } = await params;

  return (
    <AuthGuard businessSlug={businessSlug}>
      <AppShell businessSlug={businessSlug}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}