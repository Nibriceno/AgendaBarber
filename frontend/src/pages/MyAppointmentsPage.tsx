import { useEffect, useState } from 'react';
import { api } from '../api/axios';

type Appointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: string;
  totalPrice: string;

  barber: {
    id: number;
    displayName: string;
  };

  services: {
    id: number;
    serviceName: string;
  }[];
};

export function MyAppointmentsPage() {
  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const response =
          await api.get<Appointment[]>(
            '/appointments/me',
          );

        setAppointments(response.data);
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar las reservas',
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  if (loading) {
    return <p>Cargando reservas...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h1>Mis reservas</h1>

      {appointments.length === 0 ? (
        <p>No tienes reservas.</p>
      ) : (
        appointments.map((appointment) => (
          <div key={appointment.id}>
            <h2>
              Reserva #{appointment.id}
            </h2>

            <p>
              Barbero:{' '}
              {appointment.barber.displayName}
            </p>

            <p>
              Estado: {appointment.status}
            </p>

            <p>
              Fecha:{' '}
              {new Date(
                appointment.startAt,
              ).toLocaleString('es-CL')}
            </p>

            <p>
              Servicios:
            </p>

            <ul>
              {appointment.services.map(
                (service) => (
                  <li key={service.id}>
                    {service.serviceName}
                  </li>
                ),
              )}
            </ul>

            <p>
              Total: $
              {Number(
                appointment.totalPrice,
              ).toLocaleString('es-CL')}
            </p>

            <hr />
          </div>
        ))
      )}
    </div>
  );
}