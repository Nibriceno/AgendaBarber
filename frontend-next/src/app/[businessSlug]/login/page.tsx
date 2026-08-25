import LoginForm from "@/features/auth/components/LoginForm";
import PublicHeader from "@/features/public-booking/components/PublicHeader";
import {
  getPublicBusinessOrNotFound,
} from "../_lib/get-public-business-or-not-found";

type LoginPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function LoginPage({
  params,
}: LoginPageProps) {
  const { businessSlug } = await params;
  const business =
    await getPublicBusinessOrNotFound(
      businessSlug,
    );

  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessName={business.name}
        businessSlug={businessSlug}
      />

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              AgendaBarber
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900">
              {business.name}
            </h1>

            <p className="mt-2 text-zinc-600">
              Ingresa a tu cuenta
            </p>
          </div>

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
