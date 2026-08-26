import LoginForm from "@/features/auth/components/LoginForm";
import PublicAuthPageLayout from "@/features/auth/components/PublicAuthPageLayout";
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
    <PublicAuthPageLayout
      businessName={business.name}
      businessSlug={businessSlug}
      title={business.name}
      description="Ingresa a tu cuenta"
    >
      <LoginForm />
    </PublicAuthPageLayout>
  );
}
