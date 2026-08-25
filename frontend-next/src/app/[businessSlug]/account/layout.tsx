import type { ReactNode } from "react";

import { AuthGuard } from "@/features/auth/components/AuthGuard";
import ClientAccountShell from "@/features/client-account/components/ClientAccountShell";

type ClientAccountLayoutProps = {
  children: ReactNode;
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ClientAccountLayout({
  children,
  params,
}: ClientAccountLayoutProps) {
  const { businessSlug } = await params;

  return (
    <AuthGuard businessSlug={businessSlug}>
      <ClientAccountShell businessSlug={businessSlug}>
        {children}
      </ClientAccountShell>
    </AuthGuard>
  );
}
