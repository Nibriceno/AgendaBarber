import PublicAuthPageLayout from "@/features/auth/components/PublicAuthPageLayout";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

import {
  getPublicBusinessOrNotFound,
} from "../_lib/get-public-business-or-not-found";

type ResetPasswordPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: ResetPasswordPageProps) {
  const {
    businessSlug,
  } = await params;

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
    <PublicAuthPageLayout
      businessName={business.name}
      businessSlug={businessSlug}
      eyebrow="Seguridad de tu cuenta"
      title="Crea una nueva contraseña"
      description="El enlace es personal, vence en 30 minutos y funciona una sola vez."
    >
      <ResetPasswordForm
        businessSlug={businessSlug}
        token={token}
      />
    </PublicAuthPageLayout>
  );
}
