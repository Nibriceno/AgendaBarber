import { PlatformAuthGuard } from "@/features/platform-auth/components/PlatformAuthGuard";
import PlatformShell from "@/features/platform-layout/components/PlatformShell";

export default function ProtectedPlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PlatformAuthGuard>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthGuard>
  );
}
