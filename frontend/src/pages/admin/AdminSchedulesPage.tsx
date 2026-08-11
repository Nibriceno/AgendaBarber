import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ScheduleFormModal } from '../../components/schedules/ScheduleFormModal';

import {
  deleteSchedule,
  getSchedules,
  type DayOfWeek,
  type Schedule,
} from '../../services/schedules.service';

import {
  getBarbers,
  type Barber,
} from '../../services/barbers.service';

const dayLabels: Record<
  DayOfWeek,
  string
> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

const dayOrder: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export function AdminSchedulesPage() {
  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [barbers, setBarbers] =
    useState<Barber[]>([]);

  const [
    selectedBarberId,
    setSelectedBarberId,
  ] = useState('');

  const [
    selectedSchedule,
    setSelectedSchedule,
  ] = useState<Schedule | null>(null);

  const [formOpen, setFormOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          schedulesData,
          barbersData,
        ] = await Promise.all([
          getSchedules(),
          getBarbers(),
        ]);

        setSchedules(
          schedulesData,
        );

        const activeBarbers =
          barbersData.filter(
            (barber) =>
              barber.isActive,
          );

        setBarbers(
          activeBarbers,
        );

        if (
          activeBarbers.length > 0
        ) {
          setSelectedBarberId(
            String(
              activeBarbers[0].id,
            ),
          );
        }
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar los horarios.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedBarber =
    useMemo(() => {
      if (!selectedBarberId) {
        return null;
      }

      return (
        barbers.find(
          (barber) =>
            barber.id ===
            Number(
              selectedBarberId,
            ),
        ) ?? null
      );
    }, [
      barbers,
      selectedBarberId,
    ]);

  const barberSchedules =
    useMemo(() => {
      if (!selectedBarberId) {
        return [];
      }

      return schedules
        .filter(
          (schedule) =>
            schedule.barberId ===
            Number(
              selectedBarberId,
            ),
        )
        .sort(
          (a, b) => {
            const dayDifference =
              dayOrder.indexOf(
                a.dayOfWeek,
              ) -
              dayOrder.indexOf(
                b.dayOfWeek,
              );

            if (
              dayDifference !== 0
            ) {
              return dayDifference;
            }

            return (
              a.startMinute -
              b.startMinute
            );
          },
        );
    }, [
      schedules,
      selectedBarberId,
    ]);

  const handleNew = () => {
    if (!selectedBarber) {
      return;
    }

    setSelectedSchedule(
      null,
    );

    setFormOpen(true);
  };

  const handleEdit = (
    schedule: Schedule,
  ) => {
    setSelectedSchedule(
      schedule,
    );

    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedSchedule(
      null,
    );

    setFormOpen(false);
  };

  const handleSaved = (
    savedSchedule: Schedule,
  ) => {
    setSchedules(
      (current) => {
        const exists =
          current.some(
            (schedule) =>
              schedule.id ===
              savedSchedule.id,
          );

        if (exists) {
          return current.map(
            (schedule) =>
              schedule.id ===
              savedSchedule.id
                ? savedSchedule
                : schedule,
          );
        }

        return [
          ...current,
          savedSchedule,
        ];
      },
    );
  };

  const handleDelete = async (
    schedule: Schedule,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar el horario del ${dayLabels[
          schedule.dayOfWeek
        ].toLowerCase()}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      await deleteSchedule(
        schedule.id,
      );

      setSchedules(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              schedule.id,
          ),
      );
    } catch (error) {
      console.error(error);

      setError(
        'No se pudo eliminar el horario.',
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Horarios
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Configura los días y horas de
            trabajo de cada barbero.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNew}
          disabled={
            !selectedBarber
          }
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nuevo horario
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 max-w-sm">
        <label
          htmlFor="schedule-barber"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Barbero
        </label>

        <select
          id="schedule-barber"
          value={
            selectedBarberId
          }
          onChange={(event) => {
            setSelectedBarberId(
              event.target.value,
            );

            setSelectedSchedule(
              null,
            );

            setFormOpen(false);
          }}
          disabled={
            loading ||
            barbers.length === 0
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          {barbers.length ===
          0 ? (
            <option value="">
              No hay barberos
            </option>
          ) : (
            barbers.map(
              (barber) => (
                <option
                  key={
                    barber.id
                  }
                  value={
                    barber.id
                  }
                >
                  {
                    barber.displayName
                  }
                </option>
              ),
            )
          )}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  Día
                </th>

                <th className="px-6 py-4">
                  Inicio
                </th>

                <th className="px-6 py-4">
                  Término
                </th>

                <th className="px-6 py-4">
                  Estado
                </th>

                <th className="px-6 py-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Cargando horarios...
                  </td>
                </tr>
              ) : !selectedBarberId ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No hay barberos disponibles.
                  </td>
                </tr>
              ) : barberSchedules.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Este barbero todavía no tiene horarios.
                  </td>
                </tr>
              ) : (
                barberSchedules.map(
                  (schedule) => (
                    <tr
                      key={
                        schedule.id
                      }
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-950">
                        {
                          dayLabels[
                            schedule.dayOfWeek
                          ]
                        }
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {minutesToTime(
                          schedule.startMinute,
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {minutesToTime(
                          schedule.endMinute,
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            schedule.isActive
                              ? 'inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'
                              : 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'
                          }
                        >
                          {schedule.isActive
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                schedule,
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                schedule,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ScheduleFormModal
        open={formOpen}
        schedule={
          selectedSchedule
        }
        barber={
          selectedBarber
        }
        onClose={
          handleCloseForm
        }
        onSaved={
          handleSaved
        }
      />
    </DashboardLayout>
  );
}

function minutesToTime(
  minutes: number,
) {
  const hours = Math.floor(
    minutes / 60,
  );

  const mins =
    minutes % 60;

  return `${String(
    hours,
  ).padStart(
    2,
    '0',
  )}:${String(
    mins,
  ).padStart(
    2,
    '0',
  )}`;
}