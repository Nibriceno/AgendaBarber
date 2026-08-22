"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createSchedule,
  deactivateSchedule,
  getBarberSchedules,
  updateSchedule,
} from "../api/schedules.api";

import {
  DAY_ORDER,
} from "../types/schedule.types";

import type {
  DayOfWeek,
  Schedule,
  ScheduleDayDraft,
  ScheduleRangeDraft,
} from "../types/schedule.types";

import {
  minutesToTime,
  timeToMinutes,
} from "../lib/schedule-time";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

import ScheduleDayCard from "./ScheduleDayCard";

type WeeklyScheduleEditorProps = {
  barberId: number;
};

function createKey() {
  if (
    typeof crypto !==
      "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function createDefaultRange(): ScheduleRangeDraft {
  return {
    key: createKey(),
    scheduleId: null,
    startTime: "09:00",
    endTime: "18:00",
  };
}

function buildDraft(
  schedules: Schedule[],
): ScheduleDayDraft[] {
  return DAY_ORDER.map(
    (dayOfWeek) => {
      const daySchedules =
        schedules
          .filter(
            (schedule) =>
              schedule.dayOfWeek ===
              dayOfWeek,
          )
          .sort(
            (a, b) =>
              a.startMinute -
              b.startMinute,
          );

      return {
        dayOfWeek,

        enabled:
          daySchedules.length >
          0,

        ranges:
          daySchedules.map(
            (schedule) => ({
              key: `schedule-${schedule.id}`,

              scheduleId:
                schedule.id,

              startTime:
                minutesToTime(
                  schedule.startMinute,
                ),

              endTime:
                minutesToTime(
                  schedule.endMinute,
                ),
            }),
          ),
      };
    },
  );
}

function validateDraft(
  draft: ScheduleDayDraft[],
): string | null {
  for (const day of draft) {
    if (!day.enabled) {
      continue;
    }

    if (
      day.ranges.length ===
      0
    ) {
      return "Cada día activo debe tener al menos un bloque horario.";
    }

    const parsedRanges: {
      start: number;
      end: number;
    }[] = [];

    for (
      const range of
      day.ranges
    ) {
      const start =
        timeToMinutes(
          range.startTime,
        );

      const end =
        timeToMinutes(
          range.endTime,
        );

      if (
        start === null ||
        end === null
      ) {
        return "Hay una hora inválida.";
      }

      if (
        start >= end
      ) {
        return "La hora de término debe ser posterior a la hora de inicio.";
      }

      parsedRanges.push({
        start,
        end,
      });
    }

    parsedRanges.sort(
      (a, b) =>
        a.start -
        b.start,
    );

    for (
      let index = 1;
      index <
      parsedRanges.length;
      index += 1
    ) {
      const previous =
        parsedRanges[
          index - 1
        ];

      const current =
        parsedRanges[
          index
        ];

      if (
        previous.end >
        current.start
      ) {
        return "Hay bloques horarios que se superponen.";
      }
    }
  }

  return null;
}

export default function WeeklyScheduleEditor({
  barberId,
}: WeeklyScheduleEditorProps) {
  const [
    originalSchedules,
    setOriginalSchedules,
  ] = useState<Schedule[]>(
    [],
  );

  const [
    draft,
    setDraft,
  ] =
    useState<
      ScheduleDayDraft[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null,
    );

  const loadSchedules =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const schedules =
            await getBarberSchedules(
              barberId,
            );

          setOriginalSchedules(
            schedules,
          );

          setDraft(
            buildDraft(
              schedules,
            ),
          );
        } catch (error) {
          setError(
            getApiErrorMessage(
              error,
              "No fue posible cargar los horarios.",
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [barberId],
    );

  useEffect(() => {
    setSuccessMessage(
      null,
    );

    void loadSchedules();
  }, [
    loadSchedules,
  ]);

  const updateDay = (
    dayOfWeek: DayOfWeek,
    updater: (
      day: ScheduleDayDraft,
    ) => ScheduleDayDraft,
  ) => {
    setDraft(
      (current) =>
        current.map(
          (day) =>
            day.dayOfWeek ===
            dayOfWeek
              ? updater(
                  day,
                )
              : day,
        ),
    );

    setSuccessMessage(
      null,
    );
  };

  const handleToggleDay = (
    dayOfWeek: DayOfWeek,
    enabled: boolean,
  ) => {
    updateDay(
      dayOfWeek,
      (day) => ({
        ...day,
        enabled,

        ranges:
          enabled &&
          day.ranges
            .length === 0
            ? [
                createDefaultRange(),
              ]
            : day.ranges,
      }),
    );
  };

  const handleAddRange = (
    dayOfWeek: DayOfWeek,
  ) => {
    updateDay(
      dayOfWeek,
      (day) => ({
        ...day,

        ranges: [
          ...day.ranges,
          createDefaultRange(),
        ],
      }),
    );
  };

  const handleRemoveRange = (
    dayOfWeek: DayOfWeek,
    key: string,
  ) => {
    updateDay(
      dayOfWeek,
      (day) => ({
        ...day,

        ranges:
          day.ranges.filter(
            (range) =>
              range.key !==
              key,
          ),
      }),
    );
  };

  const handleChangeRange = (
    dayOfWeek: DayOfWeek,
    key: string,
    field:
      | "startTime"
      | "endTime",
    value: string,
  ) => {
    updateDay(
      dayOfWeek,
      (day) => ({
        ...day,

        ranges:
          day.ranges.map(
            (range) =>
              range.key ===
              key
                ? {
                    ...range,
                    [field]:
                      value,
                  }
                : range,
          ),
      }),
    );
  };

  const copyMondayToWeekdays =
    () => {
      const monday =
        draft.find(
          (day) =>
            day.dayOfWeek ===
            "MONDAY",
        );

      if (
        !monday ||
        !monday.enabled ||
        monday.ranges.length ===
          0
      ) {
        setError(
          "Configura primero el horario del lunes.",
        );

        return;
      }

      const weekdays =
        new Set<DayOfWeek>([
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
        ]);

      setDraft(
        (current) =>
          current.map(
            (day) => {
              if (
                !weekdays.has(
                  day.dayOfWeek,
                )
              ) {
                return day;
              }

              return {
                ...day,

                enabled: true,

                ranges:
                  monday.ranges.map(
                    (
                      range,
                    ) => ({
                      key:
                        createKey(),

                      scheduleId:
                        null,

                      startTime:
                        range.startTime,

                      endTime:
                        range.endTime,
                    }),
                  ),
              };
            },
          ),
      );

      setError(null);
      setSuccessMessage(
        null,
      );
    };

  const handleSave =
    async () => {
      if (saving) {
        return;
      }

      const validationError =
        validateDraft(
          draft,
        );

      if (
        validationError
      ) {
        setError(
          validationError,
        );

        return;
      }

      setSaving(true);
      setError(null);
      setSuccessMessage(
        null,
      );

      try {
        const activeRanges =
          draft.flatMap(
            (day) =>
              day.enabled
                ? day.ranges.map(
                    (
                      range,
                    ) => ({
                      dayOfWeek:
                        day.dayOfWeek,

                      range,
                    }),
                  )
                : [],
          );

        const activeScheduleIds =
          new Set(
            activeRanges
              .map(
                ({
                  range,
                }) =>
                  range.scheduleId,
              )
              .filter(
                (
                  id,
                ): id is number =>
                  id !== null,
              ),
          );

        /*
         * Primero desactivamos horarios
         * eliminados para reducir posibles
         * conflictos al modificar rangos.
         */
        for (const schedule of originalSchedules) {
          if (
            !activeScheduleIds.has(
              schedule.id,
            )
          ) {
            await deactivateSchedule(
              schedule.id,
            );
          }
        }

        /*
         * Después actualizamos los
         * horarios existentes.
         */
        for (const {
          dayOfWeek,
          range,
        } of activeRanges) {
          if (
            range.scheduleId ===
            null
          ) {
            continue;
          }

          const startMinute =
            timeToMinutes(
              range.startTime,
            );

          const endMinute =
            timeToMinutes(
              range.endTime,
            );

          if (
            startMinute ===
              null ||
            endMinute === null
          ) {
            continue;
          }

          const original =
            originalSchedules.find(
              (schedule) =>
                schedule.id ===
                range.scheduleId,
            );

          if (!original) {
            continue;
          }

          if (
            original.startMinute !==
              startMinute ||
            original.endMinute !==
              endMinute ||
            original.dayOfWeek !==
              dayOfWeek
          ) {
            await updateSchedule(
              original.id,
              {
                dayOfWeek,
                startMinute,
                endMinute,
              },
            );
          }
        }

        /*
         * Finalmente creamos los
         * bloques nuevos.
         */
        for (const {
          dayOfWeek,
          range,
        } of activeRanges) {
          if (
            range.scheduleId !==
            null
          ) {
            continue;
          }

          const startMinute =
            timeToMinutes(
              range.startTime,
            );

          const endMinute =
            timeToMinutes(
              range.endTime,
            );

          if (
            startMinute ===
              null ||
            endMinute === null
          ) {
            continue;
          }

          await createSchedule({
            barberId,
            dayOfWeek,
            startMinute,
            endMinute,
            isActive: true,
          });
        }

        await loadSchedules();

        setSuccessMessage(
          "Horario guardado correctamente.",
        );
      } catch (error) {
        setError(
          getApiErrorMessage(
            error,
            "No fue posible guardar el horario.",
          ),
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

          <p className="mt-3 text-sm text-zinc-500">
            Cargando horarios...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            Horario semanal
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Define cuándo puede recibir reservas este profesional.
          </p>
        </div>

        <button
          type="button"
          onClick={
            copyMondayToWeekdays
          }
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Aplicar lunes a mar–vie
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {
            successMessage
          }
        </div>
      )}

      <div className="space-y-3">
        {draft.map(
          (day) => (
            <ScheduleDayCard
              key={
                day.dayOfWeek
              }
              dayOfWeek={
                day.dayOfWeek
              }
              enabled={
                day.enabled
              }
              ranges={
                day.ranges
              }
              onToggle={(
                enabled,
              ) =>
                handleToggleDay(
                  day.dayOfWeek,
                  enabled,
                )
              }
              onAddRange={() =>
                handleAddRange(
                  day.dayOfWeek,
                )
              }
              onRemoveRange={(
                key,
              ) =>
                handleRemoveRange(
                  day.dayOfWeek,
                  key,
                )
              }
              onChangeRange={(
                key,
                field,
                value,
              ) =>
                handleChangeRange(
                  day.dayOfWeek,
                  key,
                  field,
                  value,
                )
              }
            />
          ),
        )}
      </div>

      <div className="sticky bottom-4 mt-6">
        <button
          type="button"
          disabled={
            saving
          }
          onClick={
            handleSave
          }
          className="flex min-h-13 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {saving
            ? "Guardando..."
            : "Guardar horario"}
        </button>
      </div>
    </div>
  );
}