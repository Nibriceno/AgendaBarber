"use client";

import { AuthProvider } from "@/features/auth/context/AuthContext";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({
  children,
}: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}