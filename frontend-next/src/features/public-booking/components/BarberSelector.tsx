import Image, {
  type ImageLoaderProps,
} from "next/image";

import type {
  PublicBarber,
} from "../types/public-booking.types";

type BarberSelectorProps = {
  barbers: PublicBarber[];
  selectedBarberId: number | null;
  onSelect: (
    barberId: number | null,
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

function barberPhotoLoader({
  src,
}: ImageLoaderProps): string {
  return src;
}

export default function BarberSelector({
  barbers,
  selectedBarberId,
  onSelect,
}: BarberSelectorProps) {
  return (
    <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_45px_-36px_rgba(0,0,0,0.45)] sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Paso 2
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Elige tu profesional
          </h2>
        </div>

        {selectedBarberId !== null && (
          <button
            type="button"
            onClick={() =>
              onSelect(null)
            }
            className="shrink-0 text-xs font-semibold text-zinc-500 underline-offset-4 transition hover:text-zinc-950 hover:underline focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            Ver todos
          </button>
        )}
      </div>

      <p className="mb-5 text-sm leading-6 text-zinc-500">
        Selecciona quién te atenderá. El catálogo se ajustará a sus servicios.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
                className={[
                  "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-zinc-300",
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-md"
                    : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50",
                ].join(" ")}
              >
                <div
                  className={[
                    "relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-all",
                    selected
                      ? "border-white/20 bg-white/10"
                      : "border-zinc-200 group-hover:border-zinc-400",
                  ].join(" ")}
                >
                  {barber.photoUrl ? (
                    <Image
                      src={
                        barber.photoUrl
                      }
                      alt={
                        barber.displayName
                      }
                      width={48}
                      height={48}
                      loader={
                        barberPhotoLoader
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className={selected ? "text-sm font-semibold text-white" : "text-sm font-semibold text-zinc-600"}>
                      {getInitials(
                        barber.displayName,
                      )}
                    </span>
                  )}

                </div>

                <span className="min-w-0 flex-1">
                  <span className={selected ? "block truncate text-sm font-semibold text-white" : "block truncate text-sm font-semibold text-zinc-900"}>
                    {barber.displayName}
                  </span>

                  <span className={selected ? "mt-0.5 block truncate text-xs text-zinc-400" : "mt-0.5 block truncate text-xs text-zinc-500"}>
                    {barber.specialty ?? "Profesional"}
                  </span>
                </span>

                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition",
                    selected
                      ? "border-white bg-white text-zinc-950"
                      : "border-zinc-300 text-transparent",
                  ].join(" ")}
                >
                  ✓
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}
