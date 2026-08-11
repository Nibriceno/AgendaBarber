import { api } from '../api/axios';

export type Appointment = {
  id: number;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';
  startAt: string;
};

export type Barber = {
  id: number;
  isActive: boolean;
};

export type Service = {
  id: number;
  isActive: boolean;
};

export type AdminDashboardStats = {
  todayAppointments: number;
  pendingAppointments: number;
  activeBarbers: number;
  activeServices: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    appointmentsResponse,
    barbersResponse,
    servicesResponse,
  ] = await Promise.all([
    api.get<Appointment[]>('/appointments'),
    api.get<Barber[]>('/barbers'),
    api.get<Service[]>('/services'),
  ]);

  const appointments =
    appointmentsResponse.data;

  const barbers =
    barbersResponse.data;

  const services =
    servicesResponse.data;

  const today = new Date();

  const todayAppointments =
    appointments.filter((appointment) => {
      const appointmentDate =
        new Date(appointment.startAt);

      return (
        appointmentDate.getFullYear() ===
          today.getFullYear() &&
        appointmentDate.getMonth() ===
          today.getMonth() &&
        appointmentDate.getDate() ===
          today.getDate()
      );
    }).length;

  const pendingAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === 'PENDING',
    ).length;

  const activeBarbers =
    barbers.filter(
      (barber) => barber.isActive,
    ).length;

  const activeServices =
    services.filter(
      (service) => service.isActive,
    ).length;

  return {
    todayAppointments,
    pendingAppointments,
    activeBarbers,
    activeServices,
  };
}