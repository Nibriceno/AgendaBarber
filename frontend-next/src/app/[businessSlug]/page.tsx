import {
  notFound,
} from "next/navigation";

import {
  getPublicBarbers,
  getPublicServices,
} from "@/features/public-booking/api/public-booking.api";

import PublicBookingHome from "@/features/public-booking/components/PublicBookingHome";

type PublicBusinessPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function PublicBusinessPage({
  params,
}: PublicBusinessPageProps) {
  const {
    businessSlug,
  } = await params;

  try {
    const [
      barbers,
      services,
    ] = await Promise.all([
      getPublicBarbers(
        businessSlug,
      ),
      getPublicServices(
        businessSlug,
      ),
    ]);

    return (
      <PublicBookingHome
        businessSlug={
          businessSlug
        }
        barbers={
          barbers
        }
        services={
          services
        }
      />
    );
  } catch {
    notFound();
  }
}