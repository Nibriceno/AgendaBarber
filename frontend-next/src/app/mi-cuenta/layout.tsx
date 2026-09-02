import type { ReactNode } from "react";

import ClientAccountShell from "@/features/client-account/components/ClientAccountShell";
import ClientGlobalAuthGuard from "@/features/client-account/components/ClientGlobalAuthGuard";

export default function GlobalClientAccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClientGlobalAuthGuard>
      <ClientAccountShell>{children}</ClientAccountShell>
    </ClientGlobalAuthGuard>
  );
}
