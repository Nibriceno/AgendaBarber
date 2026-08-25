export type DashboardAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type DashboardAppointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: DashboardAppointmentStatus;
  totalPrice: string;
  customerName: string;
  barber: {
    id: number;
    displayName: string;
    calendarColor: string | null;
  };
  services: string[];
};

export type AdminDashboardSummary = {
  generatedAt: string;
  timezone: string;
  currency: string;
  periods: {
    today: string;
    month: string;
    lastThirtyDaysStart: string;
  };
  today: {
    totalAppointments: number;
    activeAppointments: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: string;
    appointments: DashboardAppointment[];
  };
  month: {
    revenue: string;
    completedAppointments: number;
  };
  clients: {
    total: number;
    newThisMonth: number;
  };
  topServices: Array<{
    serviceId: number;
    name: string;
    bookings: number;
    revenue: string;
  }>;
  teamPerformance: Array<{
    barberId: number;
    displayName: string;
    calendarColor: string | null;
    completedAppointments: number;
    revenue: string;
    averageTicket: string;
  }>;
};
