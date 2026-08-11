import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import axios from 'axios';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

import {
  createSchedule,
  updateSchedule,
  type DayOfWeek,
  type Schedule,
} from '../../services/schedules.service';

import type { Barber } from '../../services/barbers.service';

type ScheduleFormModalProps = {
  open: boolean;
  schedule: Schedule | null;
  barber: Barber | null;
  onClose: () => void;
  onSaved: (schedule: Schedule) => void;
};

const dayOptions: {
  value: DayOfWeek;
  label: string;
}[] = [
  {
    value: 'MONDAY',
    label: 'Lunes',
  },
  {
    value: 'TUESDAY',
    label: 'Martes',
  },
  {
    value: 'WEDNESDAY',
    label: 'Miércoles',
  },
  {
    value: 'THURSDAY',
    label: 'Jueves',
  },
  {
    value: 'FRIDAY',
    label: 'Viernes',
  },
  {
    value: 'SATURDAY',
    label: 'Sábado',
  },
  {
    value: 'SUNDAY',
    label: 'Domingo',
  },
];

export function ScheduleFormModal({
  open,
  schedule,
  barber,
  onClose,
  onSaved,
}: ScheduleFormModalProps) {
  const isEditing =
    schedule !== null;

  const [
    dayOfWeek,
    setDayOfWeek,
  ] = useState<DayOfWeek>(
    'MONDAY',
  );

  const [
    startTime,
    setStartTime,
  ] = useState('09:00');

  const [
    endTime,
    setEndTime,
  ] = useState('18:00');

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    if (schedule) {
      setDayOfWeek(
        schedule.dayOfWeek,
      );

      setStartTime(
        minutesToTime(
          schedule.startMinute,
        ),
      );

      setEndTime(
        minutesToTime(
          schedule.endMinute,
        ),
      );

      setIsActive(
        schedule.isActive,
      );
    } else {
      setDayOfWeek('MONDAY');
      setStartTime('09:00');
      setEndTime('18:00');
      setIsActive(true);
    }

    setError('');
  }, [open, schedule]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!barber) {
      setError(
        'Debes seleccionar un barbero.',
      );

      return;
    }

    const startMinute =
      timeToMinutes(startTime);

    const endMinute =
      timeToMinutes(endTime);

    if (
      startMinute >=
      endMinute
    ) {
      setError(
        'La hora de término debe ser posterior a la hora de inicio.',
      );

      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        barberId: barber.id,
        dayOfWeek,
        startMinute,
        endMinute,
        isActive,
      };

      const savedSchedule =
        isEditing
          ? await updateSchedule(
              schedule.id,
              payload,
            )
          : await createSchedule(
              payload,
            );

      onSaved(savedSchedule);
      onClose();
    } catch (error) {
      console.error(error);

      if (
        axios.isAxiosError(error)
      ) {
        const backendMessage =
          error.response?.data
            ?.message;

        if (
          Array.isArray(
            backendMessage,
          )
        ) {
          setError(
            backendMessage.join(
              ', ',
            ),
          );

          return;
        }

        if (
          typeof backendMessage ===
          'string'
        ) {
          setError(
            backendMessage,
          );

          return;
        }
      }

      setError(
        isEditing
          ? 'No se pudo actualizar el horario.'
          : 'No se pudo crear el horario.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        isEditing
          ? 'Editar horario'
          : 'Nuevo horario'
      }
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <p className="text-sm font-medium text-slate-700">
            Barbero
          </p>

          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
            {barber?.displayName ??
              'Sin barbero seleccionado'}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="schedule-day"
            className="block text-sm font-medium text-slate-700"
          >
            Día
          </label>

          <select
            id="schedule-day"
            value={dayOfWeek}
            onChange={(event) =>
              setDayOfWeek(
                event.target
                  .value as DayOfWeek,
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          >
            {dayOptions.map(
              (day) => (
                <option
                  key={day.value}
                  value={day.value}
                >
                  {day.label}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="schedule-start"
              className="block text-sm font-medium text-slate-700"
            >
              Desde
            </label>

            <input
              id="schedule-start"
              type="time"
              value={startTime}
              onChange={(event) =>
                setStartTime(
                  event.target.value,
                )
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="schedule-end"
              className="block text-sm font-medium text-slate-700"
            >
              Hasta
            </label>

            <input
              id="schedule-end"
              type="time"
              value={endTime}
              onChange={(event) =>
                setEndTime(
                  event.target.value,
                )
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Horario activo
            </p>

            <p className="mt-1 text-xs text-slate-500">
              El barbero podrá recibir
              reservas durante este
              horario.
            </p>
          </div>

          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) =>
              setIsActive(
                event.target.checked,
              )
            }
            className="h-4 w-4"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <Button
            type="submit"
            fullWidth
            disabled={
              loading || !barber
            }
          >
            {loading
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear horario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function timeToMinutes(
  time: string,
) {
  const [hours, minutes] =
    time
      .split(':')
      .map(Number);

  return (
    hours * 60 +
    minutes
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