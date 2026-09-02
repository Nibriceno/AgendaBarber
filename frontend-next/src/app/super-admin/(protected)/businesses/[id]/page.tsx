import PlatformBusinessDetailView from "@/features/platform-businesses/components/PlatformBusinessDetailView";

export default async function PlatformBusinessDetailPage({ params, searchParams }: PageProps<"/super-admin/businesses/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const businessId = Number(id);
  const createdState = query.created === "sent" || query.created === "pending" ? query.created : undefined;

  return <PlatformBusinessDetailView businessId={businessId} createdState={createdState} />;
}
