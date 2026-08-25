import ClientBookingsView from "@/features/client-account/components/ClientBookingsView";

type ClientBookingsPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ClientBookingsPage({
  params,
}: ClientBookingsPageProps) {
  const { businessSlug } = await params;

  return <ClientBookingsView businessSlug={businessSlug} />;
}
