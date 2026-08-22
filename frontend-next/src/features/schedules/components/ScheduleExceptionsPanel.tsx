"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createScheduleException,
  deleteScheduleException,
  getBarberScheduleExceptions,
  updateScheduleException,
} from "../api/schedule-exceptions.api";

import type {
  ScheduleException,
} from "../types/schedule-exception.types";

import {
  minutesToTime,
  timeToMinutes,
} from "../lib/schedule-time";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

type ScheduleExceptionsPanelProps = {
  barberId: number;
};

type ExceptionType =
  | "DAY_OFF"
  | "SPECIAL_HOURS";

type FormState = {
  date: string;

  type: ExceptionType;

  startTime: string;
  endTime: string;

  reason: string;
};

const INITIAL_FORM: FormState = {
  date: "",
  type: "DAY_OFF",
  startTime: "09:00",
  endTime: "14:00",
  reason: "",
};

function getDateOnly(
  value: string,
): string {
  return value.slice(
    0,
    10,
  );
}

function formatDate(
  value: string,
): string {
  const date =
    getDateOnly(
      value,
    );

  return new Intl.DateTimeFormat(
    "es-CL",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(
      `${date}T12:00:00`,
    ),
  );
}

export default function ScheduleExceptionsPanel({
  barberId,
}: ScheduleExceptionsPanelProps) {
  const [
    exceptions,
    setExceptions,
  ] =
    useState<
      ScheduleException[]
    >([]);

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      INITIAL_FORM,
    );

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] =
    useState<number | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<number | null>(
      null,
    );

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

  const loadExceptions =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const result =
            await getBarberScheduleExceptions(
              barberId,
            );

          setExceptions(
            result,
          );
        } catch (error) {
          setError(
            getApiErrorMessage(
              error,
              "No fue posible cargar las excepciones.",
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
    setFormOpen(
      false,
    );

    setEditingId(
      null,
    );

    setForm(
      INITIAL_FORM,
    );

    setSuccessMessage(
      null,
    );

    void loadExceptions();
  }, [
    loadExceptions,
  ]);

  const handleCreate =
    () => {
      setForm(
        INITIAL_FORM,
      );

      setEditingId(
        null,
      );

      setError(
        null,
      );

      setSuccessMessage(
        null,
      );

      setFormOpen(
        true,
      );
    };

  const handleEdit = (
    exception:
      ScheduleException,
  ) => {
    setEditingId(
      exception.id,
    );

    setForm({
      date:
        getDateOnly(
          exception.date,
        ),

      type:
        exception.isDayOff
          ? "DAY_OFF"
          : "SPECIAL_HOURS",

      startTime:
        exception.startMinute !==
        null
          ? minutesToTime(
              exception.startMinute,
            )
          : "09:00",

      endTime:
        exception.endMinute !==
        null
          ? minutesToTime(
              exception.endMinute,
            )
          : "14:00",

      reason:
        exception.reason ??
        "",
    });

    setError(
      null,
    );

    setSuccessMessage(
      null,
    );

    setFormOpen(
      true,
    );
  };

  const handleCancelForm =
    () => {
      setFormOpen(
        false,
      );

      setEditingId(
        null,
      );

      setForm(
        INITIAL_FORM,
      );

      setError(
        null,
      );
    };

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (saving) {
        return;
      }

      if (!form.date) {
        setError(
          "Selecciona una fecha.",
        );

        return;
      }

      if (
        form.reason.length >
        300
      ) {
        setError(
          "El motivo no puede superar los 300 caracteres.",
        );

        return;
      }

      const isDayOff =
        form.type ===
        "DAY_OFF";

      let startMinute:
        | number
        | undefined;

      let endMinute:
        | number
        | undefined;

      if (!isDayOff) {
        const start =
          timeToMinutes(
            form.startTime,
          );

        const end =
          timeToMinutes(
            form.endTime,
          );

        if (
          start === null ||
          end === null
        ) {
          setError(
            "Ingresa un horario válido.",
          );

          return;
        }

        if (
          start >= end
        ) {
          setError(
            "La hora de término debe ser posterior a la hora de inicio.",
          );

          return;
        }

        startMinute =
          start;

        endMinute =
          end;
      }

      setSaving(
        true,
      );

      setError(
        null,
      );

      setSuccessMessage(
        null,
      );

      try {
        const payload = {
          barberId,

          date:
            form.date,

          isDayOff,

          ...(!isDayOff && {
            startMinute,
            endMinute,
          }),

          ...(form.reason.trim() && {
            reason:
              form.reason.trim(),
          }),
        };

        if (
          editingId !==
          null
        ) {
          await updateScheduleException(
            editingId,
            payload,
          );
        } else {
          await createScheduleException(
            payload,
          );
        }

        await loadExceptions();

        setFormOpen(
          false,
        );

        setEditingId(
          null,
        );

        setForm(
          INITIAL_FORM,
        );

        setSuccessMessage(
          editingId !==
          null
            ? "Excepción actualizada correctamente."
            : "Excepción agregada correctamente.",
        );
      } catch (error) {
        setError(
          getApiErrorMessage(
            error,
            "No fue posible guardar la excepción.",
          ),
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  const handleDelete =
    async (
      exception:
        ScheduleException,
    ) => {
      const confirmed =
        window.confirm(
          "¿Eliminar esta excepción? El barbero volverá a usar su horario semanal normal para esa fecha.",
        );

      if (!confirmed) {
        return;
      }

      setDeletingId(
        exception.id,
      );

      setError(
        null,
      );

      setSuccessMessage(
        null,
      );

      try {
        await deleteScheduleException(
          exception.id,
        );

        await loadExceptions();

        setSuccessMessage(
          "Excepción eliminada. Se volverá a usar el horario semanal.",
        );
      } catch (error) {
        setError(
          getApiErrorMessage(
            error,
            "No fue posible eliminar la excepción.",
          ),
        );
      } finally {
        setDeletingId(
          null,
        );
      }
    };

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            Excepciones de horario
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Configura días libres,
            feriados, vacaciones o
            jornadas especiales.
          </p>
        </div>

        {!formOpen && (
          <button
            type="button"
            onClick={
              handleCreate
            }
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            + Agregar excepción
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-zinc-950">
                {editingId !==
                null
                  ? "Editar excepción"
                  : "Nueva excepción"}
              </h3>

              <p className="mt-1 text-xs text-zinc-500">
                Esta configuración
                reemplaza el horario
                semanal solo en la
                fecha indicada.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleCancelForm
              }
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">
                Fecha
              </span>

              <input
                type="date"
                value={
                  form.date
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      date:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-zinc-800">
              Tipo de excepción
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={
                  form.type ===
                  "DAY_OFF"
                }
                onClick={() =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      type:
                        "DAY_OFF",
                    }),
                  )
                }
                className={[
                  "min-h-12 rounded-xl border px-3 text-sm font-medium transition",
                  form.type ===
                  "DAY_OFF"
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                ].join(
                  " ",
                )}
              >
                Día libre
              </button>

              <button
                type="button"
                aria-pressed={
                  form.type ===
                  "SPECIAL_HOURS"
                }
                onClick={() =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      type:
                        "SPECIAL_HOURS",
                    }),
                  )
                }
                className={[
                  "min-h-12 rounded-xl border px-3 text-sm font-medium transition",
                  form.type ===
                  "SPECIAL_HOURS"
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                ].join(
                  " ",
                )}
              >
                Horario especial
              </button>
            </div>
          </div>

          {form.type ===
            "SPECIAL_HOURS" && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label>
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  Desde
                </span>

                <input
                  type="time"
                  value={
                    form.startTime
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        startTime:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-zinc-800">
                  Hasta
                </span>

                <input
                  type="time"
                  value={
                    form.endTime
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        endTime:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />
              </label>
            </div>
          )}

          <div className="mt-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">
                Motivo
              </span>

              <input
                type="text"
                maxLength={300}
                value={
                  form.reason
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      reason:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Ej: feriado, vacaciones, trámite personal"
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              />

              <p className="mt-2 text-xs text-zinc-400">
                Opcional
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={
              saving
            }
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {saving
              ? "Guardando..."
              : editingId !==
                  null
                ? "Guardar cambios"
                : "Agregar excepción"}
          </button>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center">
            <p className="text-sm text-zinc-500">
              Cargando excepciones...
            </p>
          </div>
        ) : exceptions.length ===
          0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-5 py-8 text-center">
            <p className="font-medium text-zinc-900">
              Sin excepciones
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Este profesional usa
              únicamente su horario
              semanal.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map(
              (
                exception,
              ) => (
                <article
                  key={
                    exception.id
                  }
                  className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold capitalize text-zinc-950">
                        {formatDate(
                          exception.date,
                        )}
                      </p>

                      <div className="mt-2">
                        {exception.isDayOff ? (
                          <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                            Día libre
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {exception.startMinute !==
                              null &&
                              minutesToTime(
                                exception.startMinute,
                              )}
                            {" – "}
                            {exception.endMinute !==
                              null &&
                              minutesToTime(
                                exception.endMinute,
                              )}
                          </span>
                        )}
                      </div>

                      {exception.reason && (
                        <p className="mt-3 text-sm leading-6 text-zinc-500">
                          {
                            exception.reason
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          exception,
                        )
                      }
                      className="flex h-10 flex-1 items-center justify-center rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingId ===
                        exception.id
                      }
                      onClick={() =>
                        handleDelete(
                          exception,
                        )
                      }
                      className="flex h-10 flex-1 items-center justify-center rounded-xl border border-red-100 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId ===
                      exception.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}