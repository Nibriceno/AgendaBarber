import {
  addDaysToDateKey,
  formatDateKey,
  getDateKeyInTimezone,
} from "../lib/barber-dashboard";

type BarberDayNavigatorProps = {
  selectedDate: string;
  generatedAt: string;
  timezone: string;
  loading: boolean;
  onSelectDate: (
    date: string,
  ) => void;
};

export default function BarberDayNavigator({
  selectedDate,
  generatedAt,
  timezone,
  loading,
  onSelectDate,
}: BarberDayNavigatorProps) {
  const today =
    getDateKeyInTimezone(
      generatedAt,
      timezone,
    );

  const visibleDays =
    [-2, -1, 0, 1, 2].map(
      (offset) =>
        addDaysToDateKey(
          selectedDate,
          offset,
        ),
    );

  return (
    <section
      aria-label="Seleccionar día de agenda"
      className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Día anterior"
          disabled={loading}
          onClick={() =>
            onSelectDate(
              addDaysToDateKey(
                selectedDate,
                -1,
              ),
            )
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-xl text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
        >
          ←
        </button>

        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold capitalize text-zinc-950 sm:text-base">
            {formatDateKey(
              selectedDate,
              {
                weekday:
                  "long",
                day: "numeric",
                month: "long",
              },
            )}
          </p>

          <button
            type="button"
            disabled={
              loading ||
              selectedDate ===
                today
            }
            onClick={() =>
              onSelectDate(
                today,
              )
            }
            className="mt-0.5 text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline disabled:no-underline disabled:opacity-45"
          >
            {selectedDate ===
            today
              ? "Hoy"
              : "Volver a hoy"}
          </button>
        </div>

        <button
          type="button"
          aria-label="Día siguiente"
          disabled={loading}
          onClick={() =>
            onSelectDate(
              addDaysToDateKey(
                selectedDate,
                1,
              ),
            )
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-xl text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
        {visibleDays.map(
          (date) => {
            const selected =
              date ===
              selectedDate;

            return (
              <button
                key={date}
                type="button"
                disabled={loading}
                aria-pressed={selected}
                onClick={() =>
                  onSelectDate(
                    date,
                  )
                }
                className={`rounded-2xl px-1 py-3 text-center transition sm:px-3 ${
                  selected
                    ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/15"
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] opacity-65 sm:text-xs">
                  {formatDateKey(
                    date,
                    {
                      weekday:
                        "short",
                    },
                  ).replace(
                    ".",
                    "",
                  )}
                </span>

                <span className="mt-1 block text-lg font-semibold tabular-nums">
                  {formatDateKey(
                    date,
                    {
                      day: "numeric",
                    },
                  )}
                </span>

                <span className="mt-0.5 hidden text-[10px] capitalize opacity-60 sm:block">
                  {date === today
                    ? "hoy"
                    : formatDateKey(
                        date,
                        {
                          month:
                            "short",
                        },
                      ).replace(
                        ".",
                        "",
                      )}
                </span>
              </button>
            );
          },
        )}
      </div>

      <label className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs font-medium text-zinc-500 sm:hidden">
        Ir a una fecha

        <input
          type="date"
          value={selectedDate}
          disabled={loading}
          onChange={(event) =>
            onSelectDate(
              event.target.value,
            )
          }
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-500"
        />
      </label>
    </section>
  );
}
