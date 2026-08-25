import AdminDashboardOverview from "@/features/dashboard/components/AdminDashboardOverview";

type AdminDashboardPageProps = {
  params: Promise<{
    businessSlug:
      string;
  }>;
};

export default async function AdminDashboardPage({
  params,
}: AdminDashboardPageProps) {
  const {
    businessSlug,
  } =
    await params;

  return (
    <AdminDashboardOverview
      businessSlug={
        businessSlug
      }
    />
  );
}
