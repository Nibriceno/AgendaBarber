import { PlatformAuthProvider } from "@/features/platform-auth/context/PlatformAuthContext";

export default function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PlatformAuthProvider>{children}</PlatformAuthProvider>;
}
