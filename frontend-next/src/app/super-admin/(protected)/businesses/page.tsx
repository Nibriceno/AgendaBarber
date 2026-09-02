import PlatformBusinessesView from "@/features/platform-businesses/components/PlatformBusinessesView";

export default async function PlatformBusinessesPage({ searchParams }: PageProps<"/super-admin/businesses">) {
  const query = await searchParams;
  return <PlatformBusinessesView initialCreate={query.create === "1"} />;
}
