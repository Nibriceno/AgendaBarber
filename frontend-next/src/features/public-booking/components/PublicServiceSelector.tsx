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
  if (!barber) {
    return (
      <section>
        <p className="text-sm font-medium text-zinc-400">
          Paso 2
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-400">
          Elige tus servicios
        </h2>

        <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
          <p className="text-sm text-zinc-500">
            Primero selecciona un
            barbero.
          </p>
        </div>
      </section>
    );
  }

  const assignments =
    new Map(
      barber.services.map(
        (item) => [
          item.serviceId,
          item,
        ],
      ),
    );

  const availableServices =
    services.filter((service) =>
      assignments.has(service.id),
    );

  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-medium text-zinc-500">
          Paso 2
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
          Elige tus servicios
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Servicios disponibles con{" "}
          <span className="font-medium text-zinc-700">
            {barber.displayName}
          </span>
        </p>
      </div>

      {availableServices.length ===
      0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
          <p className="text-sm text-zinc-500">
            Este barbero todavía no
            tiene servicios
            disponibles.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableServices.map(
            (service) => {
              const assignment =
                assignments.get(
                  service.id,
                );

              if (!assignment) {
                return null;
              }

              const selected =
                selectedServiceIds.includes(
                  service.id,
                );

              const effectivePrice =
                assignment.customPrice ??
                service.price;

              const effectiveDuration =
                assignment.customDurationMinutes ??
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
                    "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-zinc-300",
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">
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

                    <p
                      className={[
                        "mt-1 text-sm",
                        selected
                          ? "text-zinc-300"
                          : "text-zinc-500",
                      ].join(
                        " ",
                      )}
                    >
                      {formatDuration(
                        effectiveDuration,
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
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
                      {formatPrice(
                        effectivePrice,
                      )}
                    </p>

                    <div
                      className={[
                        "ml-auto mt-2 flex h-6 w-6 items-center justify-center rounded-full border",
                        selected
                          ? "border-white bg-white text-zinc-950"
                          : "border-zinc-300 text-transparent",
                      ].join(
                        " ",
                      )}
                    >
                      ✓
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