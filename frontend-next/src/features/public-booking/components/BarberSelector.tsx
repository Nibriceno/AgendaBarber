import type {
  PublicBarber,
} from "../types/public-booking.types";

type BarberSelectorProps = {
  barbers: PublicBarber[];
  selectedBarberId: number | null;
  onSelect: (
    barberId: number,
  ) => void;
};

function getInitials(
  name: string,
): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

export default function BarberSelector({
  barbers,
  selectedBarberId,
  onSelect,
}: BarberSelectorProps) {
  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-medium text-zinc-500">
          Paso 1
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
          Elige tu barbero
        </h2>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-5 sm:min-w-0 sm:flex-wrap">
          {barbers.map((barber) => {
            const selected =
              selectedBarberId ===
              barber.id;

            return (
              <button
                key={barber.id}
                type="button"
                onClick={() =>
                  onSelect(
                    barber.id,
                  )
                }
                aria-pressed={
                  selected
                }
                className="group flex w-[92px] shrink-0 flex-col items-center text-center focus:outline-none"
              >
                <div
                  className={[
                    "relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 transition-all sm:h-24 sm:w-24",
                    selected
                      ? "border-zinc-950 ring-4 ring-zinc-950/10"
                      : "border-zinc-200 group-hover:border-zinc-400",
                  ].join(" ")}
                >
                  {barber.photoUrl ? (
                    <img
                      src={
                        barber.photoUrl
                      }
                      alt={
                        barber.displayName
                      }
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-zinc-600">
                      {getInitials(
                        barber.displayName,
                      )}
                    </span>
                  )}

                  {selected && (
                    <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-zinc-950 text-xs text-white">
                      ✓
                    </span>
                  )}
                </div>

                <span
                  className={[
                    "mt-2 line-clamp-2 text-sm leading-5",
                    selected
                      ? "font-semibold text-zinc-950"
                      : "font-medium text-zinc-700",
                  ].join(" ")}
                >
                  {
                    barber.displayName
                  }
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}