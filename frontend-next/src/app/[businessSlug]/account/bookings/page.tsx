import { redirect } from "next/navigation";

type ClientBookingsPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ClientBookingsPage({
  params,
}: ClientBookingsPageProps) {
  await params;

  redirect("/mi-cuenta/reservas");
}
