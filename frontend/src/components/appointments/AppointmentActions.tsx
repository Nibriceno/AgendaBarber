import type {
  Appointment,
  AppointmentStatus,
} from '../../services/appointments.service';

type AppointmentActionsProps = {
  appointment: Appointment;

  onStatusChange: (
    appointment: Appointment,
  ) => Promise<void>;

  onCancel: (
    appointment: Appointment,
  ) => void;

  onReschedule: (
    appointment: Appointment,
  ) => void;
};

export function AppointmentActions({
  appointment,
  onStatusChange,
  onCancel,
  onReschedule,
}: AppointmentActionsProps) {
  const getNextStatus = (
    status: AppointmentStatus,
  ): AppointmentStatus | null => {
    switch (status) {
      case 'PENDING':
        return 'CONFIRMED';

      case 'CONFIRMED':
        return 'IN_PROGRESS';

      case 'IN_PROGRESS':
        return 'COMPLETED';

      default:
        return null;
    }
  };

  const nextStatus =
    getNextStatus(appointment.status);

  const labels: Partial<
    Record<AppointmentStatus, string>
  > = {
    CONFIRMED: 'Confirmar',
    IN_PROGRESS: 'Iniciar',
    COMPLETED: 'Completar',
  };

  const canCancel =
    appointment.status !== 'COMPLETED' &&
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'NO_SHOW';

  const canReschedule =
    appointment.status === 'PENDING' ||
    appointment.status === 'CONFIRMED';

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {nextStatus && (
        <button
          type="button"
          onClick={() =>
            onStatusChange({
              ...appointment,
              status: nextStatus,
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {labels[nextStatus]}
        </button>
      )}

      {canReschedule && (
        <button
          type="button"
          onClick={() =>
            onReschedule(appointment)
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reprogramar
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={() =>
            onCancel(appointment)
          }
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}