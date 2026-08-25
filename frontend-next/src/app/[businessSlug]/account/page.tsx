import { redirect } from "next/navigation";

type ClientAccountPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function ClientAccountPage({
  params,
}: ClientAccountPageProps) {
  const { businessSlug } = await params;

  redirect(`/${businessSlug}/account/bookings`);
}
