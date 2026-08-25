import type {
  PublicBusiness,
} from "../types/public-booking.types";

type BusinessLocationProps = {
  business: PublicBusiness;
};

export default function BusinessLocation({
  business,
}: BusinessLocationProps) {
  if (!business.address) {
    return null;
  }

  const encodedAddress =
    encodeURIComponent(
      business.address,
    );

  const embedUrl =
    `https://www.google.com/maps?q=${encodedAddress}&z=16&output=embed`;

  const directionsUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  return (
    <div
      id="ubicacion"
      className="flex min-h-[400px] scroll-mt-20 flex-col bg-white lg:min-h-[500px]"
    >
      <div className="p-5 sm:flex sm:items-center sm:gap-4 sm:p-6 lg:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            >
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-zinc-950 sm:text-base">
              Nuestra ubicación
            </p>
          </div>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 sm:mt-0 sm:w-auto"
        >
          Cómo llegar
          <span aria-hidden="true">
            ↗
          </span>
        </a>
      </div>

      <div className="relative min-h-[260px] flex-1 border-t border-zinc-200 bg-zinc-100 lg:min-h-0">
        <iframe
          title={`Mapa de ${business.name}`}
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0 grayscale-[0.15]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
