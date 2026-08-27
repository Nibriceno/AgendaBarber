import AdminAgendaView from "@/features/admin-agenda/components/AdminAgendaView";

type AppointmentsPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  const { businessSlug } = await params;

  return <AdminAgendaView businessSlug={businessSlug} />;
}
