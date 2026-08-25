import EmailVerificationView from "@/features/auth/components/EmailVerificationView";
import PublicHeader from "@/features/public-booking/components/PublicHeader";
import {
  getPublicBusinessOrNotFound,
} from "../_lib/get-public-business-or-not-found";

type VerifyEmailPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;

  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function VerifyEmailPage({
  params,
  searchParams,
}: VerifyEmailPageProps) {
  const { businessSlug } =
    await params;

  const query =
    await searchParams;

  const token =
    Array.isArray(query.token)
      ? query.token[0]
      : query.token;

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
        <EmailVerificationView
          businessSlug={businessSlug}
          token={token}
        />
      </main>
    </div>
  );
}
