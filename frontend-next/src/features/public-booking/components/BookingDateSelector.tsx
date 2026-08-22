"use client";

type BookingDateSelectorProps = {
  selectedDate: string | null;

  onSelect: (
    date: string,
  ) => void;
};

const DAYS_TO_SHOW = 14;

function toDateString(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDays() {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  return Array.from(
    {
      length: DAYS_TO_SHOW,
    },
    (_, index) => {
      const date =
        new Date(today);

      date.setDate(
        today.getDate() +
          index,
      );

      return {
        value:
          toDateString(date),

        weekDay:
          new Intl.DateTimeFormat(
            "es-CL",
            {
              weekday:
                "short",
            },
          )
            .format(date)
            .replace(".", ""),

        day:
          date.getDate(),

        month:
          new Intl.DateTimeFormat(
            "es-CL",
            {
              month:
                "short",
            },
          )
            .format(date)
            .replace(".", ""),

        isToday:
          index === 0,
      };
    },
  );
}

export default function BookingDateSelector({
  selectedDate,
  onSelect,
}: BookingDateSelectorProps) {
  const days =
    createDays();

  return (
    <section>
      <div className="mb-4">
        <p className="text-sm font-medium text-zinc-500">
          Paso 3
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
          Elige fecha y hora
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Selecciona el día que
          más te acomode.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {days.map(
            (item) => {
              const selected =
                selectedDate ===
                item.value;

              return (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  aria-pressed={
                    selected
                  }
                  onClick={() =>
                    onSelect(
                      item.value,
                    )
                  }
                  className={[
                    "flex h-[86px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border transition",
                    "focus:outline-none focus:ring-2 focus:ring-zinc-300",
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300",
                  ].join(
                    " ",
                  )}
                >
                  <span
                    className={[
                      "text-[11px] font-medium uppercase",
                      selected
                        ? "text-zinc-300"
                        : "text-zinc-500",
                    ].join(
                      " ",
                    )}
                  >
                    {item.isToday
                      ? "Hoy"
                      : item.weekDay}
                  </span>

                  <span className="mt-1 text-xl font-semibold">
                    {
                      item.day
                    }
                  </span>

                  <span
                    className={[
                      "mt-0.5 text-[11px] capitalize",
                      selected
                        ? "text-zinc-300"
                        : "text-zinc-400",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      item.month
                    }
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}