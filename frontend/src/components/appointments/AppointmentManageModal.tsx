import { useState } from 'react';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

import {
  cancelAppointment,
  rescheduleAppointment,
  type Appointment,
} from '../../services/appointments.service';

type Props = {
  appointment: Appointment | null;
  open: boolean;
  mode: 'cancel' | 'reschedule';
  onClose: () => void;
  onUpdated: (appointment: Appointment) => void;
};

export function AppointmentManageModal({
  appointment,
  open,
  mode,
  onClose,
  onUpdated,
}: Props) {
  const [startAt, setStartAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!appointment) {
    return null;
  }

  const handleCancel = async () => {
    try {
      setLoading(true);
      setError('');

      const updated = await cancelAppointment(
        appointment.id,
      );

      onUpdated(updated);
      onClose();
    } catch {
      setError('No se pudo cancelar la reserva.');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    try {
      setLoading(true);
      setError('');

      const updated = await rescheduleAppointment(
        appointment.id,
        {
          startAt: new Date(startAt).toISOString(),
        },
      );

      onUpdated(updated);
      onClose();
    } catch {
      setError('No se pudo reprogramar la reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        mode === 'cancel'
          ? 'Cancelar reserva'
          : 'Reprogramar reserva'
      }
      onClose={onClose}
    >
      {mode === 'cancel' ? (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">
            ¿Seguro que deseas cancelar la reserva
            #{appointment.id}?
          </p>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="button"
            fullWidth
            disabled={loading}
            onClick={handleCancel}
          >
            {loading
              ? 'Cancelando...'
              : 'Confirmar cancelación'}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Input
            id="startAt"
            label="Nueva fecha y hora"
            type="datetime-local"
            value={startAt}
            onChange={(event) =>
              setStartAt(event.target.value)
            }
            required
          />

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="button"
            fullWidth
            disabled={loading || !startAt}
            onClick={handleReschedule}
          >
            {loading
              ? 'Reprogramando...'
              : 'Guardar nueva fecha'}
          </Button>
        </div>
      )}
    </Modal>
  );
}