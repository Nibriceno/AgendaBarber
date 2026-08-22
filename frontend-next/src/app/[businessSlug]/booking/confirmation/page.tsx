import {
  redirect,
} from "next/navigation";

import BookingConfirmationView from "@/features/public-booking/components/BookingConfirmationView";

type BookingConfirmationPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;

  searchParams: Promise<{
    code?:
      | string
      | string[];
  }>;
};

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: BookingConfirmationPageProps) {
  const {
    businessSlug,
  } = await params;

  const query =
    await searchParams;

  const confirmationCode =
    Array.isArray(
      query.code,
    )
      ? query.code[0]
      : query.code;

  if (
    !confirmationCode
  ) {
    redirect(
      `/${businessSlug}`,
    );
  }

  return (
    <BookingConfirmationView
      businessSlug={
        businessSlug
      }
      confirmationCode={
        confirmationCode
      }
    />
  );
}