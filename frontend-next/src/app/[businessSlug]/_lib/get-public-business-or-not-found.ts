import {
  notFound,
} from "next/navigation";

import {
  getPublicBusiness,
} from "@/features/public-booking/api/public-booking.api";

export async function getPublicBusinessOrNotFound(
  businessSlug: string,
) {
  try {
    return await getPublicBusiness(
      businessSlug,
    );
  } catch {
    notFound();
  }
}
