import type {
  PublicBarber,
  PublicService,
} from "../types/public-booking.types";

type BookingSummaryProps = {
  barber: PublicBarber;
  services: PublicService[];

  totalPrice: number;
  totalDuration: number;
};

function getInitials(
  name: string,
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default function BookingSummary({
  barber,
  services,
  totalPrice,
  totalDuration,
}: BookingSummaryProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
          {barber.photoUrl ? (
            <img
              src={
                barber.photoUrl
              }
              alt={
                barber.displayName
              }
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-zinc-600">
              {getInitials(
                barber.displayName,
              )}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs text-zinc-500">
            Tu reserva
          </p>

          <p className="truncate font-semibold text-zinc-950">
            {
              barber.displayName
            }
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <div className="space-y-2">
          {services.map(
            (service) => (
              <div
                key={
                  service.id
                }
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-zinc-600">
                  {
                    service.name
                  }
                </span>
              </div>
            ),
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs text-zinc-500">
              Duración aproximada
            </p>

            <p className="mt-1 text-sm font-medium text-zinc-800">
              {totalDuration} min
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-zinc-500">
              Total
            </p>

            <p className="mt-1 text-lg font-semibold text-zinc-950">
              {formatPrice(
                totalPrice,
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}