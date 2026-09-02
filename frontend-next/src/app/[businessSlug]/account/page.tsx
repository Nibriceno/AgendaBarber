import { redirect } from "next/navigation";

type ClientAccountPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ClientAccountPage({
  params,
}: ClientAccountPageProps) {
  await params;

  redirect("/mi-cuenta/reservas");
}
