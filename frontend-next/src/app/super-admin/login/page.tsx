import type { Metadata } from "next";

import { PLATFORM_BRAND_NAME } from "@/config/site";
import PlatformLoginForm from "@/features/platform-auth/components/PlatformLoginForm";

export const metadata: Metadata = {
  title: `Super Admin | ${PLATFORM_BRAND_NAME}`,
  description: `Acceso interno a la administración global de ${PLATFORM_BRAND_NAME}.`,
};

export default function SuperAdminLoginPage() {
  return <PlatformLoginForm />;
}
