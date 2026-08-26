export type BarberAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type BarberManageableStatus =
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW";

export type BarberAppointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: BarberAppointmentStatus;
  totalDurationMinutes: number;
  customerNotes: string | null;
  cancellationReason: string | null;
  confirmedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  services: Array<{
    id: number;
    serviceId: number;
    serviceName: string;
    durationMinutes: number;
    displayOrder: number;
  }>;
};

export type BarberDashboardData = {
  generatedAt: string;
  date: string;
  timezone: string;
  policies: {
    barberStartEarlyMinutes: number;
    noShowGraceMinutes: number;
  };
  barber: {
    id: number;
    displayName: string;
    specialty: string | null;
    photoUrl: string | null;
    calendarColor: string | null;
  };
  appointments: BarberAppointment[];
};

export type BarberStatusAction = {
  status: BarberManageableStatus;
  label: string;
  title: string;
  description: string;
  disabled: boolean;
  disabledReason?: string;
  destructive?: boolean;
};
