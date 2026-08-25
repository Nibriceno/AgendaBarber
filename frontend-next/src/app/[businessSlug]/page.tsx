import {
  notFound,
} from "next/navigation";

import {
  getPublicBarbers,
  getPublicBusiness,
  getPublicServices,
} from "@/features/public-booking/api/public-booking.api";

import PublicBookingHome from "@/features/public-booking/components/PublicBookingHome";

type PublicBusinessPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

async function getPublicBusinessPageData(
  businessSlug: string,
) {
  try {
    return await Promise.all([
      getPublicBusiness(
        businessSlug,
      ),
      getPublicBarbers(
        businessSlug,
      ),
      getPublicServices(
        businessSlug,
      ),
    ]);
  } catch {
    notFound();
  }
}

export default async function PublicBusinessPage({
  params,
}: PublicBusinessPageProps) {
  const {
    businessSlug,
  } = await params;

  const [
    business,
    barbers,
    services,
  ] = await getPublicBusinessPageData(
    businessSlug,
  );

  return (
    <PublicBookingHome
      business={
        business
      }
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
}
