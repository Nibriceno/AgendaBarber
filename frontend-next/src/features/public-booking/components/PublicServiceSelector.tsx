import type {
  PublicBarber,
  PublicService,
} from "../types/public-booking.types";

type PublicServiceSelectorProps = {
  barber: PublicBarber | null;

  services: PublicService[];

  selectedServiceIds: number[];

  onToggle: (
    serviceId: number,
  ) => void;
};

function formatPrice(
  price: string | number,
): string {
  const value =
    Number(price);

  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatDuration(
  minutes: number,
): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remaining =
    minutes % 60;

  return remaining === 0
    ? `${hours} h`
    : `${hours} h ${remaining} min`;
}

export default function PublicServiceSelector({
  barber,
  services,
  selectedServiceIds,
  onToggle,
}: PublicServiceSelectorProps) {
  const assignments =
    new Map(
      (barber?.services ?? []).map(
        (item) => [
          item.serviceId,
          item,
        ],
      ),
    );

  const availableServices =
    barber
      ? services.filter((service) =>
          assignments.has(service.id),
        )
      : services;

  return (
    <section
      id="servicios"
      className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_45px_-36px_rgba(0,0,0,0.45)] sm:p-6 lg:p-7"
    >
      <div className="mb-6 sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Paso 1
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Elige tus servicios
          </h2>
        </div>

        <p className="mt-2 text-sm text-zinc-500 sm:mt-0 sm:text-right">
          {barber ? (
            <>
              Disponibles con{" "}
              <span className="font-semibold text-zinc-800">
                {barber.displayName}
              </span>
            </>
          ) : (
            "Explora el catálogo completo"
          )}
        </p>
      </div>

      {availableServices.length ===
      0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
          <p className="text-sm text-zinc-500">
            {barber
              ? "Este profesional todavía no tiene servicios disponibles."
              : "Todavía no hay servicios disponibles."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {availableServices.map(
            (service) => {
              const assignment =
                assignments.get(
                  service.id,
                );

              const selected =
                selectedServiceIds.includes(
                  service.id,
                );

              const effectivePrice =
                assignment?.customPrice ??
                service.price;

              const effectiveDuration =
                assignment?.customDurationMinutes ??
                service.durationMinutes;

              return (
                <button
                  key={
                    service.id
                  }
                  type="button"
                  onClick={() =>
                    onToggle(
                      service.id,
                    )
                  }
                  aria-pressed={
                    selected
                  }
                  className={[
                    "group flex min-h-[132px] w-full flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-zinc-300",
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-md"
                      : "border-zinc-200 bg-zinc-50/60 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-white hover:shadow-md",
                  ].join(" ")}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <span className={selected ? "flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white" : "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-bold text-zinc-700 shadow-sm ring-1 ring-zinc-200"}>
                      {service.name.charAt(0).toUpperCase()}
                    </span>

                    <span
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-full border text-xs transition",
                        selected
                          ? "border-white bg-white text-zinc-950"
                          : "border-zinc-300 bg-white text-transparent group-hover:border-zinc-500",
                      ].join(" ")}
                    >
                      ✓
                    </span>
                  </div>

                  <div className="mt-4 w-full min-w-0">
                    <p
                      className={[
                        "font-semibold",
                        selected
                          ? "text-white"
                          : "text-zinc-950",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        service.name
                      }
                    </p>

                    {service.description && (
                      <p className={selected ? "mt-1 line-clamp-1 text-xs text-zinc-400" : "mt-1 line-clamp-1 text-xs text-zinc-500"}>
                        {service.description}
                      </p>
                    )}

                    <div
                      className={[
                        "mt-3 flex items-center justify-between gap-3 text-sm",
                        selected
                          ? "text-zinc-300"
                          : "text-zinc-500",
                      ].join(
                        " ",
                      )}
                    >
                      <span>
                        {formatDuration(
                          effectiveDuration,
                        )}
                      </span>

                      <span className={selected ? "font-semibold text-white" : "font-semibold text-zinc-950"}>
                        {formatPrice(
                          effectivePrice,
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}
