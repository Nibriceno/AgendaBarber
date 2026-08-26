import type {
  ReactNode,
} from "react";

import PublicHeader from "@/features/public-booking/components/PublicHeader";

type PublicAuthPageLayoutProps = {
  businessName: string;
  businessSlug: string;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function PublicAuthPageLayout({
  businessName,
  businessSlug,
  eyebrow = "AgendaBarber",
  title,
  description,
  children,
}: PublicAuthPageLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessName={businessName}
        businessSlug={businessSlug}
      />

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              {title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {description}
            </p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
