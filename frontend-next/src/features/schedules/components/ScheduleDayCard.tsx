import {
  DAY_LABELS,
} from "../types/schedule.types";

import type {
  DayOfWeek,
  ScheduleRangeDraft,
} from "../types/schedule.types";

type ScheduleDayCardProps = {
  dayOfWeek: DayOfWeek;

  enabled: boolean;

  ranges: ScheduleRangeDraft[];

  onToggle: (
    enabled: boolean,
  ) => void;

  onAddRange: () => void;

  onRemoveRange: (
    key: string,
  ) => void;

  onChangeRange: (
    key: string,
    field:
      | "startTime"
      | "endTime",
    value: string,
  ) => void;
};

export default function ScheduleDayCard({
  dayOfWeek,
  enabled,
  ranges,
  onToggle,
  onAddRange,
  onRemoveRange,
  onChangeRange,
}: ScheduleDayCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-950">
            {
              DAY_LABELS[
                dayOfWeek
              ]
            }
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            {enabled
              ? "Día laboral"
              : "No trabaja"}
          </p>
        </div>

        <button
          type="button"
          aria-pressed={
            enabled
          }
          onClick={() =>
            onToggle(
              !enabled,
            )
          }
          className={[
            "relative h-7 w-12 shrink-0 rounded-full transition",
            "focus:outline-none focus:ring-2 focus:ring-zinc-300",
            enabled
              ? "bg-zinc-950"
              : "bg-zinc-200",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
              enabled
                ? "left-6"
                : "left-1",
            ].join(" ")}
          />
        </button>
      </header>

      {enabled && (
        <div className="mt-5 space-y-3">
          {ranges.map(
            (
              range,
              index,
            ) => (
              <div
                key={
                  range.key
                }
                className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">
                    {ranges.length >
                    1
                      ? `Bloque ${
                          index +
                          1
                        }`
                      : "Horario"}
                  </span>

                  {ranges.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onRemoveRange(
                          range.key,
                        )
                      }
                      className="text-xs font-medium text-red-600 transition hover:text-red-700"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1.5 block text-xs text-zinc-500">
                      Desde
                    </span>

                    <input
                      type="time"
                      value={
                        range.startTime
                      }
                      onChange={(
                        event,
                      ) =>
                        onChangeRange(
                          range.key,
                          "startTime",
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base font-medium text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs text-zinc-500">
                      Hasta
                    </span>

                    <input
                      type="time"
                      value={
                        range.endTime
                      }
                      onChange={(
                        event,
                      ) =>
                        onChangeRange(
                          range.key,
                          "endTime",
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base font-medium text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                    />
                  </label>
                </div>
              </div>
            ),
          )}

          <button
            type="button"
            onClick={
              onAddRange
            }
            className="flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950"
          >
            + Agregar otro bloque
          </button>
        </div>
      )}
    </article>
  );
}