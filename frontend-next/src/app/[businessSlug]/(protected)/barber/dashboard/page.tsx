import BarberDashboardView from "@/features/barber-dashboard/components/BarberDashboardView";

type BarberDashboardPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function BarberDashboardPage({
  params,
}: BarberDashboardPageProps) {
  const {
    businessSlug,
  } = await params;

  return (
    <BarberDashboardView
      businessSlug={businessSlug}
    />
  );
}
