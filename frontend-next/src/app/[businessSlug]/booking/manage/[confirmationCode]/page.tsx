import ManageGuestBookingView from "@/features/public-booking/components/ManageGuestBookingView";

type ManageGuestBookingPageProps = {
  params: Promise<{
    businessSlug: string;
    confirmationCode: string;
  }>;
};

export default async function ManageGuestBookingPage({
  params,
}: ManageGuestBookingPageProps) {
  const { businessSlug, confirmationCode } = await params;

  return (
    <ManageGuestBookingView
      businessSlug={businessSlug}
      confirmationCode={confirmationCode}
    />
  );
}
