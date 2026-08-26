import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import PublicAuthPageLayout from "@/features/auth/components/PublicAuthPageLayout";

import {
  getPublicBusinessOrNotFound,
} from "../_lib/get-public-business-or-not-found";

type ForgotPasswordPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps) {
  const {
    businessSlug,
  } = await params;

  const business =
    await getPublicBusinessOrNotFound(
      businessSlug,
    );

  return (
    <PublicAuthPageLayout
      businessName={business.name}
      businessSlug={businessSlug}
      eyebrow="Recuperación segura"
      title="¿Olvidaste tu contraseña?"
      description="Te enviaremos un enlace de un solo uso para crear una nueva."
    >
      <ForgotPasswordForm
        businessSlug={businessSlug}
      />
    </PublicAuthPageLayout>
  );
}
