import type { Metadata } from "next";

import { PLATFORM_BRAND_NAME } from "@/config/site";
import AcceptBusinessInvitationView from "@/features/business-invitations/components/AcceptBusinessInvitationView";

export const metadata: Metadata = {
  title: `Activar cuenta | ${PLATFORM_BRAND_NAME}`,
  description: "Configura tu acceso de administrador del negocio.",
};

export default async function AcceptInvitationPage({ params, searchParams }: PageProps<"/[businessSlug]/aceptar-invitacion">) {
  const { businessSlug } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  return <AcceptBusinessInvitationView businessSlug={businessSlug} token={token} />;
}
