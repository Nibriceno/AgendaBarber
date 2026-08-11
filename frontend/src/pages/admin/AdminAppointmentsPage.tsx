import {
  useEffect,
  useState,
} from 'react';

import { DashboardLayout } from '../../layouts/DashboardLayout';

import {
  getAppointments,
  updateAppointment,
  type Appointment,
  type AppointmentStatus,
} from '../../services/appointments.service';

import { AppointmentActions } from '../../components/appointments/AppointmentActions';
import { AppointmentManageModal } from '../../components/appointments/AppointmentManageModal';

export function AdminAppointmentsPage() {
  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] = useState<Appointment | null>(null);

  const [
    modalMode,
    setModalMode,
  ] = useState<
    'cancel' | 'reschedule' | null
  >(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const data =
          await getAppointments();

        setAppointments(data);
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar las reservas.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const handleStatusChange = async (
    updatedAppointment: Appointment,
  ) => {
    try {
      setError('');

      const appointment =
        await updateAppointment(
          updatedAppointment.id,
          {
            status:
              updatedAppointment.status,
          },
        );

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? appointment
            : item,
        ),
      );
    } catch (error) {
      console.error(error);

      setError(
        'No se pudo actualizar la reserva.',
      );
    }
  };

  const handleOpenCancel = (
    appointment: Appointment,
  ) => {
    setSelectedAppointment(appointment);
    setModalMode('cancel');
  };

  const handleOpenReschedule = (
    appointment: Appointment,
  ) => {
    setSelectedAppointment(appointment);
    setModalMode('reschedule');
  };

  const handleCloseModal = () => {
    setSelectedAppointment(null);
    setModalMode(null);
  };

  const handleAppointmentUpdated = (
    updatedAppointment: Appointment,
  ) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id ===
        updatedAppointment.id
          ? updatedAppointment
          : appointment,
      ),
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">
          Administración
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Reservas
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Gestiona las reservas de la barbería.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  Cliente
                </th>

                <th className="px-6 py-4">
                  Barbero
                </th>

                <th className="px-6 py-4">
                  Servicio
                </th>

                <th className="px-6 py-4">
                  Fecha
                </th>

                <th className="px-6 py-4">
                  Estado
                </th>

                <th className="px-6 py-4 text-right">
                  Total
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
                    colSpan={7}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Cargando reservas...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No hay reservas.
                  </td>
                </tr>
              ) : (
                appointments.map(
                  (appointment) => (
                    <tr
                      key={appointment.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-950">
                          {
                            appointment.customer
                              .firstName
                          }{' '}
                          {
                            appointment.customer
                              .lastName
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {appointment.customer
                            .email ??
                            appointment.customer
                              .phone}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {
                          appointment.barber
                            .displayName
                        }
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {appointment.services
                          .map(
                            (service) =>
                              service.serviceName,
                          )
                          .join(', ')}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {new Date(
                          appointment.startAt,
                        ).toLocaleString(
                          'es-CL',
                          {
                            dateStyle:
                              'medium',
                            timeStyle:
                              'short',
                          },
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge
                          status={
                            appointment.status
                          }
                        />
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-slate-950">
                        $
                        {Number(
                          appointment.totalPrice,
                        ).toLocaleString(
                          'es-CL',
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <AppointmentActions
                          appointment={
                            appointment
                          }
                          onStatusChange={
                            handleStatusChange
                          }
                          onCancel={
                            handleOpenCancel
                          }
                          onReschedule={
                            handleOpenReschedule
                          }
                        />
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAppointment &&
        modalMode && (
          <AppointmentManageModal
            appointment={
              selectedAppointment
            }
            open={true}
            mode={modalMode}
            onClose={
              handleCloseModal
            }
            onUpdated={
              handleAppointmentUpdated
            }
          />
        )}
    </DashboardLayout>
  );
}

function StatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const labels: Record<
    AppointmentStatus,
    string
  > = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No asistió',
  };

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {labels[status]}
    </span>
  );
}